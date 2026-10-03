# Changelog

## 2026-10-03

- Ajout de `docs/ux-research.md` (résumé Discover/Define/Develop avec schémas Mermaid, en miroir de la page Notion complète) et de `docs/ux-writing/structure.md` (squelette du contenu UX writing : slots à écrire par page, sans texte final tant que le ton n'est pas tranché).
- Décisions actées pour la structure UX writing : trois pages (landing avec hero et sections, chargement, résultat) ; réglages dans la hero, accessibles avant la génération ; source d'entrée traitée comme une famille de composants (URL, médias, Figma à venir) ; vocabulaire « mockup » (provisoire) ; section « à venir » sur la landing, mise à jour en parallèle du développement des fonctionnalités ; fiche complète pour les slots clés seulement, tableau pour le reste.
- Mise en forme de `docs/ux-writing/structure.md` alignée sur la convention d'écriture (sommaire, schémas Mermaid, maquette de la hero).
- Aucun changement de code. Ton et glossaire restent à définir avant toute rédaction.

## 2026-10-02 (suite)

- Ajout de tests unitaires pour `lib/jobs.ts` (store de jobs en mémoire) : création, lecture, mise à jour, annulation, progression, et expiration par TTL via les fake timers de Vitest.
- Corrigé la race condition de `getSharedBrowser()` : si plusieurs requêtes concurrentes constataient simultanément un navigateur déconnecté, chacune relançait Chromium et écrasait la promesse partagée, abandonnant un process orphelin. Un identifiant de lancement garantit maintenant qu'une seule relance est déclenchée et que les autres attendent la même instance.
- Re-testé en conditions réelles (capture par écrans, vidéo, détection de survol, export PNG/WebP/PDF/zip) après la réorganisation de `lib/` par domaine — aucune régression.

## 2026-10-02

- Mise en œuvre de la décision "propre" du jour : réorganisation de `lib/` par domaine (`lib/capture/` pour capture.ts, browserManager.ts, cookieBanners.ts, videoCapture.ts ; `lib/export/` pour imageFormat.ts, pdf.ts, zip.ts — jobs.ts et siteSlug.ts restent à la racine), CI GitHub Actions (lint + build + test à chaque push/PR sur `main`), et premier test unitaire (`siteSlug.test.ts`) pour poser le pattern.
- Corrigé au passage une vulnérabilité RCE critique dans Next.js (`next/og`, GHSA-vcvr-r3jv-pc5j, 16.2.0–16.3.5), découverte via `npm audit` en ajoutant Vitest — mise à jour vers 16.3.8.
- Décision : le projet, jusqu'ici purement perso, est désormais synchronisé avec un devoir de cours UX design — l'intention de travail passe de « rapide » à « propre ». Conséquences actées : tests unitaires au fil de l'eau sur `lib/` + tests end-to-end après chaque gros morceau, lint/tests automatiques via GitHub Actions à chaque push, et réorganisation à venir de `lib/` par domaine (`lib/capture/`, `lib/export/`).

## 2026-09-28

- Ajout de la capture vidéo (WebM) par écran en mode « par écrans » : durée et échelle réglables, simulation de survol (hover) sur les éléments interactifs détectés, et option pour filmer le scroll vers l'écran suivant plutôt que rester figé. Qualité alignée sur le choix standard/haute résolution des mockups (le deviceScaleFactor n'était pas propagé à la vidéo). Ré-encodage VP9 après capture pour corriger le bitrate bas imposé par défaut par Playwright.
- Refonte de l'export : un menu déroulant PNG / WebP / PDF pilote à la fois le téléchargement individuel et le zip groupé — chaque mockup devient son propre fichier dans le format choisi (le PDF combiné multi-pages a été retiré au profit d'un PDF par écran).
- Corrections suite à revue de code : messages d'erreur clarifiés quand la vidéo/le survol sont demandés sur un job en mode « vue complète », nettoyage périodique des jobs expirés (au lieu de dépendre du prochain job créé), et re-détection du scroll natif au moment du replay vidéo (au lieu de faire confiance à l'état observé pendant la capture initiale) pour les sites dont le scroll-jacking dépend d'une interaction préalable.

## 2026-09-27

- Fiabilisé la capture sur les sites à intro/preloader et à scroll-jacking (agences créatives type Awwwards, GSAP ScrollTrigger) : attente réelle de la stabilisation visuelle avant chaque screenshot au lieu d'un délai fixe, détection du scroll natif inopérant avec bascule automatique sur des wheel events simulés, et détection de fin de contenu robuste face aux animations en boucle (marquee, ticker).
- Ajout de résolutions personnalisables pour tablette et mobile (presets iPad/iPhone/Android + saisie libre), en plus de desktop qui l'avait déjà.
