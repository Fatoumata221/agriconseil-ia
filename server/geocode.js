// Recherche d'une localité dans la liste du profil (places.js). Le géocodage Open-Meteo, pour tous
// les autres villages, est appelé depuis le navigateur (voir shared/openMeteo.js).
import { PLACES } from "./places.js";

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Localités de la liste dont le nom contient le texte tapé (sans tenir compte des accents ni des tirets).
export function searchLocal(query, places = PLACES) {
  const q = normalize(query);
  const found = [];
  for (const [region, list] of Object.entries(places)) {
    for (const p of list) if (normalize(p.name).includes(q)) found.push({ name: p.name, region, detail: "", lat: p.lat, lon: p.lon });
  }
  return found;
}
