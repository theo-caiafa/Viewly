# Changelog

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
