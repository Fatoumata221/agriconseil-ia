import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { CROPS } from "./crops.js";
import { openDb } from "./db.js";
import { CONFIDENCE_THRESHOLD, diagnoseImage, MODEL_ID } from "./diagnose.js";
import { CHAT_MODEL, chatOnce, chatStream, GroqError, hasGroqKey, transcribe } from "./groq.js";
import { searchPlaces } from "./geocode.js";
import { PLACES } from "./places.js";
import { createDocsSearch } from "./rag.js";
import { SEUILS } from "./rules.js";
import {
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  parseCoords,
  parsePlaceQuery,
  sanitizeProfile,
  validateAudio,
  validateClientId,
  validateImage,
  validateMessages,
  ValidationError,
} from "./validation.js";
import { weatherWithAdvice } from "./weather.js";

const PORT = Number(process.env.PORT) || 3001;

const SYSTEM_PROMPT = `Tu es AgriConseil, un assistant agricole pour les producteurs d'Afrique de l'Ouest (Sénégal en particulier).

Tu réponds toujours en français simple et concret, en vouvoyant, adapté à des agriculteurs, maraîchers et éleveurs. N'écris jamais en wolof.

Repères généraux sur le Sénégal, à respecter :
- Il n'y a qu'une saison des pluies, l'hivernage, de juin-juillet à octobre (elle commence plus tôt et dure plus longtemps au sud, plus tard et moins longtemps au nord). Il n'y a pas de « petite saison des pluies ».
- Les cultures pluviales (arachide, mil, sorgho, maïs, niébé) se sèment au début de l'hivernage, après une pluie suffisante pour humidifier le sol, jamais en saison sèche.
- Le maraîchage irrigué (oignon, tomate, chou…) se fait surtout en contre-saison sèche, de novembre à mai.

Règles de réponse :
- Sujets : cultures, calendrier cultural, sols, irrigation, fertilisation, ravageurs, maladies, stockage, petit élevage.
- Privilégie les solutions peu coûteuses et disponibles localement.
- Pour les produits phytosanitaires, rappelle les précautions (dose, équipement de protection, délai avant récolte) et conseille de confirmer auprès d'un technicien agricole (ANCAR, ISRA, service départemental).
- Si tu n'es pas sûr, dis-le. N'invente jamais de chiffres officiels ni de recommandations attribuées à un organisme. Ne donne pas de doses précises d'engrais ou de pesticides (sauf si elles figurent dans les extraits de fiches fournis) : indique le principe et renvoie à l'étiquette ou à un technicien.
- Reste dans le domaine agricole ; pour une question de santé humaine, oriente poliment vers un professionnel de santé.
Sois bref : quelques paragraphes courts ou une liste à puces, sans tableau ni titre, et pas de longs exposés.`;

function profileContext(profile) {
  const lines = [];
  if (profile.place) {
    const { name, region, lat, lon } = profile.place;
    lines.push(`Localité de l'utilisateur : ${name}${region ? `, région de ${region}` : ""} (lat ${lat.toFixed(2)}, lon ${lon.toFixed(2)}).`);
  }
  if (profile.crops.length) lines.push(`Cultures pratiquées : ${profile.crops.map((c) => CROPS[c].name).join(", ")}.`);
  return lines.length ? `\n\nProfil de l'utilisateur (à prendre en compte si utile) :\n${lines.join("\n")}` : "";
}

function docsContext(passages) {
  if (!passages.length) return "";
  const blocks = passages.map((p, i) => `[${i + 1}] Source : ${p.source}\n${p.text}`).join("\n\n");
  return `\n\nExtraits de fiches techniques fournies par l'utilisateur. Appuie-toi dessus en priorité s'ils répondent à la question, et cite la source entre crochets, par exemple [1] ou [source : ${passages[0].source}]. S'ils ne répondent pas, ne les cite pas.\n\n${blocks}`;
}

const db = openDb();
const docs = createDocsSearch();
const app = express();
// Derrière l'hébergeur (Render, Vercel…), l'adresse IP réelle est dans X-Forwarded-For.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Limites par adresse IP : générale sur /api, plus stricte pour les appels coûteux (IA, modèle photo).
const limitMessage = { error: "Trop de requêtes depuis votre connexion, réessayez dans une minute." };
app.use("/api", rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false, message: limitMessage }));
const aiLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false, message: limitMessage });

const json = express.json({ limit: "100kb" });
const clientId = (req) => validateClientId(req.get("X-Client-Id"));

app.get("/api/status", (req, res) => {
  res.json({
    groq: hasGroqKey(),
    chatModel: CHAT_MODEL,
    photoModel: MODEL_ID,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    docs: docs.files(),
    crops: Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, { name: c.name, mode: c.mode, covered: Boolean(c.modelPlant) }])),
    places: PLACES,
    seuils: SEUILS,
  });
});

// Chat en streaming (texte brut). Les sources RAG sont dans l'en-tête X-Sources.
app.post("/api/chat", aiLimit, json, async (req, res, next) => {
  try {
    const id = clientId(req);
    const messages = validateMessages(req.body?.messages);
    const profile = sanitizeProfile(req.body?.profile);
    const question = messages.at(-1).content;
    const passages = docs.search(question);
    const system = SYSTEM_PROMPT + profileContext(profile) + docsContext(passages);

    let started = false;
    const { text, finishReason } = await chatStream([{ role: "system", content: system }, ...messages], (chunk) => {
      if (!started) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Sources", encodeURIComponent(JSON.stringify(passages.map((p) => p.source))));
        started = true;
      }
      res.write(chunk);
    });
    if (!started) return res.status(502).json({ error: "Réponse vide du modèle, réessayez." });
    if (finishReason === "length") res.write("\n\n_(Réponse tronquée.)_");
    res.end();
    db.add(id, "question", question, text);
  } catch (err) {
    next(err);
  }
});

