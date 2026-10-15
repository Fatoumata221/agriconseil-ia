import { ArrowRight, CloudSun, MessageCircle, ScanLine } from "lucide-react";
import { useRef, useState } from "react";

const SLIDES = [
  {
    Icon: MessageCircle,
    tile: "from-emerald-400 to-emerald-700",
    title: "Posez vos questions",
    text: "À l'écrit ou à la voix, l'assistant répond en français simple, selon votre village et vos cultures.",
  },
  {
    Icon: ScanLine,
    tile: "from-ochre-400 to-ochre-600",
    title: "Diagnostiquez une feuille",
    text: "Prenez une feuille malade en photo : l'app propose les maladies les plus probables et dit quand elle n'est pas sûre.",
  },
  {
    Icon: CloudSun,
    tile: "from-sky-400 to-sky-600",
    title: "Agissez au bon moment",
    text: "Avec la météo des 7 jours, sachez quand semer, arroser, traiter ou attendre, et économisez l'eau et les produits.",
  },
];

// Présentation au premier lancement ; on passe d'une page à l'autre en glissant le doigt ou avec le bouton.
export default function Bienvenue({ onDone }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef(null);
  const last = index === SLIDES.length - 1;
  const { Icon, tile, title, text } = SLIDES[index];

  const go = (i) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-sand-50 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="flex justify-end">
        <button onClick={onDone} className="rounded-full px-3 py-1.5 text-sm font-semibold text-stone-500 transition hover:text-stone-800">
          Passer
        </button>
      </div>

      <div key={index} className="mx-auto flex w-full max-w-sm flex-1 animate-fade-up flex-col items-center justify-center text-center">
        <div className="relative mb-10">
          <div className={`absolute inset-0 scale-150 rounded-full bg-linear-to-br ${tile} opacity-20 blur-2xl`} />
          <span className={`relative grid size-32 animate-float place-items-center rounded-[2.5rem] bg-linear-to-br ${tile} text-white shadow-lift`}>
            <Icon className="size-16" strokeWidth={1.6} />
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-stone-900">{title}</h2>
        <p className="mt-3 text-base leading-relaxed text-stone-500">{text}</p>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              onClick={() => go(i)}
              aria-label={`Page ${i + 1}`}
              className={"h-2 rounded-full transition-all duration-300 " + (i === index ? "w-8 bg-emerald-600" : "w-2 bg-stone-300")}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? onDone() : go(index + 1))}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-br from-emerald-600 to-emerald-800 px-6 py-4 text-base font-bold text-white shadow-lift transition hover:scale-[1.02] active:scale-95"
        >
          {last ? "Commencer" : "Suivant"}
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
