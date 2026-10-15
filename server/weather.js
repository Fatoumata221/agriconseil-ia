// Prévisions Open-Meteo (gratuit, sans clé) + recommandations par culture.
import { indicators, recommend } from "./rules.js";

const CACHE_MS = 30 * 60 * 1000;

// Panne du service météo : message clair pour l'utilisateur, avec la cause renvoyée par Open-Meteo.
export class WeatherError extends Error {
  status = 502;
}
const cache = new Map();

export async function fetchForecast(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
    past_days: "3",
    forecast_days: "7",
    timezone: "auto",
  });
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    console.error("[meteo]", err);
    throw new WeatherError("Service météo injoignable, réessayez dans un instant.");
  }
  if (!res.ok) {
    const reason = await res.json().then((j) => j.reason, () => "");
    console.error(`[meteo] Open-Meteo ${res.status} ${reason}`);
    throw new WeatherError(`Météo indisponible (Open-Meteo ${res.status}${reason ? ` : ${reason}` : ""}).`);
  }
  const json = await res.json();
  const d = json.daily;
  const days = d.time.map((date, i) => ({
    date,
    tmax: d.temperature_2m_max[i],
    tmin: d.temperature_2m_min[i],
    rain: d.precipitation_sum[i] ?? 0,
    rainProb: d.precipitation_probability_max[i],
    windMax: d.wind_speed_10m_max[i],
  }));
  const data = { days, todayIndex: 3, timezone: json.timezone };
  cache.set(key, { at: Date.now(), data });
  return data;
}

export async function weatherWithAdvice(lat, lon, crops, now = new Date()) {
  const { days, todayIndex, timezone } = await fetchForecast(lat, lon);
  const ind = indicators(days, todayIndex);
  return {
    timezone,
    today: days[todayIndex].date,
    past: days.slice(0, todayIndex),
    forecast: days.slice(todayIndex),
    indicateurs: ind,
    recommandations: crops.map((c) => recommend(c, ind, now)),
  };
}
