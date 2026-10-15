// Météo et conseils du profil, partagés par l'onglet Météo et la carte « Aujourd'hui ».
// La dernière réponse est gardée dans le navigateur pour l'affichage hors connexion.
import { useEffect, useState } from "react";
import { apiJson, load, save } from "./api.js";

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
    apiJson(`/api/weather?${query}`)
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
