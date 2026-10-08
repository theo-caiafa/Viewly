# Contexte : Dev

> Mis à jour le 8 octobre 2026, à partir des conversations Dev du 27 septembre au 8 octobre. L'état détaillé est dans le [CHANGELOG](../../CHANGELOG.md) et sur Notion ("Prochaines étapes", "Journal des décisions", "Architecture & stack technique").

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

- Le `package.json` est à la racine du dépôt (plus de sous-dossier `Viewly/Viewly`) : lancer les commandes npm directement depuis la racine.

<br><br>

## Ce qui est livré.

- Capture en vue complète ou par écrans, devices desktop, tablette et mobile avec résolutions personnalisables, qualité standard ou haute.

- Authentification HTTP basique optionnelle.

- Vidéo par écran (durée, échelle, simulation de survol, scroll vers l'écran suivant).

- Export PNG, WebP, PDF, zip adaptatif.

- Abandonné : la détection automatique d'animations (trop de faux positifs) et le sélecteur d'élément.

<br><br>

## En cours : import de médias.

Première piste du backlog UX research (priorité haute) : importer directement des images (maquettes, screenshots) plutôt que de passer uniquement par une URL. Code écrit et testé côté API (curl) et par build/lint/tests, **mais jamais vérifié dans un vrai navigateur** — pas encore committé.

- Toggle Source (URL / Média) dans la hero. En mode Média : glisser-déposer (sur toute la page, pas juste la zone de recherche) ou bouton Parcourir, multi-fichiers (max 10, 20 Mo/fichier, PNG/JPG/WebP).
- Device deviné par ratio largeur/hauteur contre les presets existants (`RESOLUTION_PRESETS`) ; si ambigu, choix manuel avant import. Rien n'est jamais rejeté pour un ratio non standard.
- Images importées : toujours réencodées en PNG, mêmes labels `device-n` que les captures, pas de `sourceContext` (donc pas de bouton vidéo, le serveur l'interdit déjà via une erreur 410).
- Bug trouvé et corrigé en cours de route : les images importées héritaient à tort du clamp "hauteur max + scroll" pensé pour le mode "vue complète" côté URL — un nouveau state `resultsSource` distingue maintenant d'où viennent les résultats affichés.

**À vérifier avant de considérer la fonctionnalité terminée** (checklist pour la reprise) :
1. Glisser-déposer n'importe où sur la page bascule en mode Média (pas seulement sur la barre de recherche).
2. Déposer plusieurs fichiers de formats différents (desktop + mobile) assigne le bon device à chaque fichier.
3. Un fichier au ratio non standard demande bien un choix manuel plutôt que d'être deviné à tort ou rejeté.
4. Le bouton vidéo n'apparaît pas sur les images importées.
5. Une image au format mobile s'affiche en entier, sans scroll, dans la galerie de résultats.

<br><br>

## Tâches issues de l'UX writing.

- Stocker les résultats dans le navigateur, sans compte.

- Détecter les réponses 401/403, 404 et 5xx du site et les signaler par une erreur, avec un bouton "capturer quand même" pour 404 et 5xx.

- Remplacer les détails techniques affichés (Playwright, ffmpeg) par un message de repli unique, supprimer le double préfixe "Impossible de…".

- Prévoir l'erreur "stockage du navigateur indisponible ou plein".

- Progression : signaux serveur pour chaque étape, indicateur global, tous les avertissements en liste, compteur d'écrans qui commence à 1.

Détail : `docs/ux-writing/erreurs.md` et `docs/ux-writing/progression.md`.
