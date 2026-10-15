import { BookOpen, Bug, ChevronRight, Leaf, MapPin, SendHorizontal, Sprout, TriangleAlert, Wheat } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { api } from "../lib/api.js";
import { useWeather } from "../lib/useWeather.js";
import { ACTION_STYLE, skyIcon } from "../lib/weatherStyle.js";
import GroqNotice from "./GroqNotice.jsx";
import MicButton from "./MicButton.jsx";

const SUGGESTIONS = [
  { text: "Quand semer l'arachide dans le bassin arachidier ?", Icon: Wheat },
  { text: "Comment lutter contre la chenille légionnaire sur le maïs ?", Icon: Bug },
  { text: "Quel engrais organique pour un jardin maraîcher ?", Icon: Leaf },
];

function Avatar() {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-soft">
      <Sprout className="size-4" strokeWidth={2.4} />
    </div>
  );
}

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5 || h >= 18) return "Bonsoir";
  if (h < 12) return "Bonjour";
  return "Bon après-midi";
}

// Résumé du jour dans la carte d'accueil : météo du profil et conseil principal, ou invitation à choisir sa localité.
function TodaySummary({ profile, onGoTo, onEditProfile }) {
  const { data, stale } = useWeather(profile);
  if (!profile.place) {
    return (
      <button
        onClick={onEditProfile}
        className="relative mt-4 flex w-full items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-left text-sm font-semibold backdrop-blur transition hover:bg-white/25 active:scale-[0.98]"
      >
        <MapPin className="size-5 shrink-0" />
        <span className="flex-1">Choisissez votre localité pour la météo et les conseils du jour</span>
        <ChevronRight className="size-4 shrink-0" />
      </button>
    );
  }
  if (!data || stale) return <div className="skeleton relative mt-4 h-14 opacity-60" />;
  const today = data.forecast[0];
  const Icon = skyIcon(today);
  const reco = data.recommandations[0];
  const style = reco && ACTION_STYLE[reco.action];
  return (
    <button
      onClick={() => onGoTo("meteo")}
      className="relative mt-4 flex w-full animate-pop-in items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-left backdrop-blur transition hover:bg-white/25 active:scale-[0.98]"
    >
      <Icon className="size-8 shrink-0" strokeWidth={1.6} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-white/80">
          Aujourd'hui à {profile.place.name} · {Math.round(today.tmax)}° · {String(today.rain.toFixed(1)).replace(".", ",")} mm
        </span>
        <span className="block truncate text-sm font-bold">
          {reco ? `${reco.nom} : ${reco.label.toLowerCase()}` : "Voir la météo des 7 jours"}
        </span>
      </span>
      {style && (
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br ${style.tile} shadow-soft`}>
          <style.Icon className="size-4" />
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 opacity-70" />
    </button>
  );
}

export default function Assistant({ status, profile, onGoTo, onEditProfile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text = input) {
    text = text.trim();
    if (loading || !text) return;
    setError("");
    const history = [...messages, { role: "user", text }];
    setMessages([...history, { role: "assistant", text: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api("/api/chat", {
        method: "POST",
        body: { messages: history.map(({ role, text }) => ({ role, text })), profile },
      });
      const sources = JSON.parse(decodeURIComponent(res.headers.get("X-Sources") || "%5B%5D"));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", text: answer, sources }]);
      }
    } catch (err) {
      setError(err.message);
      setMessages(history.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar -mx-4 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2">
        {status && !status.groq && <GroqNotice />}

        {messages.length === 0 && (
          <div className="space-y-5 pt-2">
            <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-6 text-white shadow-lift">
              <div className="absolute -right-6 -top-6 size-36 rounded-full bg-white/10" />
              <div className="absolute -bottom-10 right-10 size-24 rounded-full bg-ochre-400/30" />
              <Sprout className="absolute right-6 top-6 size-14 animate-float text-white/25" strokeWidth={1.5} />
              <p className="text-sm font-medium text-white/80">{greeting()} 👋</p>
              <h2 className="mt-1 max-w-[16rem] text-2xl font-extrabold leading-tight tracking-tight">
                Une question sur vos cultures ?
              </h2>
              <p className="mt-2 max-w-xs text-sm text-white/85">
                Écrivez-la ou appuyez sur le micro : je réponds en français simple, selon votre localité et vos cultures.
              </p>
              <TodaySummary profile={profile} onGoTo={onGoTo} onEditProfile={onEditProfile} />
            </section>

            <div className="space-y-2.5">
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Pour commencer</p>
              {SUGGESTIONS.map(({ text, Icon }, i) => (
                <button
                  key={text}
                  onClick={() => send(text)}
                  style={{ animationDelay: `${120 + i * 80}ms` }}
                  className="card group flex w-full animate-fade-up items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-accent transition group-hover:bg-emerald-600 group-hover:text-white">
                    <Icon className="size-[18px]" />
                  </span>
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex animate-pop-in justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-linear-to-br from-emerald-600 to-emerald-800 px-4 py-2.5 text-white shadow-soft">
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex animate-pop-in items-end gap-2">
              <Avatar />
              <div className="card max-w-[85%] rounded-bl-lg px-4 py-3">
                {m.text ? (
                  <div className="markdown text-[15px] leading-relaxed">
                    <Markdown components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}>{m.text}</Markdown>
                  </div>
                ) : (
                  <div className="typing flex h-5 items-center gap-1" aria-label="L'assistant écrit…">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {m.sources?.length > 0 && (
                  <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-2 text-xs text-stone-500">
                    <BookOpen className="size-3.5" />
                    {m.sources.map((s, n) => (
                      <span key={s} className="rounded-full bg-sand-100 px-2 py-0.5">
                        [{n + 1}] {s}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mb-2 flex animate-pop-in items-start gap-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="card flex items-center gap-2 rounded-full p-1.5 transition focus-within:ring-2 focus-within:ring-emerald-500/40"
      >
        <MicButton onText={(t) => send(t)} onError={setError} disabled={loading || status?.groq === false} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre question…"
          maxLength={2000}
          className="min-w-0 flex-1 bg-transparent px-1 py-2 outline-none placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Envoyer"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-soft transition duration-200 hover:scale-105 active:scale-90 disabled:scale-100 disabled:opacity-35"
        >
          <SendHorizontal className="size-[18px]" />
        </button>
      </form>
    </div>
  );
}
