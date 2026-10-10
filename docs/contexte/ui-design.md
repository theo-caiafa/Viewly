# Contexte : UI Design

> Mis à jour le 4 octobre 2026. **Décision du 4 octobre : le visuel est refait entièrement, de zéro.** Les propositions Landing1 à Landing7 du Figma sont oubliées. L'historique des anciens choix ci-dessous sert de mémoire, pas de contrainte.

## Principe.

Théo refait **entièrement** le visuel de l'interface, y compris l'identité. Le contenu texte vient de l'UX writing (`docs/contexte/ux-writing.md`), pas du design. Les textes dans les maquettes sont provisoires.

<br><br>

## Méthode proposée.

Adaptée du process UI/UX du vault (`process-ui-ux-pro-de-l-idee-au-handoff`, pas encore éprouvé).

| # | Étape | Livrable | État |
|---|---|---|---|
| 1 | Plan du site, parcours, fonctionnalités | [docs/plan-du-site.md](../plan-du-site.md) | Fait |
| 2 | **Identité** : personnalité de marque, références, logo, couleurs, typographies, validation sur 2 écrans clés | Identité v2 | Fait (voir plus bas) |
| 3 | **Design system** : couleurs, typographies, espacements, composants, états, variables Figma | Design system v1 | En cours (composants de base faits, voir plus bas) |
| 4 | Pages : landing, chargement, résultat, puis bibliothèque | Maquettes | En cours — **hero de la landing, pages de chargement et page de résultat validées le 10 octobre**, reste bibliothèque (non priorisée, en attente de cadrage produit) |
| 5 | Test : test des 5 secondes sur la landing, formulaire | Retours | À faire |

La liste des composants à dessiner est dans `docs/plan-du-site.md` (section "Composants à prévoir").

<br><br>

## Figma.

