import { ChevronDown, Cloud, CloudRain, CloudSun, Droplets, Hourglass, MapPin, Sparkles, SprayCan, Sprout, Sun, Wind, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { apiJson, load, save } from "../lib/api.js";

const dayName = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" });
const dayNum = (iso) => new Date(`${iso}T12:00:00`).getDate();
const fr = (n) => String(n).replace(".", ",");

function skyIcon(d) {
  if (d.rain >= 5) return CloudRain;
  if (d.rain >= 1) return Cloud;
  if (d.tmax >= 35) return Sun;
  return CloudSun;
}

// Couleur et icône de chaque action recommandée par les règles.
const ACTION_STYLE = {
  semer: { Icon: Sprout, badge: "bg-emerald-100 text-emerald-800", tile: "from-emerald-400 to-emerald-600" },
  arroser: { Icon: Droplets, badge: "bg-sky-100 text-sky-800", tile: "from-sky-400 to-sky-600" },
  traiter: { Icon: SprayCan, badge: "bg-violet-100 text-violet-800", tile: "from-violet-400 to-violet-600" },
  attendre: { Icon: Hourglass, badge: "bg-amber-100 text-amber-800", tile: "from-ochre-400 to-ochre-600" },
};

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
      <div className="flex flex-col items-center gap-4 pt-12 text-center">
        <span className="grid size-20 animate-float place-items-center rounded-3xl bg-linear-to-br from-sky-400 to-emerald-600 text-white shadow-lift">
          <CloudSun className="size-10" />
        </span>
        <h2 className="text-xl font-extrabold text-stone-900">Où sont vos champs ?</h2>
        <p className="max-w-xs text-stone-500">Choisissez votre localité pour voir la météo des 7 prochains jours et les conseils du jour.</p>
        <button
          onClick={onEditProfile}
          className="rounded-full bg-linear-to-br from-emerald-600 to-emerald-800 px-6 py-3 font-semibold text-white shadow-lift transition hover:scale-[1.03] active:scale-95"
        >
          Compléter mon profil
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 pt-2">
        <div className="skeleton h-48" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-28 flex-1" />
          ))}
        </div>
        <div className="skeleton h-24" />
        {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  const today = data.forecast[0];
  const TodayIcon = skyIcon(today);
  const hero =
    today.rain >= 1
      ? "from-sky-500 via-sky-600 to-indigo-700"
      : today.tmax >= 35
        ? "from-ochre-400 via-orange-500 to-rose-500"
        : "from-sky-400 via-emerald-500 to-emerald-700";
  const stale = data.query !== query;

  return (
    <div className="space-y-5 pb-2 pt-2">
      <section className={`relative overflow-hidden rounded-3xl bg-linear-to-br ${hero} p-5 text-white shadow-lift`}>
        <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/15" />
        <div className="absolute -bottom-16 -left-10 size-40 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1 text-sm font-medium text-white/90">
              <MapPin className="size-4" /> {stale ? data.place : place.name}
            </p>
            <p className="mt-2 text-6xl font-extrabold tracking-tighter tabular-nums">{Math.round(today.tmax)}°</p>
            <p className="text-sm text-white/85">Minimum {Math.round(today.tmin)}° · aujourd'hui</p>
          </div>
          <TodayIcon className="size-20 animate-float drop-shadow-lg" strokeWidth={1.5} />
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
            <Droplets className="size-3.5" /> {fr(today.rain.toFixed(1))} mm
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
            <Wind className="size-3.5" /> {Math.round(today.windMax)} km/h
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
            <CloudRain className="size-3.5" /> {fr(data.indicateurs.pluie7jPrevus)} mm sur 7 j
          </span>
        </div>
        {loading && <span className="absolute right-4 top-4 size-2 animate-ping rounded-full bg-white" aria-label="Mise à jour" />}
      </section>

      {offline && (
        <p className="flex animate-pop-in items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <WifiOff className="size-4 shrink-0" />
          Hors connexion : prévisions du {new Date(data.fetchedAt).toLocaleString("fr-FR")}
          {stale ? ` (pour ${data.place})` : ""}.
        </p>
      )}

      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
        {data.forecast.map((d, i) => {
          const Icon = skyIcon(d);
          return (
            <div
              key={d.date}
              style={{ animationDelay: `${i * 60}ms` }}
              className={
                "flex min-w-[4.75rem] animate-fade-up flex-col items-center gap-1 rounded-3xl px-2 py-3 text-xs " +
                (i === 0 ? "bg-stone-900 text-white shadow-lift" : "card")
              }
            >
              <span className={"font-semibold capitalize " + (i === 0 ? "text-white/70" : "text-stone-400")}>
                {i === 0 ? "Auj." : dayName(d.date)}
              </span>
              <span className="text-sm font-bold">{dayNum(d.date)}</span>
              <Icon className={"my-1 size-6 " + (d.rain >= 1 ? "text-sky-400" : d.tmax >= 35 ? "text-ochre-400" : "text-emerald-500")} />
              <span className="font-bold tabular-nums">{Math.round(d.tmax)}°</span>
              <span className={"tabular-nums " + (i === 0 ? "text-white/60" : "text-stone-400")}>{Math.round(d.tmin)}°</span>
              <span className={"mt-0.5 font-medium tabular-nums " + (i === 0 ? "text-sky-300" : "text-sky-600")}>{fr(d.rain.toFixed(1))}</span>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="px-1 text-lg font-extrabold tracking-tight text-stone-900">Conseils du jour</h2>
        <p className="px-1 text-xs text-stone-400">
          Pluie des 3 derniers jours : {fr(data.indicateurs.pluie3jPasses)} mm
        </p>
      </div>

      {data.recommandations.length === 0 && (
        <button onClick={onEditProfile} className="card w-full p-4 text-left text-sm text-stone-600 transition hover:shadow-lift">
          Ajoutez vos cultures dans le <span className="font-semibold text-emerald-700">profil</span> pour recevoir des conseils.
        </button>
      )}

      <ul className="space-y-3">
        {data.recommandations.map((r, i) => {
          const style = ACTION_STYLE[r.action];
          return (
            <li key={r.culture} style={{ animationDelay: `${200 + i * 90}ms` }} className="card animate-fade-up p-4">
              <div className="flex items-center gap-3">
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br ${style.tile} text-white shadow-soft`}>
                  <style.Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-900">{r.nom}</p>
                  <span className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${style.badge}`}>{r.label}</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-stone-600">
                {r.raisons.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-300" />
                    {x}
                  </li>
                ))}
              </ul>
              {status?.groq && !explanations[r.culture] && (
                <button
                  onClick={() => explain(r)}
                  className="mt-3 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 active:scale-95"
                >
                  <Sparkles className="size-3.5" /> Expliquer simplement
                </button>
              )}
              {explanations[r.culture] &&
                (explanations[r.culture] === "…" ? (
                  <div className="typing mt-3 flex h-5 items-center gap-1">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <p className="mt-3 animate-pop-in rounded-2xl bg-linear-to-br from-emerald-50 to-sand-50 px-3 py-2 text-sm">
                    {explanations[r.culture]}
                  </p>
                ))}
            </li>
          );
        })}
      </ul>

      {status?.seuils && (
        <details className="card group p-4 text-sm text-stone-600">
          <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-stone-800">
            Comment ces conseils sont-ils calculés ?
            <ChevronDown className="size-4 transition duration-300 group-open:rotate-180" />
          </summary>
          <p className="mt-3">
            Par des règles simples (fichier <code>server/rules.js</code>), testées dans l'ordre ; l'IA ne fait qu'expliquer le résultat :
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-emerald-700">
            <li>Culture pluviale, du 15 juin au 15 août, et au moins {status.seuils.pluieUtileSemis} mm tombés en 3 jours : semer.</li>
            <li>Au moins {status.seuils.pluieForte48h} mm prévus sur 48 h : attendre (ni arrosage ni traitement).</li>
            <li>Culture irriguée et moins de {status.seuils.pluieFaible3j} mm prévus sur 3 jours : arroser (tôt ou tard si plus de {status.seuils.chaleurForte} °C).</li>
            <li>Culture pluviale en période de semis mais sol sec : attendre une pluie utile.</li>
            <li>Culture pluviale hors hivernage (novembre à mai) : attendre.</li>
            <li>Vent sous {status.seuils.ventMaxTraitement} km/h et pas de pluie aujourd'hui ni demain : traiter si besoin.</li>
            <li>Sinon : attendre et surveiller.</li>
          </ol>
          <p className="mt-3 text-xs text-stone-400">Seuils indicatifs, à adapter avec un technicien local. Données : Open-Meteo.</p>
        </details>
      )}
    </div>
  );
}
