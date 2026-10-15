import { Check, LocateFixed, Loader2, MapPin } from "lucide-react";
import { useState } from "react";

export default function Profil({ status, profile, onSave, onClose }) {
  const [place, setPlace] = useState(profile.place);
  const [crops, setCrops] = useState(profile.crops);
  const [gpsState, setGpsState] = useState("");

  const cities = status?.cities ?? {};
  const allCrops = status?.crops ?? {};
  const cityKey = Object.keys(cities).find((k) => cities[k].name === place?.name) ?? "";

  function locate() {
    if (!navigator.geolocation) {
      setGpsState("GPS indisponible sur cet appareil : choisissez une ville.");
      return;
    }
    setGpsState("Localisation…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPlace({ name: "Ma position (GPS)", lat: Number(coords.latitude.toFixed(4)), lon: Number(coords.longitude.toFixed(4)) });
        setGpsState("");
      },
      () => setGpsState("Position refusée ou introuvable : choisissez une ville."),
      { timeout: 15_000, maximumAge: 600_000 },
    );
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
        <button
          onClick={locate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98]"
        >
          {gpsState === "Localisation…" ? <Loader2 className="size-5 animate-spin" /> : <LocateFixed className="size-5" />}
          Utiliser ma position GPS
        </button>
        {gpsState && gpsState !== "Localisation…" && <p className="animate-pop-in text-sm text-ochre-600">{gpsState}</p>}
        <label className="block text-sm text-stone-500">
          ou choisir une ville
          <select
            value={cityKey}
            onChange={(e) => {
              const c = cities[e.target.value];
              if (c) setPlace({ name: c.name, lat: c.lat, lon: c.lon });
            }}
            className="mt-1 w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-3 font-medium text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">Sélectionner…</option>
            {Object.entries(cities).map(([k, c]) => (
              <option key={k} value={k}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {place && (
          <p key={place.name} className="flex animate-pop-in items-center gap-2 rounded-2xl bg-sand-100 px-3 py-2 text-sm text-stone-700">
            <MapPin className="size-4 text-emerald-700" />
            <strong>{place.name}</strong>
            <span className="text-stone-400">
              {place.lat.toFixed(2)}, {place.lon.toFixed(2)}
            </span>
          </p>
        )}
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
                    : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300")
                }
              >
                <Check className={"size-4 transition-all duration-200 " + (on ? "w-4 opacity-100" : "-ml-1.5 w-0 opacity-0")} />
                {c.name}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ place, crops })}
          className="flex-1 rounded-full bg-linear-to-br from-emerald-600 to-emerald-800 px-4 py-3 font-semibold text-white shadow-lift transition hover:scale-[1.02] active:scale-95"
        >
          Enregistrer
        </button>
        <button onClick={onClose} className="rounded-full bg-white px-5 py-3 font-semibold text-stone-600 shadow-soft transition hover:text-stone-900 active:scale-95">
          Annuler
        </button>
      </div>
      <p className="px-1 text-xs text-stone-400">Le profil reste sur cet appareil ; il est joint à vos questions pour des réponses adaptées.</p>
    </div>
  );
}
