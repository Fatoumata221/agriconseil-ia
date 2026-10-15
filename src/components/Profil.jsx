import { Check, Loader2, LocateFixed, MapPin, Moon, Search, SunMedium, SunMoon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { geocodeUrl, mergePlaces, toPlaces } from "../../shared/openMeteo.js";
import { apiJson } from "../lib/api.js";
import { getTheme, setTheme } from "../lib/theme.js";

const THEMES = [
  { id: "auto", label: "Auto", Icon: SunMoon },
  { id: "light", label: "Clair", Icon: SunMedium },
  { id: "dark", label: "Sombre", Icon: Moon },
];

// Liste du profil (serveur) et géocodage Open-Meteo (appelé depuis le navigateur), fusionnés.
// Si l'un des deux échoue, on garde les résultats de l'autre.
async function searchPlaces(q) {
  const [local, remote] = await Promise.allSettled([
    apiJson(`/api/places?q=${encodeURIComponent(q)}`),
    fetch(geocodeUrl(q)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Géocodage indisponible (${r.status})`)))),
  ]);
  if (local.status === "rejected" && remote.status === "rejected") throw local.reason;
  return mergePlaces(local.value ?? [], remote.status === "fulfilled" ? toPlaces(remote.value.results) : []);
}

// Recherche de village avec un court délai, pour ne pas interroger les services à chaque lettre.
function usePlaceSearch(query) {
  const [state, setState] = useState({ results: [], loading: false, error: "" });
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState({ results: [], loading: false, error: "" });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    const timer = setTimeout(() => {
      searchPlaces(q)
        .then((results) => !cancelled && setState({ results, loading: false, error: "" }))
        .catch((err) => !cancelled && setState({ results: [], loading: false, error: err.message }));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);
  return state;
}

export default function Profil({ status, profile, onSave, onClose }) {
  const [place, setPlace] = useState(profile.place);
  const [crops, setCrops] = useState(profile.crops);
  const [gpsState, setGpsState] = useState("");
  const [query, setQuery] = useState("");
  const [theme, setThemeState] = useState(getTheme);
  const search = usePlaceSearch(query);

  const places = status?.places ?? {};
  const allCrops = status?.crops ?? {};
  const placeKey = place?.region && places[place.region]?.some((p) => p.name === place.name) ? `${place.region}|${place.name}` : "";

  function locate() {
    if (!navigator.geolocation) {
      setGpsState("GPS indisponible sur cet appareil : cherchez votre village.");
      return;
    }
    setGpsState("Localisation…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPlace({ name: "Ma position (GPS)", region: "", lat: Number(coords.latitude.toFixed(4)), lon: Number(coords.longitude.toFixed(4)) });
        setGpsState("");
      },
      () => setGpsState("Position refusée ou introuvable : cherchez votre village."),
      { timeout: 15_000, maximumAge: 600_000 },
    );
  }

  function choose(p) {
    setPlace({ name: p.name, region: p.region, lat: p.lat, lon: p.lon });
    setQuery("");
  }

  const toggle = (key) => setCrops((c) => (c.includes(key) ? c.filter((x) => x !== key) : [...c, key]));

  return (
    <div className="space-y-5 pb-2 pt-2">
      <div className="px-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Mon profil</h2>
        <p className="mt-1 text-sm text-stone-500">Pour des conseils adaptés à votre terrain.</p>
      </div>

      <section className="card space-y-3 p-5">
        <h3 className="font-bold text-stone-800">Localité</h3>

        {place && (
          <p key={place.name + place.lat} className="flex animate-pop-in items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2.5 text-sm text-stone-700">
            <MapPin className="size-4 shrink-0 text-accent" />
            <span className="min-w-0 flex-1">
              <strong className="text-stone-900">{place.name}</strong>
              {place.region && <span className="text-stone-500"> · région de {place.region}</span>}
            </span>
            <Check className="size-4 shrink-0 text-accent" />
          </p>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher mon village (ex. Thionck-Essyl)"
            maxLength={60}
            aria-label="Chercher un village ou une ville"
            className="w-full rounded-2xl border border-stone-200 bg-surface py-3 pl-10 pr-10 font-medium text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          {search.loading ? (
            <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-accent" />
          ) : (
            query && (
              <button onClick={() => setQuery("")} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:text-stone-700">
                <X className="size-4" />
              </button>
            )
          )}
        </div>

        {query.trim().length >= 2 && !search.loading && (
          <ul className="max-h-64 animate-pop-in overflow-y-auto rounded-2xl border border-stone-100 bg-surface">
            {search.results.map((p, i) => (
              <li key={`${p.name}${p.lat}${p.lon}`} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-up">
                <button onClick={() => choose(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-emerald-50">
                  <MapPin className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-stone-800">{p.name}</span>
                    <span className="block truncate text-xs text-stone-500">{[p.detail, p.region && `région de ${p.region}`].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </li>
            ))}
            {search.results.length === 0 && (
              <li className="px-4 py-3 text-sm text-stone-500">
                {search.error || "Aucun lieu trouvé. Essayez une autre orthographe (ex. « Tionk Essil »), ou choisissez une localité proche dans la liste."}
              </li>
            )}
          </ul>
        )}

        <label className="block text-sm text-stone-500">
          ou choisir dans la liste
          <select
            value={placeKey}
            onChange={(e) => {
              const [region, name] = e.target.value.split("|");
              const p = places[region]?.find((x) => x.name === name);
              if (p) choose({ ...p, region });
            }}
            className="mt-1 w-full rounded-2xl border border-stone-200 bg-surface px-4 py-3 font-medium text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">Sélectionner…</option>
            {Object.entries(places).map(([region, list]) => (
              <optgroup key={region} label={`Région de ${region}`}>
                {list.map((p) => (
                  <option key={p.name} value={`${region}|${p.name}`}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <button
          onClick={locate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-accent transition hover:bg-emerald-100 active:scale-[0.98]"
        >
          {gpsState === "Localisation…" ? <Loader2 className="size-5 animate-spin" /> : <LocateFixed className="size-5" />}
          Utiliser ma position GPS
        </button>
        {gpsState && gpsState !== "Localisation…" && <p className="animate-pop-in text-sm text-ochre-600">{gpsState}</p>}
      </section>

      <section className="card space-y-3 p-5">
        <h3 className="font-bold text-stone-800">Mes cultures</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(allCrops).map(([k, c]) => {
            const on = crops.includes(k);
            return (
              <button
                key={k}
                onClick={() => toggle(k)}
                aria-pressed={on}
                className={
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition duration-200 active:scale-95 " +
                  (on
                    ? "border-transparent bg-linear-to-br from-emerald-600 to-emerald-800 text-white shadow-soft"
                    : "border-stone-200 bg-surface text-stone-700 hover:border-emerald-300")
                }
              >
                <Check className={"size-4 transition-all duration-200 " + (on ? "w-4 opacity-100" : "-ml-1.5 w-0 opacity-0")} />
                {c.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h3 className="font-bold text-stone-800">Apparence</h3>
        {/* Segmenté : la pastille verte glisse sous le choix actif ; appliqué tout de suite. */}
        <div className="relative grid grid-cols-3 rounded-2xl bg-stone-100 p-1">
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-surface shadow-soft transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${THEMES.findIndex((t) => t.id === theme) * 100}%)` }}
          />
          {THEMES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setThemeState(id);
                setTheme(id);
              }}
              aria-pressed={theme === id}
              className={"relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors " + (theme === id ? "text-accent" : "text-stone-500")}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-400">« Auto » suit le réglage clair ou sombre de votre téléphone.</p>
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ place, crops })}
          className="flex-1 rounded-full bg-linear-to-br from-emerald-600 to-emerald-800 px-4 py-3 font-semibold text-white shadow-lift transition hover:scale-[1.02] active:scale-95"
        >
          Enregistrer
        </button>
        <button onClick={onClose} className="rounded-full bg-surface px-5 py-3 font-semibold text-stone-600 shadow-soft transition hover:text-stone-900 active:scale-95">
          Annuler
        </button>
      </div>
      <p className="px-1 text-xs text-stone-400">Le profil reste sur cet appareil ; il est joint à vos questions pour des réponses adaptées.</p>
    </div>
  );
}
