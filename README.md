# AgriConseil IA

Assistant agricole **100 % gratuit** pour les producteurs du Sénégal : poser une question (à l'écrit ou à la voix), diagnostiquer une maladie à partir de la photo d'une feuille, et recevoir des conseils du jour selon la météo de sa localité et ses cultures.

## Pourquoi ce projet : l'IA au service d'une agriculture durable

- **Moins d'intrants gaspillés** : les conseils météo évitent d'arroser juste avant une pluie ou de pulvériser un produit qui sera lessivé ou emporté par le vent. On économise l'eau, l'argent et on limite la pollution des sols.
- **Détection précoce des maladies** : une photo suffit pour un premier avis, ce qui permet de traiter tôt et de manière ciblée plutôt que préventivement à l'aveugle.
- **Semis au bon moment** : en hivernage, semer après une pluie utile réduit les pertes de levée et les re-semis.
- **Accessible** : interface en français simple, question à la voix, application installable sur téléphone et utilisable hors connexion pour la dernière météo. Aucun coût pour l'utilisateur ni pour l'hébergeur (API gratuites).
- **Prudence** : l'outil ne remplace pas les techniciens. Il le dit clairement dès que le modèle n'est pas sûr, et il renvoie vers l'ANCAR et l'ISRA.

## Fonctionnalités

| Onglet | Ce qu'il fait | Technologie | Clé nécessaire |
|---|---|---|---|
| 💬 Assistant | Chat agricole en streaming, adapté au profil (localité, cultures), bouton micro | Groq (gpt-oss-120b, modèle ouvert) + Whisper | `GROQ_API_KEY` (gratuite) |
| 📷 Diagnostic | Les 3 maladies les plus probables avec leur pourcentage, alerte « pas sûr » sous 70 % | Modèle MobileNetV2 PlantVillage exécuté **en local** (ONNX) | aucune |
| 🌦️ Météo | Prévisions sur 7 jours et conseil du jour par culture : semer, arroser, traiter ou attendre | Open-Meteo + règles lisibles | aucune |
| 👤 Profil | Localité : recherche de n'importe quel village, liste de 82 localités rangées par région (dont 29 en Casamance) ou GPS ; cultures pratiquées | géocodage Open-Meteo + stockage local du navigateur | aucune |
| 🕘 Historique | Questions et diagnostics passés, 10 par page | SQLite (`node:sqlite`) | — |

Bonus : **recherche dans des fiches techniques** (RAG). Déposez des fiches `.md` ou `.txt` dans `docs/` : l'assistant s'appuie dessus et cite la source.

## Architecture

```
Navigateur (React + Tailwind, PWA)
   │  profil et identifiant anonyme dans localStorage
   │  /api/* (aucune clé côté navigateur)
   ▼
server/index.js (Express) : limite de requêtes par IP, validation des entrées
   ├─ /api/chat ........ groq.js ──▶ Groq gpt-oss-120b (streaming)   + rag.js (docs/) + profil
   ├─ /api/transcribe .. groq.js ──▶ Groq Whisper
   ├─ /api/diagnose .... diagnose.js ──▶ modèle ONNX local (@huggingface/transformers)
   ├─ /api/weather ..... weather.js ──▶ Open-Meteo ; rules.js calcule la recommandation
   ├─ /api/places ...... geocode.js : liste places.js puis géocodage Open-Meteo (villages du Sénégal)
   ├─ /api/explain ..... Groq explique en une phrase un résultat déjà calculé
   └─ /api/history ..... db.js ──▶ SQLite (data/agri.db)
```

- **Les règles décident, l'IA explique.** La recommandation météo vient de règles simples écrites dans [server/rules.js](server/rules.js) (pluie cumulée, chaleur, vent, période de l'hivernage selon la culture). Elles sont testées dans [test/rules.test.js](test/rules.test.js) et affichées dans l'application (« Comment ces conseils sont-ils calculés ? »). Le modèle de langage ne fait que reformuler le résultat en une phrase.
- **Le diagnostic photo reste sur le serveur** : la photo n'est envoyée à aucun service tiers. Le modèle (~3 Mo) est téléchargé une fois depuis Hugging Face au premier diagnostic, puis gardé dans `models-cache/`.
- **Sécurité** : limite de 60 requêtes par minute et par IP sur `/api` (12 pour les appels IA et photo), images vérifiées d'après leurs premiers octets (JPEG, PNG ou WebP, 5 Mo maximum), audio limité à 10 Mo, messages limités à 2 000 caractères, rôles « système » refusés, en-têtes et erreurs sans détail interne. Les clés restent dans `.env` côté serveur.
- **Pas de wolof généré** : la qualité des modèles gratuits en wolof est trop faible, donc l'assistant répond uniquement en français.

## Installation et lancement

Prérequis : **Node.js 22.13 ou plus récent**.

```bash
npm install
cp .env.example .env
npm run dev
```

Ouvrez http://localhost:5173. `npm run dev` lance l'API (port 3001) et Vite (port 5173). Le serveur redémarre tout seul quand `.env` change.

Sans clé, la météo, le diagnostic photo, le profil et l'historique fonctionnent déjà. Le chat affiche un message qui explique comment obtenir la clé.

### Obtenir la clé Groq gratuite (chat et micro)

1. Créez un compte sur https://console.groq.com (gratuit, sans carte bancaire).
2. Ouvrez https://console.groq.com/keys, cliquez sur **Create API Key** et copiez la clé (elle commence par `gsk_`).
3. Dans le fichier `.env`, remplacez `gsk_...` par votre clé : `GROQ_API_KEY=gsk_votre_clé`, puis enregistrez. Plus simple sous Windows : lancez `powershell -ExecutionPolicy Bypass -File scripts\set-groq-key.ps1` et collez la clé quand elle est demandée (elle reste masquée). Ne publiez jamais `.env` : il est exclu de Git par `.gitignore`.

