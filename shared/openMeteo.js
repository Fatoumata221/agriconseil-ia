// Appels à Open-Meteo (gratuit, sans clé), faits directement depuis le navigateur : chaque utilisateur
// utilise sa propre connexion. Depuis un hébergeur gratuit, l'adresse IP partagée dépasse vite le quota.
// Ce module ne contient que des fonctions pures, partagées par le navigateur et les tests.

export function forecastUrl(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
    past_days: "3",
    forecast_days: "7",
    timezone: "auto",
  });
  return url.toString();
}

// Réponse Open-Meteo → 3 jours passés + aujourd'hui + 6 jours à venir.
export function parseForecast(json) {
  const d = json?.daily;
  if (!d?.time?.length) throw new Error("Réponse météo inattendue.");
  const days = d.time.map((date, i) => ({
    date,
    tmax: d.temperature_2m_max[i],
    tmin: d.temperature_2m_min[i],
    rain: d.precipitation_sum[i] ?? 0,
    rainProb: d.precipitation_probability_max?.[i] ?? null,
    windMax: d.wind_speed_10m_max[i],
  }));
  return { days, todayIndex: 3, timezone: json.timezone ?? "" };
}

export function geocodeUrl(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "10", language: "fr", countryCode: "SN", format: "json" });
  return url.toString();
}

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

// Résultats de la liste d'abord, puis ceux du géocodage qui ne sont pas déjà proposés (à ~2 km près).
export function mergePlaces(local, remote) {
  const near = (a, b) => Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lon - b.lon) < 0.02;
  return [...local, ...remote.filter((r) => !local.some((l) => near(l, r)))].slice(0, 12);
}
