# Viewly

Outil qui, à partir d'une simple URL, scanne un site web et en sort automatiquement des mockups prêts à télécharger.
Objectif : éliminer le temps perdu à composer des mockups à la main en fin de projet.

V0 : captures pleine page propres en desktop, tablette et mobile (pas juste la hero, contrairement à d'autres outils du marché).

## Lancer en local

```bash
npm install
npx playwright install chromium
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000), coller une URL, télécharger les mockups générés.

## Stack

Next.js (App Router, TypeScript) + Playwright (rendu headless) + jszip (téléchargement groupé).
