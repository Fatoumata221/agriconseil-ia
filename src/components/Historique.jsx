import { useEffect, useState } from "react";
import { api, apiJson } from "../lib/api.jsx";

export default function Historique() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson(`/api/history?page=${page}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [page]);

  async function clear() {
    if (!confirm("Effacer tout l'historique de cet appareil ?")) return;
    await api("/api/history", { method: "DELETE" });
    setPage(1);
    setData({ items: [], total: 0, page: 1, pages: 1 });
  }

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-stone-800">Historique</h2>
        {data?.total > 0 && (
          <button onClick={clear} className="text-sm text-stone-500 hover:text-red-600">
            Tout effacer
          </button>
        )}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {data && data.total === 0 && <p className="text-stone-500">Aucune question ni diagnostic pour l'instant.</p>}

      <ul className="space-y-2">
        {data?.items.map((item) => (
          <li key={item.id} className="rounded-xl border border-stone-200 bg-white">
            <button onClick={() => setOpen(open === item.id ? null : item.id)} className="w-full px-3 py-2 text-left">
              <span className="mr-2">{item.kind === "diagnostic" ? "📷" : "💬"}</span>
              <span className="font-medium">{item.title}</span>
              <span className="block text-xs text-stone-500">
                {new Date(`${item.created_at.replace(" ", "T")}Z`).toLocaleString("fr-FR")}
              </span>
            </button>
            {open === item.id && <p className="whitespace-pre-wrap border-t border-stone-100 px-3 py-2 text-sm">{item.content}</p>}
          </li>
        ))}
      </ul>

      {data?.pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Pages de l'historique">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">
            ← Précédent
          </button>
          <span>
            Page {data.page} / {data.pages}
          </span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">
            Suivant →
          </button>
        </nav>
      )}
    </div>
  );
}
