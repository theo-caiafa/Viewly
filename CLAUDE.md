@AGENTS.md

Ce projet a une page de suivi Notion : https://app.notion.com/p/3e0207130ab48023840ec8ef32a519f3 (dashboard du projet, avec les pages "Journal des décisions" et "Prochaines étapes").

Le dossier du projet est `Viewly/Viewly` (le `package.json` s'y trouve). Lancer les commandes npm depuis ce dossier.

## Façon de travailler avec Théo

Théo apprend l'UX en travaillant sur ce projet. Ces règles valent pour toutes les conversations, quel que soit le thème.

- **Guider, ne pas tout faire à sa place.** Expliquer simplement, avec des réponses courtes et faciles à comprendre. Si une explication devient longue ou confuse, la simplifier.
- **Une décision à la fois**, avec une recommandation et sa raison.
- **Annoncer avant de faire** pour tout changement de structure (dashboard, pages, refonte) ou tout gros chantier : décrire le plan de façon concise et attendre son accord.
- **Dire ce qui est vérifié et ce qui est une hypothèse.** Ne pas inventer de sources ou de chiffres.
- **Vérifier le travail avant de pousser.** Jamais de `git push` sans accord explicite. Proposer un `/checkpoint` (doc du repo, Notion, commit) à la fin de chaque tâche.
- **Notion** : lire la structure de la page avant d'ajouter ou de modifier, et relire le rendu après. Convention d'écriture : titres `## Titre.` suivis d'un séparateur, pages aérées (blocs vides entre les sections, espace entre les items de liste), callouts, tableaux, schémas Mermaid, zéro tiret cadratin partout. Convertir un tableau contenant des liens de pages en base de données transforme ces pages en lignes et remplace leur titre : à éviter.
- **Fichiers `.md` du repo** : mêmes principes. Sommaire en tête, `>` pour les encadrés, `<br><br>` pour l'espace entre sections (pas de lignes de séparation), schémas Mermaid.

## Règles du produit

- **Public** : designers et développeurs qui doivent produire des visuels de présentation de leurs sites (portfolio, réseaux sociaux, client). Besoin : un rendu rapide, avec moins d'effort que la méthode manuelle, et du contrôle sur le format, la personnalisation et l'export.
- **Pas de compte, pas de connexion, pas de tarifs.**
- **Résultats stockés dans le navigateur** : conservés à l'actualisation, perdus à la fermeture de la fenêtre. Le serveur ne garde pas les images à long terme.
- **Bibliothèque (future)** : catalogue de modèles prêts à l'emploi (scènes, devices, layouts), gratuits et libres d'usage commercial. Ce n'est pas un espace de résultats sauvegardés.
- **Pas juste la hero** : capturer la page complète. Progression par paliers : V0 (captures), V1 (zones), V2 (variantes de layout).
- **Sources futures** : import de médias divers, import direct depuis Figma, extension VS Code ou import de code.
- **Ton de l'interface (à tester)** : vouvoiement, léger sur le titre et l'attente, sobre sur les erreurs, les réglages et les aides, respectueux, factuel. Glossaire provisoire : mockup, source, devices, réglages, générer.

## Garde-fous

- Chaque conversation a son thème : Dev, UX Research, UX Writing, UI Design. Ne pas les mélanger.
- La page Notion "UX Research" et son miroir `docs/ux-research.md` ne se modifient que depuis la conversation UX Research.
- Aucun texte final d'interface avant le user-test du ton et du glossaire. Les textes actuels de l'interface ont été générés pour tester le côté technique, jamais réfléchis.

## Contexte par thème

Au début d'une conversation, lire le fichier correspondant au thème :

- Dev : `docs/contexte/dev.md`
- UX Research : `docs/contexte/ux-research.md`
- UX Writing : `docs/contexte/ux-writing.md`
- UI Design : `docs/contexte/ui-design.md`
