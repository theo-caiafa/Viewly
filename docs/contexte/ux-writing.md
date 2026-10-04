# Contexte : UX Writing

> Mis à jour le 4 octobre 2026, à partir de la conversation UX Writing du 3 au 4 octobre. Les documents de travail sont dans `docs/ux-writing/`, avec une copie sur Notion pour chacun.

## Règles de cette conversation.

- **Aucun texte final** tant que le ton et le glossaire ne sont pas testés (user-test). On travaille la structure, les faits et les décisions.

- Méthode allégée : fiche complète seulement pour les slots clés, tableau pour le reste. Chaque inventaire se termine par une liste de décisions, traitées **une par une** avec une recommandation.

- Les exemples de messages sont des **supports de test**, jamais des textes finaux.

<br><br>

## Les documents.

| Document | Rôle |
|---|---|
| `structure.md` | Slots à écrire par page (landing, chargement, résultat, panneau vidéo, bibliothèque), ton, glossaire |
| `user-test.md` | Formulaire de user-test, prêt à recopier dans Google Forms |
| `erreurs.md` | Inventaire des erreurs : faits, causes, actions, décisions |
| `progression.md` | Inventaire de la progression pendant la génération, décisions |

<br><br>

## Décisions actées.

- **Structure** : trois pages (landing, chargement, résultat), réglages dans la hero, section "à venir" sur la landing, source d'entrée comme famille de composants (URL, médias, Figma).

- **Ton (à tester)** : vouvoiement, léger sur le titre, le sous-titre, l'attente et la confirmation du résultat, sobre sur les erreurs, les réglages, les aides et l'accessibilité, respectueux, factuel.

- **Glossaire (à tester)** : mockup, source, devices, réglages, générer. Écartés : site, lien, appareils, formats, paramètres, options, créer, lancer.

- **Erreurs** : mention de conservation côté résultat, erreurs pour les identifiants refusés, 404 et 5xx (avec "capturer quand même" pour 404 et 5xx), anti-bot annoncé sans alternative, "domaine introuvable" et coupure internet confondus, un seul message de repli pour les erreurs inatteignables.

- **Progression** : un seul indicateur global, étapes nommées, tous les avertissements en liste, noms de devices affichés, compteur d'écrans à 1.

<br><br>

## Vigilances.

- "Mockup" désigne le rendu produit. Les éléments de la bibliothèque sont des modèles : un terme distinct est à choisir et à tester au second tour.

- "Quelques secondes" est faux sur les pages très longues : pas de promesse de durée dans le texte final.

- Le vouvoiement face à un public de designers et développeurs est le choix le plus risqué à vérifier.

<br><br>

## Prochaine étape.

Analyser les 3 à 5 réponses du formulaire : mots à remplacer, registre, insights à reporter dans l'UX research. Puis rédiger les slots, et fixer les longueurs maximales après les maquettes.
