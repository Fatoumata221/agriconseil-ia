import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Quand semer l'arachide dans le bassin arachidier ?",
  "Comment lutter contre la chenille légionnaire sur le maïs ?",
  "Quel engrais organique pour un jardin maraîcher ?",
];

// Réduit la photo avant l'envoi (moins de données, requête moins chère).
function resizeImage(file, maxSide = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(img.src);
      resolve({ mediaType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl });
    };
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = URL.createObjectURL(file);
  });
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImage(await resizeImage(file));
    } catch (err) {
      setError(err.message);
    }
  }

  async function send(text = input) {
    if (loading || (!text.trim() && !image)) return;
    setError("");

    const userMsg = { role: "user", text: text.trim(), image };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", text: "" }]);
    setInput("");
    setImage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, text, image }) => ({
            role,
            text,
            image: image ? { mediaType: image.mediaType, data: image.data } : undefined,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erreur ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", text: answer }]);
      }
    } catch (err) {
      setError(err.message);
      setMessages(history.slice(0, -1));
      setInput(userMsg.text);
      setImage(userMsg.image);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center gap-3 border-b border-stone-200 py-4">
        <span className="text-3xl" aria-hidden>🌱</span>
        <div>
          <h1 className="text-xl font-semibold text-green-800">AgriConseil IA</h1>
          <p className="text-sm text-stone-500">
            Posez une question agricole ou envoyez la photo d'une plante à diagnostiquer.
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto py-6">
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
              {m.image && (
                <img src={m.image.preview} alt="Photo envoyée" className="mb-2 max-h-60 rounded-lg" />
              )}
              <p className="whitespace-pre-wrap">
                {m.text || (loading && i === messages.length - 1 ? "…" : "")}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <footer className="border-t border-stone-200 py-3">
        {image && (
          <div className="mb-2 flex items-center gap-2">
            <img src={image.preview} alt="Aperçu" className="h-16 rounded-md" />
            <button onClick={() => setImage(null)} className="text-sm text-stone-500 hover:text-red-600">
              Retirer
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPickFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-stone-300 bg-white px-3 text-xl hover:bg-stone-100"
            title="Ajouter une photo"
          >
            📷
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={image ? "Décrivez le problème (facultatif)…" : "Votre question…"}
            className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2 outline-none focus:border-green-600"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !image)}
            className="rounded-xl bg-green-700 px-4 font-medium text-white hover:bg-green-800 disabled:opacity-40"
          >
            Envoyer
          </button>
        </form>
      </footer>
    </div>
  );
}
