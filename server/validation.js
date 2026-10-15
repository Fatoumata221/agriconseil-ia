// Validation des entrées envoyées par le navigateur.
import { CROPS } from "./crops.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_MESSAGES = 20;

export class ValidationError extends Error {}

// Type réel de l'image d'après ses premiers octets (on ne se fie pas au type annoncé).
export function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function validateImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) throw new ValidationError("Aucune image reçue.");
  if (buf.length > MAX_IMAGE_BYTES) throw new ValidationError("Image trop lourde (5 Mo maximum).");
  const type = detectImageType(buf);
  if (!type) throw new ValidationError("Format d'image non pris en charge (JPEG, PNG ou WebP).");
  return type;
}

const AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"];
export function validateAudio(buf, contentType = "") {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (!AUDIO_TYPES.includes(type)) throw new ValidationError("Format audio non pris en charge.");
  if (!Buffer.isBuffer(buf) || buf.length < 1000) throw new ValidationError("Enregistrement vide ou trop court.");
  if (buf.length > MAX_AUDIO_BYTES) throw new ValidationError("Enregistrement trop long (10 Mo maximum).");
  return type;
}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new ValidationError("Aucune question reçue.");
  if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
  const clean = messages.map((m) => {
    if (m?.role !== "user" && m?.role !== "assistant") throw new ValidationError("Rôle de message invalide.");
    if (typeof m.text !== "string" || !m.text.trim()) throw new ValidationError("Message vide.");
    if (m.text.length > MAX_MESSAGE_CHARS) throw new ValidationError(`Message trop long (${MAX_MESSAGE_CHARS} caractères maximum).`);
    return { role: m.role, content: m.text.trim() };
  });
  if (clean.at(-1).role !== "user") throw new ValidationError("Le dernier message doit être une question.");
  return clean;
}

// Profil : localité (nom + coordonnées) et cultures. Tout champ invalide est ignoré.
export function sanitizeProfile(profile) {
  const out = { place: null, crops: [] };
  if (!profile || typeof profile !== "object") return out;
  const { place, crops } = profile;
  if (place && Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    out.place = {
      name: typeof place.name === "string" ? place.name.slice(0, 80) : "Position GPS",
      region: typeof place.region === "string" ? place.region.slice(0, 40) : "",
      lat: Math.max(-90, Math.min(90, place.lat)),
      lon: Math.max(-180, Math.min(180, place.lon)),
    };
  }
  if (Array.isArray(crops)) out.crops = [...new Set(crops.filter((c) => typeof c === "string" && c in CROPS))];
  return out;
}

export function parseCoords(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
    throw new ValidationError("Coordonnées invalides.");
  }
  return [la, lo];
}

// Texte tapé dans la recherche de localité : 2 à 60 caractères.
export function parsePlaceQuery(q) {
  const text = typeof q === "string" ? q.trim() : "";
  if (text.length < 2 || text.length > 60) throw new ValidationError("Tapez entre 2 et 60 caractères.");
  return text;
}

const CLIENT_ID = /^[a-zA-Z0-9-]{8,64}$/;
export function validateClientId(id) {
  if (typeof id !== "string" || !CLIENT_ID.test(id)) throw new ValidationError("Identifiant client manquant.");
  return id;
}
