import { Loader2, Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../lib/api.js";

const MAX_SECONDS = 60;

// Enregistre la voix, la fait transcrire par Whisper (Groq) et renvoie le texte.
export default function MicButton({ onText, onError, disabled }) {
  const [state, setState] = useState("idle"); // idle | recording | transcribing
  const recorderRef = useRef(null);
  const timerRef = useRef(null);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Votre navigateur ne permet pas l'enregistrement vocal.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Micro refusé : autorisez l'accès au micro dans le navigateur.");
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      clearTimeout(timerRef.current);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      setState("transcribing");
      try {
        const res = await api("/api/transcribe", {
          method: "POST",
          body: blob,
          headers: { "Content-Type": blob.type.split(";")[0] },
        });
        const { text } = await res.json();
        if (text) onText(text);
        else onError("Je n'ai rien entendu, réessayez en parlant plus près du micro.");
      } catch (err) {
        onError(err.message);
      } finally {
        setState("idle");
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setState("recording");
    timerRef.current = setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_SECONDS * 1000);
  }

  function stop() {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  }

  const label = { idle: "Poser la question à voix haute", recording: "Arrêter et envoyer", transcribing: "Transcription…" }[state];
  const Icon = { idle: Mic, recording: Square, transcribing: Loader2 }[state];
  return (
    <button
      type="button"
      onClick={state === "recording" ? stop : start}
      disabled={disabled || state === "transcribing"}
      title={label}
      aria-label={label}
      className={
        "grid size-10 shrink-0 place-items-center rounded-full transition duration-200 active:scale-90 disabled:opacity-35 " +
        (state === "recording"
          ? "animate-pulse-ring bg-red-500 text-white"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
      }
    >
      <Icon className={"size-[18px] " + (state === "transcribing" ? "animate-spin" : "")} fill={state === "recording" ? "currentColor" : "none"} />
    </button>
  );
}
