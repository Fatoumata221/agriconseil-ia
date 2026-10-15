import { useEffect, useState } from "react";
import { apiJson, load, save } from "../lib/api.jsx";

const dayName = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });

export default function Meteo({ status, profile, onEditProfile }) {
  const [data, setData] = useState(() => load("lastWeather", null));
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [explanations, setExplanations] = useState({});

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
        save("lastWeather", entry); // gardée pour l'affichage hors connexion
      })
      .catch((err) => !cancelled && (setOffline(true), setError(err.message)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, place?.name]);

  async function explain(reco) {
    setExplanations((e) => ({ ...e, [reco.culture]: "…" }));
    try {
      const { text } = await apiJson("/api/explain", { method: "POST", body: { kind: "meteo", data: reco, profile } });
      setExplanations((e) => ({ ...e, [reco.culture]: text }));
    } catch (err) {
      setExplanations((e) => ({ ...e, [reco.culture]: `⚠️ ${err.message}` }));
    }
  }

  if (!place) {
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-stone-600">Choisissez votre localité pour voir la météo et les conseils.</p>
        <button onClick={onEditProfile} className="rounded-xl bg-green-700 px-4 py-2 font-medium text-white">
          Compléter mon profil
        </button>
      </div>
    );
  }

  const stale = data && data.query !== query;
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-stone-800">Météo à {place.name} – 7 jours</h2>
        {loading && <span className="text-xs text-stone-500">Mise à jour…</span>}
      </div>

      {offline && data && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Hors connexion : dernières prévisions enregistrées le {new Date(data.fetchedAt).toLocaleString("fr-FR")}
          {stale ? ` (pour ${data.place})` : ""}.
        </p>
      )}
      {error && !data && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {data.forecast.map((d) => (
              <div key={d.date} className="min-w-[4.5rem] rounded-xl border border-stone-200 bg-white p-2 text-center text-xs">
                <p className="font-medium capitalize text-stone-700">{dayName(d.date)}</p>
                <p className="mt-1 text-base">{d.rain >= 1 ? "🌧️" : d.tmax >= 35 ? "☀️" : "⛅"}</p>
                <p className="tabular-nums">
                  <span className="font-semibold">{Math.round(d.tmax)}°</span> / {Math.round(d.tmin)}°
                </p>
                <p className="tabular-nums text-sky-700">{d.rain.toFixed(1).replace(".", ",")} mm</p>
                <p className="tabular-nums text-stone-500">{Math.round(d.windMax)} km/h</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-stone-500">
            Pluie des 3 derniers jours : {String(data.indicateurs.pluie3jPasses).replace(".", ",")} mm · prévue sur 7 jours : {String(data.indicateurs.pluie7jPrevus).replace(".", ",")} mm
          </p>

          <h2 className="pt-2 font-semibold text-stone-800">Conseils du jour par culture</h2>
          {data.recommandations.length === 0 && (
            <p className="text-sm text-stone-600">
              Ajoutez vos cultures dans le{" "}
              <button onClick={onEditProfile} className="underline">
                profil
              </button>{" "}
              pour recevoir des conseils.
            </p>
          )}
          <ul className="space-y-2">
            {data.recommandations.map((r) => (
              <li key={r.culture} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.nom}</span>
                  <span className="rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-900">
                    {r.emoji} {r.label}
                  </span>
                </div>
                <ul className="mt-1 list-disc pl-5 text-sm text-stone-600">
                  {r.raisons.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                {status?.groq && !explanations[r.culture] && (
                  <button onClick={() => explain(r)} className="mt-1 text-sm text-green-800 underline">
                    Expliquer simplement
                  </button>
                )}
                {explanations[r.culture] && <p className="mt-1 rounded-lg bg-green-50 px-3 py-1.5 text-sm">{explanations[r.culture]}</p>}
              </li>
            ))}
          </ul>

          {status?.seuils && (
            <details className="rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-600">
              <summary className="cursor-pointer font-medium text-stone-700">Comment ces conseils sont-ils calculés ?</summary>
              <p className="mt-2">
                Par des règles simples (fichier <code>server/rules.js</code>), testées dans l'ordre ; l'IA ne fait qu'expliquer le résultat :
              </p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>Culture pluviale, du 15 juin au 15 août, et au moins {status.seuils.pluieUtileSemis} mm tombés en 3 jours : semer.</li>
                <li>Au moins {status.seuils.pluieForte48h} mm prévus sur 48 h : attendre (ni arrosage ni traitement).</li>
                <li>Culture irriguée et moins de {status.seuils.pluieFaible3j} mm prévus sur 3 jours : arroser (tôt ou tard si plus de {status.seuils.chaleurForte} °C).</li>
                <li>Culture pluviale en période de semis mais sol sec : attendre une pluie utile.</li>
                <li>Culture pluviale hors hivernage (novembre à mai) : attendre.</li>
                <li>Vent sous {status.seuils.ventMaxTraitement} km/h et pas de pluie aujourd'hui ni demain : traiter si besoin.</li>
                <li>Sinon : attendre et surveiller.</li>
              </ol>
              <p className="mt-2 text-xs">Seuils indicatifs, à adapter avec un technicien local. Données : Open-Meteo.</p>
            </details>
          )}
        </>
      )}
    </div>
  );
}
