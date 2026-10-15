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
    <div className="space-y-5 py-4">
      <h2 className="text-lg font-semibold text-stone-800">Mon profil</h2>

      <section className="space-y-2">
        <h3 className="font-medium text-stone-700">Localité</h3>
        <button onClick={locate} className="w-full rounded-xl border border-green-300 bg-white px-4 py-2 text-green-800 hover:bg-green-50">
          📍 Utiliser ma position GPS
        </button>
        {gpsState && <p className="text-sm text-stone-500">{gpsState}</p>}
        <label className="block text-sm text-stone-600">
          ou choisir une ville :
          <select
            value={cityKey}
            onChange={(e) => {
              const c = cities[e.target.value];
              if (c) setPlace({ name: c.name, lat: c.lat, lon: c.lon });
            }}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
          >
            <option value="">—</option>
            {Object.entries(cities).map(([k, c]) => (
              <option key={k} value={k}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {place && (
          <p className="text-sm text-stone-600">
            Sélection : <strong>{place.name}</strong> ({place.lat.toFixed(2)}, {place.lon.toFixed(2)})
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium text-stone-700">Mes cultures</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(allCrops).map(([k, c]) => (
            <button
              key={k}
              onClick={() => toggle(k)}
              aria-pressed={crops.includes(k)}
              className={
                "rounded-full border px-3 py-1.5 text-sm " +
                (crops.includes(k) ? "border-green-700 bg-green-700 text-white" : "border-stone-300 bg-white text-stone-700")
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ place, crops })}
          className="flex-1 rounded-xl bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800"
        >
          Enregistrer
        </button>
        <button onClick={onClose} className="rounded-xl border border-stone-300 bg-white px-4 py-2">
          Annuler
        </button>
      </div>
      <p className="text-xs text-stone-500">Le profil reste sur cet appareil ; il est joint à vos questions pour des réponses adaptées.</p>
    </div>
  );
}
