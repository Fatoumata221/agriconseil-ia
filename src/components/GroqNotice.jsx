// Message affiché tant que la clé Groq gratuite n'est pas configurée sur le serveur.
export default function GroqNotice({ feature = "Le chat" }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">{feature} a besoin d'une clé Groq gratuite.</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
        <li>
          Créez un compte et une clé sur{" "}
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline">
            console.groq.com/keys
          </a>{" "}
          (gratuit, sans carte bancaire).
        </li>
        <li>
          Collez-la dans le fichier <code>.env</code> du projet : <code>GROQ_API_KEY=votre_clé</code>, puis enregistrez.
        </li>
      </ol>
      <p className="mt-1 text-amber-800">La météo et le diagnostic photo fonctionnent déjà sans clé.</p>
    </div>
  );
}
