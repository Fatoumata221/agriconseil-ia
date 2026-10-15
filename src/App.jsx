import { useEffect, useState } from "react";
import Assistant from "./components/Assistant.jsx";
import Diagnostic from "./components/Diagnostic.jsx";
import Historique from "./components/Historique.jsx";
import Meteo from "./components/Meteo.jsx";
import Profil from "./components/Profil.jsx";
import { apiJson, load, save } from "./lib/api.js";

const TABS = [
  { id: "assistant", label: "Assistant", icon: "💬" },
  { id: "diagnostic", label: "Diagnostic", icon: "📷" },
  { id: "meteo", label: "Météo", icon: "🌦️" },
];

export default function App() {
  const [tab, setTab] = useState(() => load("tab", "assistant"));
  const [screen, setScreen] = useState(null); // null | "profil" | "historique"
  const [profile, setProfile] = useState(() => load("profile", { place: null, crops: [] }));
  const [status, setStatus] = useState(null);

  useEffect(() => {
    apiJson("/api/status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => save("tab", tab), [tab]);

  function saveProfile(p) {
    setProfile(p);
    save("profile", p);
    setScreen(null);
  }

  const headerButton = (id, icon, label) => (
    <button
      onClick={() => setScreen(screen === id ? null : id)}
      aria-label={label}
      title={label}
      className={"rounded-full p-2 text-xl " + (screen === id ? "bg-green-100" : "hover:bg-stone-100")}
    >
      {icon}
    </button>
  );

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col">
      <header className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
        <span className="text-3xl" aria-hidden>
          🌱
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-green-800">AgriConseil IA</h1>
          <p className="truncate text-xs text-stone-500">
            {profile.place ? `📍 ${profile.place.name}` : "Profil à compléter"}
            {profile.crops.length > 0 && status?.crops && ` · ${profile.crops.map((c) => status.crops[c]?.name).join(", ")}`}
          </p>
        </div>
        {headerButton("historique", "🕘", "Historique")}
        {headerButton("profil", "👤", "Profil")}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4">
        {screen === "profil" ? (
          <Profil status={status} profile={profile} onSave={saveProfile} onClose={() => setScreen(null)} />
        ) : screen === "historique" ? (
          <Historique />
        ) : tab === "assistant" ? (
          <Assistant status={status} profile={profile} />
        ) : tab === "diagnostic" ? (
          <Diagnostic status={status} profile={profile} />
        ) : (
          <Meteo status={status} profile={profile} onEditProfile={() => setScreen("profil")} />
        )}
      </main>

      <nav className="grid grid-cols-3 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = !screen && tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setScreen(null);
              }}
              aria-current={active ? "page" : undefined}
              className={"flex flex-col items-center py-2 text-xs " + (active ? "font-semibold text-green-800" : "text-stone-500")}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
