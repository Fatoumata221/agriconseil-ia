import { Camera, ImagePlus, Info, RefreshCw, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { apiJson, resizeImage } from "../lib/api.js";

const pct = (score) => `${Math.round(score * 100)} %`;
const RING = 176; // circonférence du cercle de confiance (rayon 28)

// Cercle de confiance animé autour du meilleur score.
function ScoreRing({ score, confident }) {
  return (
    <div className="relative grid size-20 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" strokeWidth="6" className="stroke-stone-100" />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - score)}
          className={"animate-ring " + (confident ? "stroke-emerald-600" : "stroke-ochre-500")}
        />
      </svg>
      <span className="text-lg font-extrabold tabular-nums text-stone-900">{Math.round(score * 100)}%</span>
    </div>
  );
}

export default function Diagnostic({ status, profile }) {
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const crops = status?.crops ?? {};
  const covered = Object.values(crops).filter((c) => c.covered).map((c) => c.name);
  const uncovered = profile.crops.filter((c) => crops[c] && !crops[c].covered).map((c) => crops[c].name);
  const analysing = loading.startsWith("Analyse");

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setResult(null);
    setExplanation("");
    try {
      const img = await resizeImage(file);
      setPhoto(img);
      setLoading("Analyse de la feuille… (la première fois, le modèle se charge)");
      const res = await apiJson("/api/diagnose", { method: "POST", body: img.blob, headers: { "Content-Type": "image/jpeg" } });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  async function explain() {
    setLoading("Explication en cours…");
    setError("");
    try {
      const { text } = await apiJson("/api/explain", { method: "POST", body: { kind: "diagnostic", data: result, profile } });
      setExplanation(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  const best = result?.top[0];
  return (
    <div className="space-y-4 pb-2 pt-2">
      <div className="px-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Diagnostic photo</h2>
        <p className="mt-1 text-sm text-stone-500">
          Une seule feuille, de près, bien éclairée, sur un fond uni. L'analyse reste sur le serveur.
        </p>
      </div>

      {uncovered.length > 0 && (
        <div className="flex animate-pop-in gap-3 rounded-3xl border border-ochre-400/30 bg-amber-50/90 p-4 text-sm text-amber-950">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-ochre-600" />
          <p>
            <strong>{uncovered.join(", ")}</strong> {uncovered.length > 1 ? "ne sont pas reconnues" : "n'est pas reconnue"} par le modèle
            (entraîné sur PlantVillage). Pour {uncovered.length > 1 ? "ces cultures" : "cette culture"}, le résultat ne sera pas fiable :
            consultez un technicien (ANCAR, ISRA).
          </p>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={onPickFile} />

      {!photo ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="group flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-emerald-300 bg-white/70 px-6 py-10 text-center transition duration-300 hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-white hover:shadow-lift active:scale-[0.99]"
        >
          <span className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-lift transition duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Camera className="size-8" />
          </span>
          <span className="text-base font-bold text-stone-800">Prendre ou choisir une photo</span>
          <span className="text-xs text-stone-500">JPEG, PNG ou WebP · 5 Mo maximum</span>
        </button>
      ) : (
        <div className="relative mx-auto w-full max-w-sm animate-pop-in overflow-hidden rounded-3xl shadow-lift">
          <img src={photo.preview} alt="Feuille analysée" className="max-h-72 w-full object-cover" />
          {analysing && (
            <>
              <div className="absolute inset-0 bg-emerald-950/30" />
              <div className="absolute inset-x-0 h-1 animate-scan bg-emerald-300 shadow-[0_0_24px_6px_rgb(110_231_183/0.8)]" />
              <p className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-white drop-shadow">Analyse en cours…</p>
            </>
          )}
          {!analysing && (
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-soft backdrop-blur transition hover:bg-white active:scale-95"
            >
              <ImagePlus className="size-4" /> Autre photo
            </button>
          )}
        </div>
      )}

      {loading && !analysing && <p className="text-center text-sm text-stone-500">{loading}</p>}
      {error && (
        <p className="flex animate-pop-in items-start gap-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <section className="card animate-fade-up space-y-4 p-5">
          <div className="flex items-center gap-4">
            <ScoreRing score={best.score} confident={result.confident} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{best.plant}</p>
              <p className="text-lg font-extrabold leading-tight text-stone-900">{best.condition}</p>
              {result.confident ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="size-3.5" /> Confiance suffisante
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ochre-600">
                  <TriangleAlert className="size-3.5" /> Pas sûr
                </p>
              )}
            </div>
          </div>

          {!result.confident && (
            <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              Pas sûr (confiance inférieure à {pct(result.threshold)}) : consultez un technicien (ANCAR/ISRA).
            </p>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">3 diagnostics les plus probables</p>
            {result.top.map((t, i) => (
              <div key={t.label}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate">
                    <strong className="font-semibold">{t.plant}</strong> · {t.condition}
                  </span>
                  <span className="font-semibold tabular-nums text-stone-600">{pct(t.score)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={"h-full animate-grow-x rounded-full " + (i === 0 ? "bg-linear-to-r from-emerald-400 to-emerald-700" : "bg-stone-300")}
                    style={{ width: `${Math.max(1, Math.round(t.score * 100))}%`, animationDelay: `${150 + i * 120}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {status?.groq ? (
            !explanation && (
              <button
                onClick={explain}
                disabled={Boolean(loading)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Expliquer en français simple
              </button>
            )
          ) : (
            <p className="text-xs text-stone-500">Ajoutez la clé Groq gratuite pour obtenir une explication en français simple.</p>
          )}
          {explanation && (
            <p className="animate-pop-in whitespace-pre-wrap rounded-2xl bg-linear-to-br from-emerald-50 to-sand-50 px-4 py-3 text-sm leading-relaxed">
              {explanation}
            </p>
          )}
          <p className="flex items-start gap-1.5 text-xs text-stone-400">
            <Info className="mt-px size-3.5 shrink-0" />
            Résultat indicatif d'un modèle automatique : il ne remplace pas l'avis d'un technicien.
          </p>
        </section>
      )}

      {covered.length > 0 && (
        <p className="px-1 text-xs text-stone-400">
          Cultures reconnues par le modèle : {covered.join(", ")} (et quelques fruitiers tempérés).
        </p>
      )}
    </div>
  );
}
