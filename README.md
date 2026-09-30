# Kairos — Football Analytics

Plateforme web d'**analyse statistique de matchs de football** : probabilités estimées (1X2, buts, BTTS, double chance, corners), comparaison avec les probabilités implicites des cotes, combinés avec prise en compte des corrélations, suivi de bankroll, historique et backtest du modèle, explications générées par IA à partir des seuls calculs du moteur.

> ⚠️ **Kairos est un outil d'analyse, pas un opérateur de paris.** Les analyses sont statistiques, aucune prédiction n'est certaine, les performances passées ne garantissent pas les résultats futurs et les paris comportent un risque de perte financière. Respectez la législation de votre pays.

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Installation](#installation)
3. [Variables d'environnement](#variables-denvironnement)
4. [Lancement](#lancement)
5. [Architecture](#architecture)
6. [Moteur d'analyse](#moteur-danalyse)
7. [API](#api)
8. [Base de données](#base-de-données)
9. [Données temps réel](#données-temps-réel)
10. [IA explicative](#ia-explicative)
11. [Sécurité](#sécurité)
12. [Tests et qualité](#tests-et-qualité)
13. [Déploiement](#déploiement)
14. [Données de démonstration](#données-de-démonstration)

---

## Fonctionnalités

| Page | Contenu |
| --- | --- |
| **Tableau de bord** `/` | KPI (matchs analysés, analyses disponibles, probabilités calculées, prédictions historiques, résultats du modèle), matchs du jour / à venir / récemment terminés, alertes, meilleurs écarts statistiques, performance historique (backtest + calibration), tendances par compétition. |
| **Matchs** `/matches` | Navigation par date, filtres compétition / pays / équipe / statut / heure, recherche rapide, forme, classement, cotes 1X2, probabilités du modèle, xG attendus. |
| **Analyse d'un match** `/matches/[id]` | En-tête (équipes, compétition, date, stade), probabilités, score analytique et facteurs, matrice des scores, marchés & value (probabilité, cote juste, cote, probabilité implicite, écart, confiance, explication, données utilisées), évolution des cotes, direct (événements, stats live, cotes live), forme (10 derniers matchs), statistiques comparées (possession, tirs, xG/xGA, corners, cartons, clean sheets, BTTS, over/under, domicile/extérieur), confrontations, contexte (repos, calendrier, absences confirmées, importance du match), qualité des données. |
| **Opportunités** `/opportunities` | Marchés présentant les plus grands écarts entre probabilité modèle et probabilité implicite, filtres (marché, compétition, écart, confiance), tri, explication, ajout au combiné. |
| **Combinés** `/combines` | Sélections, cote totale, probabilité combinée (naïve **et** corrigée des corrélations intra-match), niveau de risque, simulation de mise, enregistrement dans la bankroll. |
| **Bankroll** `/bankroll` | Solde, bankroll initiale, gains/pertes, ROI, taux de réussite, graphique du solde, historique des paris, dépôts/retraits, limites de perte, simulateur de mise avec alertes. |
| **Historique** `/history` | Historique des analyses du modèle (date, match, marché, cote, probabilité, résultat, gain/perte, ROI) avec filtres, recherche, pagination et export CSV ; historique de vos paris. |
| **Paramètres** `/settings` | Thème, devise, langue, notifications, compétitions favorites, gestion de bankroll (limites, blocage strict), paramètres du modèle (pondérations, xG, fenêtre, récence, rétrécissement, Dixon-Coles, seuils). |
| **Jeu responsable** `/responsible-gaming` | Principes, outils disponibles, signaux d'alerte, ressources d'aide. |

UX : skeleton loaders et streaming (Suspense), animations (Framer Motion), tooltips, notifications (Sonner), états vides et d'erreur, boutons avec état de chargement, confirmations avant suppression, palette de recherche **⌘K / Ctrl+K**, thème sombre par défaut (clair et « système » disponibles), responsive (sidebar fixe sur desktop, compacte sur tablette, barre d'onglets et cartes empilées sur mobile).

---

## Installation

Prérequis : **Node.js ≥ 20.9** (22 recommandé) et npm. PostgreSQL 14+ est optionnel.

```bash
git clone <repo> kairos && cd kairos
npm install            # installe les dépendances et génère le client Prisma
cp .env.example .env.local
```

Sans aucune configuration, l'application démarre avec le **provider de démonstration** (données fictives clairement signalées) et un **stockage fichier** local (`.data/kairos.json`).

---

## Variables d'environnement

Toutes les variables sont lues **uniquement côté serveur** (`src/lib/config/env.ts`, validées par Zod). Aucune n'est préfixée `NEXT_PUBLIC_` : les clés ne sont jamais envoyées au navigateur.

| Variable | Défaut | Description |
| --- | --- | --- |
| `SPORTS_API_PROVIDER` | _(vide)_ | `api-football` pour une source réelle ; vide = démo. |
| `SPORTS_API_KEY` | | Clé de l'API sportive. |
| `SPORTS_API_URL` | `https://v3.football.api-sports.io` | URL de base de l'API. |
| `SPORTS_API_LEAGUES` | | IDs de ligues séparés par des virgules (ex. `61,39,140,135,78`). |
| `SPORTS_API_SEASON` | année courante | Saison (année de début). |
| `SPORTS_API_BOOKMAKER` | | ID de bookmaker pour les cotes (optionnel). |
| `SPORTS_API_CACHE_SECONDS` | `300` | Durée de cache des réponses. |
| `ANTHROPIC_API_KEY` | | Active l'IA explicative (sinon générateur déterministe). |
| `LLM_MODEL` | `claude-opus-5-5` | Modèle utilisé pour les explications. |
| `LLM_EFFORT` | `low` | Effort de raisonnement (`low`, `medium`, `high`). |
| `DATABASE_URL` | | Active PostgreSQL (Prisma). |
| `STORAGE_DRIVER` | auto | `file` ou `postgres`. |
| `DATA_DIR` | `.data` | Dossier du stockage fichier. |
| `APP_ACCESS_PASSWORD` | | Protège toute l'application par mot de passe. |
| `APP_SESSION_SECRET` | | Secret HMAC des sessions (32+ caractères). |
| `APP_TIMEZONE` | `Europe/Paris` | Fuseau d'affichage des dates. |
| `LIVE_POLL_INTERVAL_SECONDS` | `15` | Fréquence d'interrogation de la source temps réel. |
| `BACKTEST_DAYS` | `45` | Période du backtest du modèle. |

---

## Lancement

```bash
npm run dev        # développement : http://localhost:3000
npm run build      # build de production
npm start          # serveur de production
npm run check      # typecheck + lint + tests
```

---

## Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── (app)/                  # pages avec le shell (sidebar, topbar, navigation mobile)
│   │   ├── page.tsx            # tableau de bord (sections en streaming)
│   │   ├── matches/            # liste + [id] (analyse détaillée) + loading/not-found
│   │   ├── opportunities/  combines/  bankroll/  history/  settings/  responsible-gaming/
│   │   └── error.tsx, loading.tsx, not-found.tsx
│   ├── (auth)/login/           # connexion (si APP_ACCESS_PASSWORD)
│   ├── api/                    # routes REST (voir « API »)
│   └── layout.tsx, globals.css # design tokens (sombre / clair / système)
├── components/
│   ├── ui/                     # primitives type shadcn/ui (Radix + Tailwind)
│   ├── layout/                 # AppShell, Sidebar, Topbar, MobileTabBar, recherche ⌘K
│   ├── common/                 # KPI, écussons, badges, états vides/erreur, jeu responsable
│   ├── charts/                 # Recharts : performance, calibration, cotes, bankroll, matrice
│   ├── dashboard/ matches/ match/ opportunities/ accumulator/ bankroll/ history/ settings/
├── lib/
│   ├── domain/                 # types métier, marchés, paramètres (Zod), bankroll
│   ├── engine/                 # MOTEUR D'ANALYSE (pur, testé, sans dépendance framework)
│   ├── providers/              # abstraction SportDataProvider + mock + API-Football
│   ├── services/               # orchestration serveur : analyses, matchs, opportunités, backtest…
│   ├── storage/                # Repository : fichier JSON ou PostgreSQL (Prisma)
│   ├── ai/                     # IA explicative (faits → LLM → vérification des chiffres)
│   ├── security/               # sessions signées, rate limiting
│   └── config/env.ts           # configuration serveur validée
├── hooks/                      # temps réel (SSE), horloge, montage
├── stores/bet-slip.ts          # sélections du combiné (Zustand, persistées localement)
└── proxy.ts                    # protection d'accès (ex-« middleware » Next.js 16)
prisma/                         # schéma + migrations PostgreSQL
```

Principes :

- **Séparation stricte** : l'interface ne parle qu'aux services (Server Components) ou aux routes API ; les services dépendent de l'interface `SportDataProvider`, jamais d'un fournisseur ; le moteur est un module pur.
- **Server Components par défaut**, composants client uniquement pour l'interactivité ; sections longues en **Suspense** (streaming).
- **Types stricts** de bout en bout (`strict: true`), validation **Zod** de toutes les entrées.
- **Cache mémoire TTL** avec déduplication (`src/lib/cache.ts`) pour analyses, classements, backtest.

### Abstraction `SportDataProvider`

`src/lib/providers/types.ts` :

```ts
interface SportDataProvider {
  info: ProviderInfo;                   // nom, démo ?, capacités (cotes, xG, corners, absences, live…)
  getCompetitions(); getMatches(query); getMatch(id); getTeam(id); getTeams();
  getTeamForm(teamId, { before, limit }); getTeamStats(teamId, opts);
  getHeadToHead(a, b, opts); getStandings(competitionId);
  getOdds(matchId); getAvailability(matchId); getLiveSnapshot(matchId);
}
```

- `MockSportDataProvider` : monde fictif déterministe (5 championnats, 60 équipes inventées).
- `ApiFootballProvider` : adaptateur API-Football v3 (fixtures, statistiques, H2H, classements, cotes, blessures, événements live).
- Pour ajouter un fournisseur : implémenter l'interface puis l'enregistrer dans `src/lib/providers/index.ts`.

> L'adaptateur API-Football suit la documentation v3 mais n'a pas pu être testé sans clé : validez-le avec votre abonnement. Vérifiez aussi les conditions de licence pour l'affichage des cotes.

---

## Moteur d'analyse

`src/lib/engine/` — module pur, testé (`vitest`).

1. **Profils d'équipe** (`profile.ts`) : N derniers matchs (**strictement antérieurs au coup d'envoi**), pondérés par récence (demi-vie configurable) : buts, xG/xGA, corners, forme, points à domicile/extérieur, jours de repos, matchs sur 14 jours.
2. **Buts attendus** (`analyze.ts`) : ratios attaque/défense rapportés aux moyennes du championnat, mélange global / spécifique au lieu, **rétrécissement bayésien** vers la moyenne ; deux estimations indépendantes (buts réels, xG) combinées selon le poids xG.
3. **Score analytique** (`factors.ts`) : 8 facteurs aux pondérations configurables (forme 20 %, domicile/extérieur 15 %, buts 15 %, xG 15 %, défense 10 %, confrontations 5 %, disponibilité 10 %, calendrier/repos 10 %). Les facteurs indisponibles sont exclus et leur poids redistribué. Seuls les facteurs **non déjà captés** par le modèle de buts (forme, confrontations, disponibilité, repos) ajustent les buts attendus (pas de double comptage).
4. **Matrice des scores** : Poisson corrigé **Dixon-Coles** → 1X2, double chance, over/under 1.5/2.5/3.5, BTTS ; corners via **binomiale négative** (surdispersion).
5. **Confiance statistique** : qualité des données (échantillon, couverture stats/xG, moyennes de ligue, absences connues), concordance des modèles buts/xG, pénalité en cas d'écart extrême avec le marché. Elle mesure la **fiabilité de l'estimation**, pas la chance de gain.
6. **Value** (`value.ts`) : probabilité implicite = `1 / cote`, marge du bookmaker, probabilité implicite sans marge, **écart statistique** = probabilité modèle − implicite, espérance théorique.
7. **Combinés** (`accumulator.ts`) : probabilité jointe **exacte** sur la matrice des scores pour les sélections d'un même match (ex. « victoire domicile + over 2.5 »), indépendance (signalée comme approximation) entre matchs, détection des sélections incompatibles, niveau de risque.
8. **Évaluation** (`evaluation.ts`) : Brier, log-loss, précision, calibration.

Le **backtest** (`services/backtest.ts`) est walk-forward : chaque match terminé est ré-analysé avec les données antérieures au coup d'envoi, comparé au résultat réel et aux cotes de clôture (mise fixe d'une unité).

---

## API

Toutes les réponses sont en JSON ; les erreurs ont la forme `{ "error": { "message", "code", "details?" } }`.

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | État, provider, configuration non sensible. |
| GET | `/api/competitions` | Compétitions, pays, équipes (filtres). |
| GET | `/api/matches?date&competition&country&team&q&status&from&to` | Matchs enrichis (forme, classement, cotes, probabilités). |
| GET | `/api/matches/:id` | Match. |
| GET | `/api/matches/:id/analysis` | Analyse complète. |
| GET | `/api/opportunities?days&minEdge&minConfidence` | Écarts statistiques. |
| GET | `/api/backtest` | Performances historiques du modèle. |
| GET | `/api/search?q` | Recherche rapide. |
| POST | `/api/explain` | `{ matchId, marketKey, question? }` → explication structurée. |
| POST | `/api/accumulator` | `{ selections: [{ matchId, marketKey, odds? }] }` → probabilité combinée. |
| GET | `/api/bankroll` | Paris, mouvements, synthèse. |
| POST | `/api/bankroll/bets` | Créer un pari (limites vérifiées). |
| PATCH/DELETE | `/api/bankroll/bets/:id` | Modifier / supprimer un pari. |
| POST | `/api/bankroll/transactions` | Dépôt / retrait. |
| DELETE | `/api/bankroll/transactions/:id` | Supprimer un mouvement. |
| POST | `/api/bankroll/reset` | `{ confirm: "RESET" }`. |
| GET/PUT | `/api/settings` | Lire / enregistrer les paramètres. |
| GET | `/api/live` | Matchs en direct. |
| GET | `/api/live/:id` | Instantané temps réel. |
| GET | `/api/live/:id/stream` | Flux **Server-Sent Events**. |
| POST | `/api/auth/login`, `/api/auth/logout` | Session (si mot de passe activé). |

---

## Base de données

Deux implémentations de l'interface `Repository` (`src/lib/storage`) :

- **Fichier JSON** (par défaut) : `DATA_DIR/kairos.json`, écritures atomiques et sérialisées. Idéal en local.
- **PostgreSQL via Prisma 7** (driver adapter `pg`) dès que `DATABASE_URL` est défini.

```bash
# PostgreSQL local
createdb kairos
echo 'DATABASE_URL=postgresql://user:password@localhost:5432/kairos' >> .env.local
npm run db:deploy     # applique prisma/migrations
npm run db:studio     # (optionnel) explorer les données
```

Schéma (`prisma/schema.prisma`) : `app_settings` (JSON validé par Zod), `bets`, `bankroll_transactions`. Après modification du schéma : `npm run db:migrate`.

---

## Données temps réel

- `getLiveSnapshot()` (provider) : score, minute, événements (buts, cartons, remplacements, VAR), statistiques live, cotes live.
- `/api/live/:id/stream` (SSE) interroge la source toutes les `LIVE_POLL_INTERVAL_SECONDS` et ne pousse que les changements ; le client (`useLiveMatch`) bascule automatiquement sur du polling si le flux est indisponible, et se ferme à la fin du match.
- Un fournisseur disposant de webhooks ou de websockets peut alimenter ce flux directement sans changer l'interface.
- Notifications (buts, cartons rouges) activables dans les paramètres.

---

## IA explicative

`src/lib/ai/` — le LLM ne sert **qu'à reformuler** les résultats du moteur :

1. `facts.ts` construit un paquet JSON contenant **uniquement** les valeurs du moteur et de la source.
2. `explain.ts` appelle Claude (SDK `@anthropic-ai/sdk`, sortie structurée validée par Zod, repli serveur en cas de refus) avec un prompt interdisant toute statistique ou information inventée (blessures, compositions…), toute certitude et toute incitation à parier.
3. La réponse est structurée en **Données / Calculs / Interprétation / Limites**.
4. Chaque nombre cité est **vérifié** contre le paquet de faits ; les nombres non retrouvés sont signalés à l'utilisateur.
5. Sans `ANTHROPIC_API_KEY` (ou en cas d'erreur), un générateur **déterministe** produit l'explication à partir des mêmes faits.

L'endpoint est protégé (origine, limitation de débit, taille de requête) et mis en cache.

---

## Sécurité

- Clés et secrets uniquement dans `.env.local` (ignoré par git), lus côté serveur, validés au démarrage.
- **Validation Zod** de toutes les entrées (corps, paramètres, filtres), taille des corps limitée.
- **Protection CSRF** : vérification de l'origine sur toutes les routes mutantes.
- **Rate limiting** (explications, recherche, connexion, combinés).
- **Accès protégé** optionnel (`APP_ACCESS_PASSWORD`) : session signée HMAC-SHA256, cookie `httpOnly`/`sameSite`, comparaison à temps constant, `proxy.ts` protège pages et API.
- En-têtes : CSP (production), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Erreurs internes jamais exposées au client.

---

## Tests et qualité

```bash
npm run typecheck   # TypeScript strict (+ génération des types de routes)
npm run lint        # ESLint (next/core-web-vitals + typescript)
npm test            # Vitest : moteur (Poisson, Dixon-Coles, value, combinés, calibration) + provider
```

---

## Déploiement

**Node / VM** : `npm ci && npm run build && npm run db:deploy && npm start` (sortie `standalone` disponible dans `.next/standalone`).

**Docker** :

```bash
docker compose up --build -d db app
docker compose run --rm migrate      # applique les migrations (nécessite npm install sur l'hôte)
```

**Vercel / plateformes serverless** : définir les variables d'environnement, utiliser PostgreSQL (le stockage fichier n'est pas persistant en serverless) et exécuter `npm run db:deploy` lors du déploiement. Le cache mémoire est par instance : pour plusieurs instances, remplacez `src/lib/cache.ts` par Redis.

Pensez à activer `APP_ACCESS_PASSWORD` si l'application est accessible publiquement.

---

## Données de démonstration

Sans API configurée, Kairos utilise un **monde entièrement fictif** : championnats (Ligue Horizon, Liga Meridiana, Albion Premier League, Serie Aurea, Kaiserliga), équipes, stades, statistiques, cotes (« Bookmaker démo ») et matchs en direct simulés. Ces données sont **systématiquement signalées** (badges « Démo », bannières) et le backtest affiché porte sur ces données fictives : il **ne constitue en aucun cas une performance réelle**.

Le provider de démo ne génère **aucune blessure ni suspension** : le facteur « disponibilité des joueurs » est affiché comme non disponible plutôt que d'inventer une information.

---

## Jeu responsable

Les analyses sont statistiques ; aucune prédiction n'est certaine ; les performances passées ne garantissent pas les résultats futurs ; les paris comportent un risque de perte financière ; respectez les lois applicables. En France : **Joueurs Info Service — 09 74 75 13 13**.
