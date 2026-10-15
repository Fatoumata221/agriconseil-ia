# AgriConseil IA

Assistant agricole web : posez une question (cultures, ravageurs, sols, irrigation…) ou envoyez la **photo d'une plante** pour obtenir une identification, un diagnostic (maladie, carence, ravageur) et des conseils pratiques.

**Stack** : React 19 + Vite + Tailwind (front), Express (petit serveur proxy), API Claude d'Anthropic via le SDK officiel `@anthropic-ai/sdk`.

## Installation

```bash
npm install
cp .env.example .env   # puis renseignez ANTHROPIC_API_KEY
npm run dev
```

Ouvrez http://localhost:5173.

- `npm run dev` lance le serveur API (port 3001) et Vite (port 5173, qui redirige `/api` vers 3001).
- `npm run build && npm start` : le serveur Express sert aussi le front compilé sur http://localhost:3001.

## Architecture

```
navigateur (React)  ──POST /api/chat──▶  server/index.js (Express)  ──▶  API Claude
   photo redimensionnée                   clé API ici seulement           réponse en streaming
   en JPEG 1280 px max                    prompt système agricole
```

- La **clé API ne quitte jamais le serveur** : le navigateur ne parle qu'à `/api/chat`.
- Les photos sont réduites côté navigateur avant l'envoi (moins de données, requêtes moins chères).
- La réponse est diffusée en continu (streaming) pour s'afficher au fur et à mesure.
- Le prompt système (dans `server/index.js`) cadre l'assistant : français simple, contexte ouest-africain, niveau de confiance sur les diagnostics photo, précautions pour les produits phytosanitaires.

## Coût

Le modèle se règle avec `CLAUDE_MODEL` dans `.env` :

| Modèle | Entrée / sortie (par million de tokens) | Usage |
|---|---|---|
| `claude-opus-5-5` (défaut) | 4 $ / 20 $ | meilleure qualité de diagnostic |
| `claude-haiku-5-5` | 0,10 $ / 0,50 $ | le moins cher, suffisant pour des questions simples |

À titre d'ordre de grandeur, une question avec photo représente quelques milliers de tokens, soit une fraction de centime avec Haiku.
