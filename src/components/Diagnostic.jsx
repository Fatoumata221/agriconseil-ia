import { useRef, useState } from "react";
import { apiJson, resizeImage } from "../lib/api.jsx";

const pct = (score) => `${Math.round(score * 100)} %`;

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
      setLoading("Analyse de la photo… (la première fois, le modèle se charge)");
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

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-stone-600">
        Photographiez <strong>une seule feuille</strong>, de près, bien éclairée, sur un fond uni. L'analyse se fait sur le
        serveur avec un modèle libre ; la photo n'est envoyée à aucun service extérieur.
      </p>

      {uncovered.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Attention :</strong> {uncovered.join(", ")} {uncovered.length > 1 ? "ne sont pas couvertes" : "n'est pas couverte"} par
          le modèle (entraîné sur le jeu de données PlantVillage). Pour {uncovered.length > 1 ? "ces cultures" : "cette culture"}, le résultat
          ne sera pas fiable : consultez un technicien (ANCAR, ISRA).
        </div>
      )}
      {covered.length > 0 && (
        <p className="text-xs text-stone-500">Cultures de votre profil reconnues par le modèle : {covered.join(", ")} (et quelques fruitiers).</p>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={onPickFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={Boolean(loading)}
        className="w-full rounded-xl bg-green-700 px-4 py-3 font-medium text-white hover:bg-green-800 disabled:opacity-40"
      >
        📷 Prendre ou choisir une photo
      </button>

      {photo && <img src={photo.preview} alt="Feuille analysée" className="mx-auto max-h-64 rounded-xl" />}
      {loading && <p className="text-center text-sm text-stone-500">{loading}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {result && (
        <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          {!result.confident && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              Pas sûr (confiance inférieure à {pct(result.threshold)}) : consultez un technicien (ANCAR/ISRA).
            </p>
          )}
          <h2 className="font-semibold text-stone-800">3 diagnostics les plus probables</h2>
          <ul className="space-y-2">
            {result.top.map((t) => (
              <li key={t.label}>
                <div className="flex justify-between text-sm">
                  <span>
                    <strong>{t.plant}</strong> – {t.condition}
                  </span>
                  <span className="tabular-nums text-stone-600">{pct(t.score)}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100">
                  <div className="h-2 rounded-full bg-green-600" style={{ width: pct(t.score).replace(" ", "") }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-500">
            Résultat indicatif d'un modèle automatique : il ne remplace pas l'avis d'un technicien.
          </p>
          {status?.groq ? (
            <button onClick={explain} disabled={Boolean(loading)} className="text-sm font-medium text-green-800 underline disabled:opacity-40">
              Expliquer en français simple
            </button>
          ) : (
            <p className="text-xs text-stone-500">Ajoutez la clé Groq gratuite pour obtenir une explication en français simple.</p>
          )}
          {explanation && <p className="whitespace-pre-wrap rounded-lg bg-green-50 px-3 py-2 text-sm">{explanation}</p>}
        </section>
      )}
    </div>
  );
}
