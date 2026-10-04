# Contexte : Dev

> Mis à jour le 4 octobre 2026, à partir des conversations Dev du 27 septembre au 2 octobre. L'état détaillé est dans le [CHANGELOG](../../CHANGELOG.md) et sur Notion ("Prochaines étapes", "Journal des décisions", "Architecture & stack technique").

## Périmètre.

- Avancer sur les fonctionnalités **actuelles** : les peaufiner, corriger les bugs. Pas d'ajout hors scope ou mal défini, tant que l'UX research et l'UI design ne sont pas terminés.

- Le devoir de cours est centré sur l'UX, pas sur le code. Mais Théo veut un outil **réellement fonctionnel**, c'était son objectif avant même le devoir.

- Objectif de couverture : fonctionner sur le plus de types de sites possible (sites d'agences type Awwwards, animations, défilement piloté en JavaScript), en sachant que certains ne marcheront jamais.

<br><br>

## Qualité.

- **Tests unitaires** au fil de l'eau, sur `lib/`.

- **Tests de bout en bout** après un gros morceau ou plusieurs ajouts.

- Lint, build et tests tournent en CI (GitHub Actions) à chaque push et pull request sur `main`.

<br><br>

## Environnement (Windows).

- Un **seul** `npm run dev` à la fois : plusieurs instances font répondre le port 3000 tantôt par l'une, tantôt par l'autre, et la mémoire des générations se désynchronise.

- Si Chromium manque : `npx playwright install chromium`.

- Lancer les commandes depuis `Viewly/Viewly`.

<br><br>

## Ce qui est livré.

- Capture en vue complète ou par écrans, devices desktop, tablette et mobile avec résolutions personnalisables, qualité standard ou haute.

- Authentification HTTP basique optionnelle.

- Vidéo par écran (durée, échelle, simulation de survol, scroll vers l'écran suivant).

- Export PNG, WebP, PDF, zip adaptatif.

- Abandonné : la détection automatique d'animations (trop de faux positifs) et le sélecteur d'élément.

<br><br>

## Tâches issues de l'UX writing.

- Stocker les résultats dans le navigateur, sans compte.

- Détecter les réponses 401/403, 404 et 5xx du site et les signaler par une erreur, avec un bouton "capturer quand même" pour 404 et 5xx.

- Remplacer les détails techniques affichés (Playwright, ffmpeg) par un message de repli unique, supprimer le double préfixe "Impossible de…".

- Prévoir l'erreur "stockage du navigateur indisponible ou plein".

- Progression : signaux serveur pour chaque étape, indicateur global, tous les avertissements en liste, compteur d'écrans qui commence à 1.

Détail : `docs/ux-writing/erreurs.md` et `docs/ux-writing/progression.md`.
