import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { api } from "../lib/api.js";
import GroqNotice from "./GroqNotice.jsx";
import MicButton from "./MicButton.jsx";

const SUGGESTIONS = [
  "Quand semer l'arachide dans le bassin arachidier ?",
  "Comment lutter contre la chenille légionnaire sur le maïs ?",
  "Quel engrais organique pour un jardin maraîcher ?",
];

export default function Assistant({ status, profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {status && !status.groq && <GroqNotice />}
        {messages.length === 0 && (
          <div className="space-y-3 text-center">
            <p className="text-stone-500">Exemples :</p>
            <div className="flex flex-col items-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-green-200 bg-white px-4 py-2 text-sm text-green-800 hover:bg-green-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-green-700 px-4 py-2 text-white"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-4 py-2"
              }
            >
              {m.role === "assistant" && m.text ? (
                <div className="markdown">
                  <Markdown components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}>{m.text}</Markdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.text || (loading && i === messages.length - 1 ? "…" : "")}</p>
              )}
              {m.sources?.length > 0 && (
                <p className="mt-2 border-t border-stone-100 pt-1 text-xs text-stone-500">
                  Fiches consultées : {m.sources.map((s, n) => `[${n + 1}] ${s}`).join(" · ")}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-stone-200 py-3"
      >
        <MicButton onText={(t) => send(t)} onError={setError} disabled={loading || status?.groq === false} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre question…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2 outline-none focus:border-green-600"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-green-700 px-4 font-medium text-white hover:bg-green-800 disabled:opacity-40"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
