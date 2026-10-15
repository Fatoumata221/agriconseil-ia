// Recherche d'une localité du Sénégal par son nom : d'abord dans la liste du profil (places.js),
// puis avec le géocodage Open-Meteo (gratuit, sans clé) pour tous les autres villages.
import { PLACES } from "./places.js";

const CACHE_MAX = 200;
const cache = new Map();

// Garde les lieux du Sénégal et les met au format du profil.
export function toPlaces(results = []) {
  const seen = new Set();
  return results
    .filter((r) => r.country_code === "SN" && Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
    .map((r) => ({
      name: r.name,
      region: r.admin1 ?? "",
      detail: [r.admin2, r.admin3].filter(Boolean).join(", "),
      lat: Math.round(r.latitude * 1e4) / 1e4,
      lon: Math.round(r.longitude * 1e4) / 1e4,
    }))
    .filter((p) => {
      const key = `${p.name}|${p.lat}|${p.lon}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

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

// Résultats de la liste d'abord, puis ceux du géocodage qui ne sont pas déjà proposés (à ~2 km près).
export async function searchPlaces(query) {
  const local = searchLocal(query);
  let remote = [];
  try {
    remote = await searchRemote(query);
  } catch (err) {
    if (!local.length) throw err;
  }
  const near = (a, b) => Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lon - b.lon) < 0.02;
  return [...local, ...remote.filter((r) => !local.some((l) => near(l, r)))].slice(0, 12);
}

async function searchRemote(query) {
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "10", language: "fr", countryCode: "SN", format: "json" });
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Géocodage indisponible (${res.status})`);
  const places = toPlaces((await res.json()).results);

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, places);
  return places;
}
