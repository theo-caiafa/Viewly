# Changelog

## 2026-10-10

- Design system Figma : composants fonctionnels supplémentaires (Résolution, Hero Input avec bascule Lien/Média et Qualité sur la même ligne, Chip, Dropdown, Numeric Field, Durée, Switch), prototype câblé (CHANGE_TO, overlays) et bibliothèque d'icônes recentrée sur la bounding box réelle des tracés.
- Pages de chargement (`Viewly-Chargement`, `Viewly-Annulé`, `Viewly-Erreur`, `Viewly-Réussi`) auditées et corrigées : faute d'accord sur « annulée », bouton Retour ajouté, hiérarchie des boutons clarifiée (Primary pour Erreur, Ghost pour Annulé), écran Erreur distinct de l'annulation (contexte et nature de l'erreur précisés).
- Page de résultat construite : mockups groupés par device, menu de format d'export, téléchargement groupé en zip, bouton vidéo par écran avec modale de réglages (durée, échelle, scroll, survol — valeurs alignées sur les constantes réelles de `app/page.tsx`), modale d'aperçu plein écran d'un mockup, recommencer.
- Corrigé `docs/plan-du-site.md` : l'import de médias était encore listé « à venir », alors qu'il est fait et testé depuis le 2026-10-08 — passé à « Existe » dans le tableau et le schéma du parcours.

## 2026-10-08

- Première piste du backlog UX research : import direct d'images (maquettes, screenshots) en plus de l'URL. Toggle Source dans la hero, glisser-déposer sur toute la page (ou bouton Parcourir), multi-fichiers (max 10, 20 Mo/fichier, PNG/JPG/WebP), device deviné par ratio largeur/hauteur avec choix manuel si ambigu — rien n'est rejeté pour un ratio non standard. Images réencodées en PNG, même convention de labels que les captures, pas de bouton vidéo (pas de site réel à renavigeure).
- Corrigé en cours de route : les images importées héritaient à tort du scroll pensé pour le mode "vue complète" côté URL.
- Testé par build, lint, tests unitaires (`lib/import/media.ts`) et par l'API (curl) ; **pas encore vérifié dans un vrai navigateur** — checklist de vérification dans `docs/contexte/dev.md`.
- Corrigé au passage une référence obsolète au sous-dossier `Viewly/Viewly` (le `package.json` est à la racine du dépôt depuis la réorganisation du 2 octobre) dans `docs/contexte/dev.md` et `docs/reprise/prompt-dev.md`.

## 2026-10-04

- Ajout de `docs/ux-writing/progression.md` : inventaire de la progression (ce que fait le serveur pendant une génération, ce que l'utilisateur voit, sans message rédigé). Constat principal : trois des cinq étapes réelles (démarrage, ouverture du site, préparation de la page) sont confondues sous un seul libellé « chargement », aucune progression n'est affichée en vue complète, le compteur d'écrans part de 0 et un seul avertissement reste visible.
- Décisions actées sur la progression : un seul indicateur global (sans détail par device), des étapes nommées (ouverture du site, préparation de la page, capture des écrans n sur N, finalisation), tous les avertissements distincts en liste, noms de devices affichés dans les avertissements, compteur d'écrans qui commence à 1. Ces choix demandent des signaux supplémentaires côté serveur.
- Ajout de fichiers de contexte pour reprendre le travail sur un autre PC : `CLAUDE.md` (façon de travailler, règles du produit, garde-fous entre conversations) et `docs/contexte/` avec un fichier par thème (dev, UX research, UX writing, UI design). Le contenu vient des conversations existantes ; la partie UI design reprend les messages du 27-28 septembre et reste à vérifier avec le Figma actuel.
- Ajout de `docs/plan-du-site.md` : plan du site, parcours principal, tableau des fonctionnalités (existe, en test, décidé, à venir, exclu), contenu de chaque page et liste des composants à prévoir, sans aucun texte d'interface. C'est l'étape 1 du process UI/UX du vault, adapté à Viewly.
- Décision : le visuel est refait entièrement, de zéro (landings 1 à 7 oubliées). Nouvel ordre : plan du site, identité (personnalité, logo, couleurs, typographies), design system, pages, test. `docs/contexte/ui-design.md` réécrit en conséquence ; les questions d'identité et de design se traitent dans la conversation UI Design.
- Aucun changement de code. Aucun texte final rédigé.

## 2026-10-03

- Ajout de `docs/ux-research.md` (résumé Discover/Define/Develop avec schémas Mermaid, en miroir de la page Notion complète) et de `docs/ux-writing/structure.md` (squelette du contenu UX writing : slots à écrire par page, sans texte final tant que le ton n'est pas tranché).
- Décisions actées pour la structure UX writing : trois pages (landing avec hero et sections, chargement, résultat) ; réglages dans la hero, accessibles avant la génération ; source d'entrée traitée comme une famille de composants (URL, médias, Figma à venir) ; vocabulaire « mockup » (provisoire) ; section « à venir » sur la landing, mise à jour en parallèle du développement des fonctionnalités ; fiche complète pour les slots clés seulement, tableau pour le reste.
- Mise en forme de `docs/ux-writing/structure.md` alignée sur la convention d'écriture (sommaire, schémas Mermaid, maquette de la hero).
- Réécriture du `README.md` : schéma du pipeline, liste des fonctionnalités réellement présentes (modes de capture, devices, qualité, vidéo, export, sites protégés), prérequis, commandes, structure du projet, limites connues, roadmap (backlog UX research, puis détection de zones et variantes de layout, conservés tels quels) et liens vers la documentation.
- Ton de voix posé (vouvoiement, léger sur titre/sous-titre/attente/résultat mais sobre sur erreurs/réglages/aides/accessibilité, respectueux, factuel) et glossaire de 5 termes (mockup, source, devices, réglages, générer), ajoutés à `docs/ux-writing/structure.md`. Statut « à tester (user-test) » : rien n'est figé avant un test auprès de 3 à 5 designers ou développeurs.
- Ajout de `docs/ux-writing/user-test.md` : formulaire de user-test (Google Forms) qui sert deux recherches à la fois, la recherche UX (pratiques réelles de présentation d'un site) et le test du glossaire et du registre. Ordre fixé pour ne pas influencer les réponses (profil, expérience, leurs mots, puis nos choix), questions rédigées sans « tu » ni « vous » sauf les messages d'exemple A/B. Formulaire envoyé, en attente des réponses.
- Ajout de `docs/ux-writing/erreurs.md` : inventaire des erreurs (faits, causes réelles, actions possibles, sans message rédigé), issu de la lecture du code. Environ 35 chaînes d'erreur dans le code pour une quinzaine de situations réellement vécues par l'utilisateur.
- Décisions actées sur les erreurs : résultats gardés dans le navigateur (pas de compte, conservés à l'actualisation, perdus à la fermeture de la fenêtre) avec une mention de conservation ; identifiants refusés, pages 404 et 5xx signalés par une erreur, avec un bouton « capturer quand même » pour 404 et 5xx ; anti-bot annoncé sans alternative ; « domaine introuvable » et coupure internet confondus dans un seul message ; un seul message de repli pour les erreurs inatteignables, sans jamais afficher de détail technique.
- La bibliothèque future est définie comme un catalogue de modèles libres (scènes, devices, layouts), pas comme les résultats de l'utilisateur. Page ajoutée à `docs/ux-writing/structure.md` avec ses slots, plus deux slots côté résultat (mention de conservation, stockage indisponible). Vigilance de vocabulaire : « mockup » désigne le rendu produit, un terme distinct est à choisir pour les modèles de la bibliothèque.
- Aucun changement de code. Aucun texte final rédigé : les slots 🔴 et 🟡 attendent le user-test.

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
