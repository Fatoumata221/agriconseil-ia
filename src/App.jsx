import { CloudSun, History, MapPin, MessageCircle, ScanLine, Sprout, User } from "lucide-react";
import { useEffect, useState } from "react";
import Assistant from "./components/Assistant.jsx";
import Bienvenue from "./components/Bienvenue.jsx";
import Diagnostic from "./components/Diagnostic.jsx";
import Historique from "./components/Historique.jsx";
import Meteo from "./components/Meteo.jsx";
import Profil from "./components/Profil.jsx";
import { apiJson, load, save } from "./lib/api.js";

const TABS = [
  { id: "assistant", label: "Assistant", Icon: MessageCircle },
  { id: "diagnostic", label: "Diagnostic", Icon: ScanLine },
  { id: "meteo", label: "Météo", Icon: CloudSun },
];

export default function App() {
  const [tab, setTab] = useState(() => load("tab", "assistant"));
  const [screen, setScreen] = useState(null); // null | "profil" | "historique"
  const [profile, setProfile] = useState(() => load("profile", { place: null, crops: [] }));
  const [status, setStatus] = useState(null);
  const [onboarded, setOnboarded] = useState(() => load("onboarded", false));
  // Sens de l'animation : l'écran glisse depuis la droite si l'onglet choisi est à droite, et inversement.
  const [direction, setDirection] = useState(null);

  useEffect(() => {
    apiJson("/api/status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => save("tab", tab), [tab]);

  function goTab(id) {
    const from = TABS.findIndex((t) => t.id === tab);
    const to = TABS.findIndex((t) => t.id === id);
    setDirection(screen || to === from ? null : to > from ? "right" : "left");
    setTab(id);
    setScreen(null);
  }

  function finishOnboarding() {
    save("onboarded", true);
    setOnboarded(true);
    if (!profile.place) setScreen("profil");
  }

  function saveProfile(p) {
    setProfile(p);
    save("profile", p);
    setScreen(null);
  }

  const headerButton = (id, Icon, label) => (
    <button
      onClick={() => setScreen(screen === id ? null : id)}
      aria-label={label}
      aria-pressed={screen === id}
      title={label}
      className={
        "grid size-10 place-items-center rounded-full transition duration-200 active:scale-90 " +
        (screen === id ? "bg-emerald-700 text-white shadow-soft" : "bg-surface/80 text-stone-600 shadow-soft hover:text-accent")
      }
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  );

  const activeIndex = TABS.findIndex((t) => t.id === tab);
  const cropNames = profile.crops.map((c) => status?.crops?.[c]?.name).filter(Boolean);

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-800 text-white shadow-lift">
          <Sprout className="size-6 animate-float" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-stone-900">
            AgriConseil
            <span className="rounded-md bg-linear-to-r from-ochre-400 to-ochre-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              IA
            </span>
          </h1>
          <button
            onClick={() => setScreen("profil")}
            className="flex max-w-full items-center gap-1 truncate text-xs text-stone-500 transition hover:text-accent"
          >
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {profile.place ? profile.place.name : "Choisir ma localité"}
              {cropNames.length > 0 && ` · ${cropNames.join(", ")}`}
            </span>
          </button>
        </div>
        {headerButton("historique", History, "Historique")}
        {headerButton("profil", User, "Profil")}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
        <div
          key={screen ?? tab}
          className={
            "h-full " +
            (screen || !direction ? "animate-fade-up" : direction === "right" ? "animate-slide-from-right" : "animate-slide-from-left")
          }
        >
          {screen === "profil" ? (
            <Profil status={status} profile={profile} onSave={saveProfile} onClose={() => setScreen(null)} />
          ) : screen === "historique" ? (
            <Historique />
          ) : tab === "assistant" ? (
            <Assistant status={status} profile={profile} onGoTo={goTab} onEditProfile={() => setScreen("profil")} />
          ) : tab === "diagnostic" ? (
            <Diagnostic status={status} profile={profile} />
          ) : (
            <Meteo status={status} profile={profile} onEditProfile={() => setScreen("profil")} />
          )}
        </div>
      </main>

      {/* Barre de navigation flottante ; la pastille verte glisse vers l'onglet actif. */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto relative grid grid-cols-3 rounded-full border border-edge bg-surface/80 p-1.5 shadow-lift backdrop-blur-xl">
          <span
            aria-hidden
            className={
              "absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-linear-to-br from-emerald-600 to-emerald-800 shadow-soft transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.1)] " +
              (screen ? "scale-90 opacity-0" : "opacity-100")
            }
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {TABS.map(({ id, label, Icon }) => {
            const active = !screen && tab === id;
            return (
              <button
                key={id}
                onClick={() => goTab(id)}
                aria-current={active ? "page" : undefined}
                className={
                  "relative flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 active:scale-95 " +
                  (active ? "text-white" : "text-stone-500 hover:text-accent")
                }
              >
                <Icon className="size-[18px]" strokeWidth={2.2} />
                <span className={active ? "" : "max-[360px]:sr-only"}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {!onboarded && <Bienvenue onDone={finishOnboarding} />}
    </div>
  );
}
