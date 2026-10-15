// Conseils du jour à partir des prévisions Open-Meteo envoyées par le navigateur (voir shared/openMeteo.js).
import { indicators, recommend } from "./rules.js";

export function adviceFromForecast({ days, todayIndex, timezone }, crops, now = new Date()) {
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
