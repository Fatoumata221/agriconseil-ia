import { ChevronDown, ChevronLeft, ChevronRight, Inbox, MessageCircle, ScanLine, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, apiJson } from "../lib/api.js";

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
    <div className="space-y-4 pb-2 pt-2">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Historique</h2>
          {data?.total > 0 && <p className="text-sm text-stone-500">{data.total} élément{data.total > 1 ? "s" : ""}</p>}
        </div>
        {data?.total > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" /> Tout effacer
          </button>
        )}
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!data && !error && Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-16" />)}

      {data && data.total === 0 && (
        <div className="flex flex-col items-center gap-3 pt-10 text-center text-stone-500">
          <span className="grid size-16 place-items-center rounded-3xl bg-white text-stone-300 shadow-soft">
            <Inbox className="size-8" />
          </span>
          Aucune question ni diagnostic pour l'instant.
        </div>
      )}

      <ul key={page} className="space-y-2.5">
        {data?.items.map((item, i) => {
          const diag = item.kind === "diagnostic";
          const isOpen = open === item.id;
          return (
            <li key={item.id} style={{ animationDelay: `${i * 40}ms` }} className="card animate-fade-up overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : item.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span
                  className={
                    "grid size-10 shrink-0 place-items-center rounded-2xl " +
                    (diag ? "bg-ochre-400/15 text-ochre-600" : "bg-emerald-50 text-emerald-700")
                  }
                >
                  {diag ? <ScanLine className="size-5" /> : <MessageCircle className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-semibold text-stone-800">{item.title}</span>
                  <span className="block text-xs text-stone-400">
                    {new Date(`${item.created_at.replace(" ", "T")}Z`).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </span>
                <ChevronDown className={"size-4 shrink-0 text-stone-400 transition duration-300 " + (isOpen ? "rotate-180" : "")} />
              </button>
              <div className={"grid transition-all duration-300 ease-out " + (isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <p className="overflow-hidden whitespace-pre-wrap px-4 text-sm leading-relaxed text-stone-600">
                  <span className="block border-t border-stone-100 py-3">{item.content}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {data?.pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Pages de l'historique">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            aria-label="Page précédente"
            className="grid size-10 place-items-center rounded-full bg-white shadow-soft transition hover:text-emerald-700 active:scale-90 disabled:opacity-35"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="rounded-full bg-white px-4 py-2 font-semibold tabular-nums shadow-soft">
            {data.page} / {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
            aria-label="Page suivante"
            className="grid size-10 place-items-center rounded-full bg-white shadow-soft transition hover:text-emerald-700 active:scale-90 disabled:opacity-35"
          >
            <ChevronRight className="size-5" />
          </button>
        </nav>
      )}
    </div>
  );
}
