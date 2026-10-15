// Météo et conseils du profil, partagés par l'onglet Météo et la carte « Aujourd'hui ».
// Le navigateur interroge Open-Meteo lui-même, puis le serveur applique les règles de conseil.
// La dernière réponse est gardée dans le navigateur pour l'affichage hors connexion.
import { useEffect, useState } from "react";
import { forecastUrl, parseForecast } from "../../shared/openMeteo.js";
import { apiJson, load, save } from "./api.js";

async function fetchForecast(place) {
  let res;
  try {
    res = await fetch(forecastUrl(place.lat, place.lon));
  } catch {
    throw new Error("Service météo injoignable : vérifiez la connexion.");
  }
  if (!res.ok) {
    const reason = await res.json().then((j) => j.reason, () => "");
    throw new Error(`Météo indisponible (Open-Meteo ${res.status}${reason ? ` : ${reason}` : ""}).`);
  }
  return parseForecast(await res.json());
}

export function useWeather(profile) {
  const [data, setData] = useState(() => load("lastWeather", null));
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const place = profile.place;
  const query = place ? `lat=${place.lat}&lon=${place.lon}&crops=${profile.crops.join(",")}` : null;

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchForecast(place)
      .then((forecast) => apiJson("/api/advice", { method: "POST", body: { ...forecast, crops: profile.crops } }))
      .then((weather) => {
        if (cancelled) return;
        const entry = { ...weather, place: place.name, query, fetchedAt: new Date().toISOString() };
        setData(entry);
        setOffline(false);
        save("lastWeather", entry);
      })
      .catch((err) => !cancelled && (setOffline(true), setError(err.message)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, place?.name]);

  return { data, offline, loading, error, stale: Boolean(data && data.query !== query), query };
}
