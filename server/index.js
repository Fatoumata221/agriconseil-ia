import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const PORT = Number(process.env.PORT) || 3001;
// Haiku n'a pas de repli serveur en cas de refus ; les autres modèles récents oui.
const SUPPORTS_FALLBACK = !MODEL.includes("haiku");
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const SYSTEM_PROMPT = `Tu es AgriConseil, un assistant agricole pour les producteurs d'Afrique de l'Ouest (Sénégal en particulier).

Tu réponds en français simple et concret, adapté à des agriculteurs, maraîchers et éleveurs.
- Questions générales : cultures, calendrier cultural, sols, irrigation, fertilisation, ravageurs, maladies, stockage, petit élevage.
- Photo d'une plante : identifie l'espèce probable, puis l'état de santé (sain, carence, maladie, ravageur). Donne ton niveau de confiance (élevé / moyen / faible), les signes visibles qui t'y amènent, et des actions concrètes, en privilégiant les solutions peu coûteuses et disponibles localement.
- Si la photo est floue ou insuffisante, dis-le et demande une meilleure photo (feuille de près, dessus et dessous, plante entière).
- Pour les produits phytosanitaires, rappelle les précautions (dose, équipement de protection, délai avant récolte) et conseille de confirmer auprès d'un technicien agricole (ANCAR, ISRA, service départemental).
- Reste dans le domaine agricole ; pour une question de santé humaine, oriente poliment vers un professionnel de santé.
Sois bref : quelques paragraphes courts ou une liste, pas de longs exposés.`;

const client = new Anthropic();
const app = express();
app.use(express.json({ limit: "15mb" }));

// Convertit l'historique envoyé par le front en messages pour l'API.
function toApiMessages(history) {
  if (!Array.isArray(history) || history.length === 0) throw new Error("Historique vide");
  return history.map(({ role, text, image }) => {
    if (role !== "user" && role !== "assistant") throw new Error("Rôle invalide");
    const content = [];
    if (image && role === "user") {
      if (!ALLOWED_IMAGE_TYPES.has(image.mediaType)) throw new Error("Format d'image non pris en charge");
      content.push({
        type: "image",
        source: { type: "base64", media_type: image.mediaType, data: image.data },
      });
    }
    content.push({ type: "text", text: text?.trim() || "Analyse cette plante." });
    return { role, content };
  });
}

app.post("/api/chat", async (req, res) => {
  let messages;
  try {
    messages = toApiMessages(req.body?.messages);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const params = {
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low" },
    messages,
  };
  if (SUPPORTS_FALLBACK) {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }

  try {
    const stream = client.beta.messages.stream(params);
    let started = false;

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        if (!started) {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          started = true;
        }
        res.write(event.delta.text);
      }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      const note = "\n\n_(Je ne peux pas répondre à cette demande.)_";
      if (!started) return res.status(200).type("text/plain").send(note.trim());
      res.write(note);
    } else if (final.stop_reason === "max_tokens") {
      res.write("\n\n_(Réponse tronquée.)_");
    }
    res.end();
  } catch (err) {
    console.error(err);
    if (res.headersSent) return res.end("\n\n_(Erreur pendant la génération.)_");

    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "Clé API invalide ou manquante (ANTHROPIC_API_KEY)." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Trop de requêtes, réessayez dans un instant." });
    }
    if (err instanceof Anthropic.BadRequestError) {
      return res.status(400).json({ error: `Requête refusée par l'API : ${err.message}` });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Erreur API (${err.status}).` });
    }
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-ant-...") {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY manquante : copiez .env.example en .env et ajoutez votre clé." });
    }
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// En production, sert le front compilé (npm run build).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
app.use(express.static(dist));

app.listen(PORT, () => {
  console.log(`API prête sur http://localhost:${PORT} (modèle : ${MODEL})`);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "sk-ant-...") {
    console.warn("⚠️  ANTHROPIC_API_KEY non renseignée : collez votre clé dans le fichier .env (le serveur redémarre tout seul).");
  }
});