app.post(
  "/api/transcribe",
  aiLimit,
  express.raw({ type: "audio/*", limit: MAX_AUDIO_BYTES }),
  async (req, res, next) => {
    try {
      const type = validateAudio(req.body, req.get("Content-Type"));
      res.json({ text: await transcribe(req.body, type) });
    } catch (err) {
      next(err);
    }
  },
);

app.post(
  "/api/diagnose",
  aiLimit,
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_IMAGE_BYTES }),
  async (req, res, next) => {
    try {
      const id = clientId(req);
      const type = validateImage(req.body);
      const result = await diagnoseImage(req.body, type);
      const best = result.top[0];
      const title = result.confident
        ? `${best.plant} : ${best.condition} (${Math.round(best.score * 100)} %)`
        : "Diagnostic incertain";
      const content = result.top.map((t) => `${t.plant} – ${t.condition} : ${Math.round(t.score * 100)} %`).join("\n");
      db.add(id, "diagnostic", title, content);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Explication courte par l'IA d'un résultat déjà calculé (diagnostic photo ou recommandation météo).
app.post("/api/explain", aiLimit, json, async (req, res, next) => {
  try {
    const { kind, data } = req.body ?? {};
    const profile = sanitizeProfile(req.body?.profile);
    let prompt;
    if (kind === "diagnostic" && Array.isArray(data?.top)) {
      const top = data.top.slice(0, 3).map((t) => `${String(t.plant).slice(0, 40)} – ${String(t.condition).slice(0, 80)} : ${Math.round(Number(t.score) * 100)} %`);
      prompt =
        `Un modèle de reconnaissance d'images (entraîné sur PlantVillage) a donné ce résultat pour une photo de feuille :\n${top.join("\n")}\n` +
        (data.confident ? "" : "La confiance est faible : le diagnostic n'est pas fiable.\n") +
        "Explique ce résultat à un agriculteur en 4 phrases maximum : ce que c'est, comment confirmer à l'œil, et une première mesure simple. " +
        "Ne présente pas le résultat comme certain et conseille de confirmer avec un technicien (ANCAR, ISRA).";
    } else if (kind === "meteo" && data && typeof data.action === "string" && Array.isArray(data.raisons)) {
      prompt =
        `Des règles simples ont donné cette recommandation pour la culture « ${String(data.nom).slice(0, 40)} » : ${String(data.action).slice(0, 20)}.\n` +
        `Raisons calculées : ${data.raisons.map((r) => String(r).slice(0, 200)).join(" ")}\n` +
        "Explique cette recommandation à un agriculteur en UNE seule phrase courte. Ne change pas la recommandation et n'ajoute aucun chiffre.";
    } else {
      throw new ValidationError("Demande d'explication invalide.");
    }
    const text = await chatOnce(
      [{ role: "system", content: SYSTEM_PROMPT + profileContext(profile) }, { role: "user", content: prompt }],
      { maxTokens: 800, temperature: 0.3 },
    );
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

app.get("/api/weather", async (req, res, next) => {
  try {
    const [lat, lon] = parseCoords(req.query.lat, req.query.lon);
    const crops = String(req.query.crops || "").split(",").filter((c) => c in CROPS).slice(0, 10);
    res.json(await weatherWithAdvice(lat, lon, crops));
  } catch (err) {
    next(err);
  }
});

// Recherche d'un village ou d'une ville du Sénégal pour le profil.
app.get("/api/places", async (req, res, next) => {
  try {
    res.json(await searchPlaces(parsePlaceQuery(req.query.q)));
  } catch (err) {
    next(err);
  }
});

app.get("/api/history", (req, res, next) => {
  try {
    const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page, 10) || 1));
    res.json(db.list(clientId(req), { page, limit: 10 }));
  } catch (err) {
    next(err);
  }
});

app.delete("/api/history", (req, res, next) => {
  try {
    db.clear(clientId(req));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.use("/api", (req, res) => res.status(404).json({ error: "Route inconnue." }));

// Gestion centralisée des erreurs : messages clairs, jamais de détail interne ni de clé.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    console.error("[api]", err);
    return res.end("\n\n_(Erreur pendant la génération.)_");
  }
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err instanceof GroqError) return res.status(err.status).json({ error: err.message });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Fichier trop volumineux." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Requête mal formée." });
  console.error("[api]", err);
  res.status(500).json({ error: "Erreur serveur, réessayez." });
});

// En production, sert le front compilé (npm run build).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, () => {
  console.log(`API prête sur http://localhost:${PORT} (chat : ${CHAT_MODEL}, photo : modèle local)`);
  if (!hasGroqKey()) {
    console.warn("⚠️  GROQ_API_KEY non renseignée : le chat, le micro et les explications sont désactivés.");
    console.warn("    Créez une clé gratuite sur https://console.groq.com/keys et collez-la dans .env.");
  }
});
