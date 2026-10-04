# Contexte : UI Design

> Mis à jour le 4 octobre 2026, à partir de la conversation UI Design du 27 au 28 septembre. **À vérifier avec le fichier Figma actuel** : la dernière activité de cette conversation date du 28 septembre, et le design a pu évoluer depuis.

## Principe.

Théo refait **entièrement** le visuel de l'interface. Le contenu texte vient de l'UX writing (`docs/contexte/ux-writing.md`), pas du design. Les textes présents dans les maquettes sont donc provisoires.

<br><br>

## Figma.

- Fichier : [Viewly](https://www.figma.com/design/F8110cY9OFBXE6qFw7rhuU/Viewly)

- Méthode : **une duplication de frame par proposition** (Landing5, Landing6...) pour itérer sans écraser. Landing6 sert de base pour les pages suivantes. Landing7 a été essayée puis abandonnée.

- Respecter la méthode de Théo pour l'auto layout et les textes, telle qu'elle apparaît dans la hero.

<br><br>

## Choix de design connus.

- **Couleur** : un orange, choisi par Théo (`F76927`). Il doit avoir un sens, pas être décoratif.

- **Typographie** : Onest. Pas de grotesque. Letter spacing à 0 %. Tailles de texte très contrastées et contraste sur les mots du sous-titre.

- **À éviter** : un gros bloc noir dans la page, un fond de motif, des boutons de type "générer en…" (ça fait "trop IA"), des fonds gris foncé sur les boutons, trop de boutons noirs répétés.

- **Navigation** : logo centré, accès à la bibliothèque. Pas de tarifs, pas de connexion.

- **Landing** : la page met en avant l'usage de l'outil directement, sans discours vendeur. Le champ URL est dans la hero, et les réglages doivent y être accessibles.

- **Résolutions** : un menu déroulant avec les presets, et la possibilité de modifier les nombres à la main. Une icône de menu sur chaque bouton de résolution.

- **Sections** : une section sur la vidéo ("faire bouger les écrans"), une section sur la bibliothèque de modèles. Les fonctionnalités présentées doivent être homogènes, de même longueur.

<br><br>

## Pages de génération.

- La génération ouvre une **nouvelle page**. L'état de chargement disparaît et laisse place au résultat quand la génération est finie.

- Sur le résultat : un bouton **vidéo** à côté de "télécharger", avec un contraste qui met "télécharger" davantage en avant. La fonctionnalité vidéo est encore en phase de test.

- Un menu de format d'export (PNG, WebP, PDF) qui pilote les téléchargements individuels et le zip.

<br><br>

## Questions ouvertes.

- Faut-il un label sur le bouton vidéo pour dire à quoi il sert ?

- Quel contenu mettre dans les exemples de mockups de la landing (un vrai design, de quel site) ? Reporté à plus tard, quand le site sera fini.