Le modèle de chat par défaut est `openai/gpt-oss-120b` (modèle ouvert) : les modèles Llama de chat ne sont plus proposés dans l'offre gratuite. Un autre modèle se règle avec `GROQ_MODEL` dans `.env` (liste sur https://console.groq.com/docs/models).

L'offre gratuite de Groq a des limites de débit (requêtes par minute et par jour). Si elles sont atteintes, l'application affiche « Limite gratuite de Groq atteinte ».

Aucune clé Hugging Face n'est nécessaire : le modèle photo tourne en local.

### Autres commandes

```bash
npm test          # tests (règles météo, validation, recherche dans les fiches, historique)
npm run build     # front compilé dans dist/
npm start         # production : Express sert l'API et le front sur http://localhost:3001
```

## Ajouter des fiches techniques (RAG)

1. Récupérez des fiches officielles (ISRA, ANCAR, services de l'agriculture…) en respectant leurs conditions de diffusion.
2. Copiez leur texte dans `docs/`, un fichier `.md` ou `.txt` par fiche, avec un nom explicite (par exemple `ISRA-arachide-semis-2024.md`) : ce nom est affiché comme source.
3. Le format conseillé est décrit dans [docs/_EXEMPLE-format-fiche.md](docs/_EXEMPLE-format-fiche.md). Les fichiers dont le nom commence par `_` sont ignorés par la recherche.

Le dépôt ne contient **aucune fiche réelle** : rien n'est inventé ni attribué à l'ISRA ou à l'ANCAR. Tant que `docs/` ne contient que l'exemple, l'assistant répond sans citer de source.

La recherche est volontairement simple (mots-clés normalisés et score BM25, sans base vectorielle) : elle tourne partout, gratuitement, et l'index se reconstruit dès qu'un fichier change.

## Déploiement (non effectué : il demande vos comptes)

**Option recommandée, tout-en-un sur Render** (gratuit) : poussez le dépôt sur GitHub, puis sur https://render.com faites *New > Blueprint* et choisissez le dépôt. [render.yaml](render.yaml) configure tout. Saisissez `GROQ_API_KEY` dans le tableau de bord de Render.

**Option front sur Vercel + API sur Render** : déployez d'abord l'API sur Render, remplacez l'adresse `agriconseil-ia.onrender.com` dans [vercel.json](vercel.json) par la vôtre, puis importez le dépôt sur https://vercel.com.

L'intégration continue ([.github/workflows/ci.yml](.github/workflows/ci.yml)) lance les tests et le build à chaque push sur GitHub.

## Limites connues

- **Couverture du modèle photo** : il a été entraîné sur PlantVillage (photos de feuilles isolées sur fond uni, 38 classes). Il reconnaît le **maïs, la tomate, la pomme de terre et le poivron**, ainsi que quelques fruitiers tempérés. **L'arachide, le mil, le sorgho, le niébé, l'oignon et le riz ne sont pas couverts** : l'application le signale quand ces cultures sont dans le profil. Sur une photo prise au champ ou sur une image qui n'est pas une feuille, le modèle peut se tromper avec une confiance élevée (lors d'un essai, un logo a été classé « Mildiou » à 57 %). D'où le seuil de 70 % et le renvoi vers un technicien.
- **Qualité des réponses du chat** : le modèle gratuit peut se tromper sur des détails agronomiques locaux. Lors d'un essai, avant l'ajout de repères sur le calendrier sénégalais dans le prompt, il annonçait des semis « fin avril » et une « petite saison des pluies ». Le prompt lui interdit maintenant d'inventer des doses. Des fiches officielles dans `docs/` amélioreront nettement la précision.
- **Règles météo indicatives** : les seuils (20 mm pour une pluie utile, 15 km/h de vent…) et le calendrier (semis du 15 juin au 15 août) sont des simplifications à valider avec un technicien local. Ils sont regroupés en haut de `server/rules.js` pour être faciles à ajuster.
- **Historique éphémère sur Render gratuit** : le disque est effacé à chaque redéploiement ou mise en veille, donc `data/agri.db` repart de zéro. Pour le conserver, il faut un disque persistant (payant) ou une base hébergée.
- **Pas de comptes utilisateurs** : l'historique est rattaché à un identifiant anonyme stocké dans le navigateur. Si on vide les données du navigateur, on perd l'accès à son historique.
- **Démarrage lent sur Render gratuit** : le service se met en veille ; le premier appel peut prendre environ 30 s, plus le téléchargement du modèle photo au premier diagnostic.
- **Micro** : il faut HTTPS (ou localhost) et l'autorisation du navigateur.
- `node:sqlite` est encore marqué expérimental dans Node 22 : l'avertissement est masqué dans les scripts npm.

## Idées d'évolution

- Entraîner (ou affiner) un modèle photo sur des maladies locales : rosette et cercosporiose de l'arachide, mildiou du mil, maladies de l'oignon, avec des images collectées avec l'ISRA.
- Alertes SMS ou WhatsApp quand une pluie utile tombe en période de semis.
- Base hébergée (Turso, Supabase…) pour un historique durable et des comptes.
- Recherche sémantique (embeddings) dans les fiches quand elles seront nombreuses.
- Prix des marchés et calendrier cultural par zone agroécologique.
- Messages vocaux en wolof enregistrés par des humains, plutôt que générés par l'IA.
