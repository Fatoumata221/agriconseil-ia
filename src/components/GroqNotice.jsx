import { KeyRound } from "lucide-react";

// Message affiché tant que la clé Groq gratuite n'est pas configurée sur le serveur.
export default function GroqNotice({ feature = "Le chat" }) {
  return (
    <div className="flex animate-pop-in gap-3 rounded-3xl border border-ochre-400/30 bg-linear-to-br from-amber-50 to-sand-100 p-4 text-sm text-amber-950 shadow-soft">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ochre-500 text-white">
        <KeyRound className="size-[18px]" />
      </span>
      <div>
        <p className="font-semibold">{feature} a besoin d'une clé Groq gratuite.</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-amber-900">
          <li>
            Créez une clé sur{" "}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="font-medium underline">
              console.groq.com/keys
            </a>{" "}
            (gratuit, sans carte bancaire).
          </li>
          <li>
            Collez-la dans le fichier <code>.env</code> : <code>GROQ_API_KEY=votre_clé</code>, puis enregistrez.
          </li>
        </ol>
        <p className="mt-1 text-amber-800/80">La météo et le diagnostic photo fonctionnent déjà sans clé.</p>
      </div>
    </div>
  );
}
