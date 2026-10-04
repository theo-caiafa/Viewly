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
| 2 | **Identité** : personnalité de marque, références, logo, couleurs, typographies, validation sur 2 écrans clés | Identité v1 | À faire |
| 3 | **Design system** : couleurs, typographies, espacements, composants, états, variables Figma | Design system v1 | À faire |
| 4 | Pages : landing, chargement, résultat, puis bibliothèque | Maquettes | À faire |
| 5 | Test : test des 5 secondes sur la landing, formulaire | Retours | À faire |

La liste des composants à dessiner est dans `docs/plan-du-site.md` (section "Composants à prévoir").

<br><br>

## Figma.

- Fichier : [Viewly](https://www.figma.com/design/F8110cY9OFBXE6qFw7rhuU/Viewly). À créer ou repartir d'une page vide pour la nouvelle version.

- Méthode de travail : **une duplication de frame par proposition** pour itérer sans écraser.

- Respecter la méthode de Théo pour l'auto layout et les textes.

- **Chaque élément texte créé dans Figma doit avoir son propre frame auto layout dédié, rien que pour lui.** Ne pas se contenter qu'un ancêtre plus haut dans la hiérarchie ait de l'auto layout : le texte a besoin de SON frame auto layout individuel comme parent direct, même si ce texte vit déjà dans une zone qui a par ailleurs de l'auto layout (ex. une ligne de swatches). Un texte ne doit jamais partager son frame parent direct avec d'autres éléments (swatches, icônes, autres textes).

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

- **Couleur de marque** : bleu, seule couleur de marque, décliné en échelle de nuances (pas de couleur secondaire). Base approximative `#2F7FFF`, à ajuster à la main. Le bleu apparaît en dégradé fort en haut du hero, qui s'estompe vers le bas pour faire ressortir la barre de recherche. Le reste de la page reste clair et aéré.

- **Palette complète posée dans Figma** (page "Identité Visuel", fichier Viewly) : bleu et gris en échelle de 11 paliers (50 à 950, usage large sur toute l'interface), vert (succès), rouge (erreur), orange (avertissement) en échelle réduite à 5 paliers (100, 200, 500, 600, 700), chacun en variables Figma liées aux swatches.

- **Typographie** : Onest pour les titres, Inter pour le corps de texte (labels, paragraphes, boutons).

<br><br>

## Anciens goûts de Théo (27-28 septembre, à reconsidérer).

- Une couleur orange (`F76927`) qui doit avoir un sens, la police Onest, pas de grotesque, letter spacing à 0 %.

- À éviter : un gros bloc noir, un fond de motif, des boutons de type "générer en…" (trop IA), des fonds gris foncé sur les boutons, trop de boutons noirs répétés.

- Navigation : logo centré, accès à la bibliothèque.

<br><br>

## Questions ouvertes.

- Faut-il un label sur le bouton vidéo ?

- Quel site montrer comme exemple de résultat dans la landing ? Reporté à quand le site sera fini.