- Fichier : [Viewly](https://www.figma.com/design/F8110cY9OFBXE6qFw7rhuU/Viewly). À créer ou repartir d'une page vide pour la nouvelle version.

- Méthode de travail : **une duplication de frame par proposition** pour itérer sans écraser.

- Respecter la méthode de Théo pour l'auto layout et les textes.

- **Chaque élément texte créé dans Figma doit avoir son propre frame auto layout dédié, rien que pour lui.** Ne pas se contenter qu'un ancêtre plus haut dans la hiérarchie ait de l'auto layout : le texte a besoin de SON frame auto layout individuel comme parent direct, même si ce texte vit déjà dans une zone qui a par ailleurs de l'auto layout (ex. une ligne de swatches). Un texte ne doit jamais partager son frame parent direct avec d'autres éléments (swatches, icônes, autres textes).

- **Piège technique lié à la règle ci-dessus : `figma.createAutoLayout()` (et la création manuelle d'un frame auto layout) applique un fill blanc opaque par défaut.** Si ce frame sert uniquement de wrapper dédié à un texte (cf. règle ci-dessus) et qu'il est posé sur un fond non blanc (bouton coloré, carte sombre, etc.), ce fill blanc masque complètement le texte — qui reste correct dans les données (characters, fills, visible) mais invisible à l'écran, pouvant faire croire à un bug de rendu. Toujours vider explicitement `fills = []` sur un wrapper de texte créé pour cette seule raison, sauf si un fond est demandé intentionnellement.

<br><br>

## Contraintes qui restent valables.

- Pas de compte, pas de connexion, pas de tarifs.

- La landing met en avant l'usage de l'outil directement, sans discours vendeur. Le champ et les réglages sont dans la hero.

- Résolutions : un menu déroulant avec les presets, et la possibilité de modifier les nombres à la main.

- La génération ouvre une nouvelle page. Le chargement laisse place au résultat.

- Sur le résultat : un bouton vidéo à côté de "télécharger", avec "télécharger" davantage mis en avant. La vidéo est encore en test.

- Ton de l'interface (à tester) : chaleureux, direct, sobre.

<br><br>

## Identité v1 — décisions prises (4 octobre).

- **Personnalité de marque** : direct, confiant, net, accessible.

- **Typographie (version 4 octobre, remplacée le 9 octobre)** : Onest pour les titres, Inter pour le corps de texte.

<br><br>

## Identité v2 — nouvelle direction (9 octobre).

Théo a dessiné un logo (flèche/curseur en contour, style doodle/sticker, avec des pilules confettis multicolores) et un moodboard de références SaaS modernes. Nouvelle direction : **interface moderne, colorée, tech, minimaliste**, construite à partir du logo plutôt que l'inverse.

- **Logo** : une flèche stylisée en contour noir épais, accompagnée de 4 petites pilules colorées façon confettis, avec un wordmark "Viewly" assorti. Variantes à prévoir : symbole seul, wordmark seul, combiné (déjà esquissées dans Figma, à affiner).

- **Typographie** : **Nohemi** (Bold) pour le logo et les titres, **Inter** pour le corps de texte (inchangé). Les graisses de Nohemi pour les différents niveaux de titre restent à ajuster.

- **Couleur de marque : multicolore**, pas mono-bleu. Les 4 couleurs exactes du logo sont reprises comme bases de palette :
  - Bleu `#4593FF`
  - Rouge `#F83F61`
  - Jaune `#F2EB2A` (remplace l'ancien orange — sert aussi de couleur sémantique avertissement)
  - Vert `#68E44F`

  Règle actée : **une seule teinte par couleur, le sens (marque vs sémantique) vient du contexte**, pas d'une nuance séparée (ex. le même rouge sert de badge décoratif et de signal d'erreur).

- **Palette complète regénérée dans Figma** (page "Identité Visuel", fichier Viewly) : bleu, rouge, jaune, vert et gris, chacun en échelle de 11 paliers (50 à 950), toutes en variables Figma liées aux swatches.

- **Inspiration moodboard** : fonds clairs et aérés, badges de capacité en pilules colorées (une couleur par badge), cartes bento avec une carte noire d'accent, titres avec mots surlignés en couleur. Le moodboard est incomplet.

- **Moodboard : Théo reprend la main dessus directement** (9 octobre). Claude ne doit plus proposer, choisir ou modifier le contenu du moodboard (page "Moodboard" du Figma) de sa propre initiative, dans aucune session future — ni images, ni justifications, ni remplacement de lignes existantes. Si une tâche future touche incidemment au moodboard, demander confirmation avant d'y toucher.

<br><br>

## Design system v1 — composants faits (page "Design-Sytem", fichier Figma).

- **Bibliothèque d'icônes** : composants `icon/*` individuels à partir du set Reicon (duotone, MIT), chacun recentré sur la bounding box réelle du tracé (pas le viewBox déclaré par le SVG, qui peut être asymétrique) — convention à reproduire pour toute icône ajoutée plus tard.

- **Button** : component set complet (variants Style × Couleur × Taille × État), slot icône en instance-swap, propriété Texte, couleurs liées aux variables.

- **Input, Numeric Field, Dropdown, Chip** : component sets avec états (Default/Focus/Erreur/Désactivé/Rempli selon le composant). L'Input est en forme de pilule (radius 999) depuis la correction du 10 octobre, pas de slot icône (retiré pour éviter un doublon visuel avec le bouton "Lien" juste à côté dans la hero).

- **Résolution** : component set fonctionnel à 3 variants d'État (Fermé / Ouvert / Personnalisé), combine Dropdown + menu de presets + 2 champs numériques (Largeur/Hauteur) selon le moment. Prototype Figma câblé (clic sur un preset → ferme le menu ; clic sur "Personnalisé" → fait apparaître les champs).

- **Hero Input** : component set fonctionnel à 4 variants (Mode: Lien/Média × Qualité: Standard/Haute), avec labels "Source" et "Qualité" au-dessus de chaque groupe de Chips. Prototype câblé : cliquer la source ou la qualité inactive bascule vers le variant correspondant en conservant l'autre réglage.

- **Chip** : prototype câblé **directement sur le component set source** (État=Non-sélectionné ↔ État=Sélectionné au clic) — toute instance de Chip dans le fichier hérite automatiquement de ce comportement, pas besoin de re-câbler à chaque usage.

- **Limite connue : pas de vrai "radio group" en prototype Figma.** Quand plusieurs Chips forment un choix exclusif (ex. Échelle 100%/50% dans la modale Réglages vidéo), Figma ne permet pas qu'un clic sur un Chip désélectionne automatiquement son voisin via l'API de prototypage — chaque instance ne peut changer que son propre état. Le prototype Figma reste donc approximatif sur ces groupes (chaque chip togglable indépendamment) ; le vrai comportement "un seul actif à la fois" devra être géré au niveau du code, pas du prototype. Concerne au moins : Échelle (modale vidéo), et tout futur groupe de choix exclusif construit avec des Chips.

- **Piège technique découvert (icônes dans des instances)** : `resize()` ou `rescale()` appliqué à une instance de composant icône déjà modifiée au préalable peut laisser le contenu interne décalé (offset négatif, pas vraiment mis à l'échelle). Le fix fiable : supprimer l'instance cassée et en recréer une neuve depuis le composant source plutôt que d'essayer de corriger l'instance existante.

<br><br>

## Fixes à faire — pages de chargement (audit du 10 octobre).

Pages concernées : `Viewly-Chargement`, `Viewly-Annulé`, `Viewly-Erreur`, `Viewly-Réussi` (page "Pages" du Figma).

- [ ] **Faute d'accord** sur `Viewly-Annulé` : le titre dit "Génération annulé", devrait être "Génération annul**ée**".

- [ ] **Bouton "Retour" manquant sur `Viewly-Annulé`** : `Viewly-Erreur` a deux actions (Réessayer + Retour), `Viewly-Annulé` n'en a qu'une (Nouvelle génération). Decider si on ajoute Retour par cohérence.

- [ ] **Hiérarchie des boutons de reprise à clarifier** : "Nouvelle génération" (Annulé) et "Réessayer" (Erreur) se ressemblent trop visuellement (même style, même icône refresh) alors que le contexte diffère (reflex neutre vs reprise après échec). Envisager un style Primary pour Erreur (action urgente) et garder Ghost/Secondary pour Annulé.

- [ ] **Titre en Nohemi non appliqué sur `Viewly-Erreur`** : actuellement en Inter Bold (fallback posé pendant la session du 10 octobre, faute d'accès à Nohemi via l'API Figma Plugin). À reconnecter manuellement au style de texte Nohemi une fois la police chargée côté app. Vérifier aussi si Nohemi est bien appliquée sur les 3 autres titres (Chargement/Annulé/Réussi) pour cohérence.

- [ ] **Vérifier la cohérence de contenu entre les 4 écrans** : `Viewly-Chargement` a une Info Bar complète (compteur d'étape + texte + chevron ouvrant les erreurs/avertissements), les 3 autres n'ont qu'un titre + sous-titre simple sans repère d'étape. Confirmer si c'est le comportement voulu (états finaux n'ont plus besoin de détail de progression) ou s'il manque quelque chose.

<br><br>

## Anciens goûts de Théo (27-28 septembre, à reconsidérer).

- Une couleur orange (`F76927`) qui doit avoir un sens, la police Onest, pas de grotesque, letter spacing à 0 %.

- À éviter : un gros bloc noir, un fond de motif, des boutons de type "générer en…" (trop IA), des fonds gris foncé sur les boutons, trop de boutons noirs répétés.

- Navigation : logo centré, accès à la bibliothèque.

<br><br>

## Questions ouvertes.

- Faut-il un label sur le bouton vidéo ?

- Quel site montrer comme exemple de résultat dans la landing ? Reporté à quand le site sera fini.
