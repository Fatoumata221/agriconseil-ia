// Appels à Groq (offre gratuite) : chat Llama en streaming et transcription Whisper.
// API compatible OpenAI : https://console.groq.com/docs
const BASE_URL = "https://api.groq.com/openai/v1";
export const CHAT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
export const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

export const MISSING_KEY_MESSAGE =
  "Clé Groq manquante. Créez une clé gratuite sur https://console.groq.com/keys, " +
  "puis collez-la dans le fichier .env (ligne GROQ_API_KEY=...). Le serveur redémarre tout seul.";

export class GroqError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function hasGroqKey() {
  const key = process.env.GROQ_API_KEY?.trim();
  return Boolean(key) && key !== "gsk_..." && !key.includes("...");
}

async function groqFetch(path, init) {
  if (!hasGroqKey()) throw new GroqError(MISSING_KEY_MESSAGE, 503);
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}`, ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (res.ok) return res;

  const body = await res.text();
  console.error(`[groq] ${res.status} ${body.slice(0, 500)}`);
  if (res.status === 401) throw new GroqError("Clé Groq invalide : vérifiez GROQ_API_KEY dans .env.", 502);
  if (res.status === 429) throw new GroqError("Limite gratuite de Groq atteinte, réessayez dans un instant.", 429);
  if (res.status === 413) throw new GroqError("Fichier trop volumineux pour Groq.", 413);
  throw new GroqError(`Erreur du service Groq (${res.status}).`, 502);
}

// Génère la réponse en streaming ; `onText` reçoit chaque morceau de texte.
export async function chatStream(messages, onText, { maxTokens = 1200, temperature = 0.4 } = {}) {
  const res = await groqFetch("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: CHAT_MODEL, messages, stream: true, max_tokens: maxTokens, temperature }),
  });

  // Flux SSE : lignes "data: {...}" terminées par "data: [DONE]".
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let finishReason = null;
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      const choice = JSON.parse(data).choices?.[0];
      const text = choice?.delta?.content;
      if (text) {
        full += text;
        onText(text);
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
    }
  }
  return { text: full, finishReason };
}

export async function chatOnce(messages, options) {
  return (await chatStream(messages, () => {}, options)).text.trim();
}

export async function transcribe(buffer, mediaType) {
  const ext = mediaType.includes("ogg") ? "ogg" : mediaType.includes("mp4") ? "m4a" : mediaType.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mediaType }), `question.${ext}`);
  form.append("model", WHISPER_MODEL);
  form.append("language", "fr");
  form.append("response_format", "json");
  const res = await groqFetch("/audio/transcriptions", { method: "POST", body: form });
  return (await res.json()).text?.trim() ?? "";
}
