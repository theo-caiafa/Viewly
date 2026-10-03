# Viewly : structure du contenu UX writing

Statut : squelette de travail, 3 octobre 2026. **Aucun texte final.** On liste ce qu'il faudra écrire, pas les mots. Le ton et le glossaire viendront d'une réflexion dédiée.

## Base de travail

- **Persona** : designer ou développeur qui doit produire des visuels de présentation de ses sites (portfolio, réseaux sociaux, présentation client).
- **Besoin** : produire ce rendu vite, avec moins d'effort que la méthode manuelle, en gardant le contrôle sur le format, la personnalisation et l'export.
- **Limite assumée** : base de recherche secondaire, pas d'entretiens directs. Le vocabulaire réel des utilisateurs est donc peu connu. Tout choix de mots reste provisoire.
- **Source** : page Notion "UX Research — Discover & Define" (à ne pas modifier depuis ce travail).

## Légende

| Symbole | Sens |
|---|---|
| 🔴 | Dépend de la recherche : ton, mots, promesse. À écrire après la réflexion sur le ton. |
| 🟡 | Le fond est fixe, la formulation dépend du ton. |
| ⚪ | Fonctionnel, à geler dès que le design est stable. |
| ⏳ | Fonctionnalité pas encore construite, slot à définir plus tard. |

## Décisions prises

- Structure en 3 pages : **landing**, **chargement**, **résultat**. Des pages s'ajouteront (bibliothèque, import, personnalisation d'export).
- Les réglages (mode, qualité, devices) sont dans la hero, près de l'URL, accessibles avant la génération.
- Ordre de lecture de la hero : titre, sous-titre, source d'entrée, réglages, bouton de génération.
- Vocabulaire : on dit **"mockup"** (provisoire). Risque : chez les designers, "mockup" peut aussi désigner la maquette de l'interface.
- La landing montre une section **"à venir"** (sources supplémentaires), car les fonctionnalités sont développées en parallèle.
- Méthode : on ne fait pas de fiche slot par slot. Fiches complètes seulement pour les slots clés, une ligne pour les évidents.

## Fiches des slots clés

**Bouton de génération (hero)**
- Contexte : l'utilisateur vient d'arriver, il ne connaît pas encore l'outil.
- Besoin : générer ses mockups sans perdre de temps (à vérifier).
- Fonction : inciter à agir. Le contexte est porté par le titre et le sous-titre.
- Contraintes : environ 1 mot, un seul état. Doit signaler une action immédiate, pas une navigation.

**Titre (hero)**
- Contexte : première chose lue. Deux lecteurs : celui qui sait déjà (il confirme) et celui qui découvre (il comprend).
- Fonction : identifier ce qu'est l'outil.
- Contraintes : 2 lignes maximum, gros et impactant (taille au design). Doit parler de "mockup". Mentionner "URL" est fragile : les futures sources (fichiers, Figma) vont le périmer. À arbitrer.

**Sous-titre (hero)**
- Contexte : il a lu le titre et reste, parce qu'il découvre.
- Fonction : motiver (gain de temps, moins d'effort, contrôle), sans répéter le titre.
- Contraintes : 2 lignes maximum, concis.

**Source d'entrée (hero)**
- Contexte : il comprend vite ce qu'il doit donner. Il donne sa source d'abord, il règle ensuite.
- Fonction : informer sur ce qu'on peut donner.
- Contraintes : textes très courts. Le composant change selon la source : un lien affiche un placeholder qui montre le format attendu, des médias affichent une zone de dépôt avec un texte d'invitation. Les formats acceptés vont probablement dans la zone de dépôt (à confirmer au design).

## Landing

| Slot | Rôle et contrainte | Dép. |
|---|---|---|
| Navigation et pied de page | Nom du produit, liens d'ancre, mentions. Très court. | 🟡 |
| Titre (hero) | Voir fiche. | 🔴 |
| Sous-titre (hero) | Voir fiche. | 🔴 |
| Boutons de source | Choisir le type de source (URL, médias, Figma à venir). 1 libellé très court par source. | 🟡 |
| Source URL : placeholder | Montrer le format attendu. Très court. | ⚪ |
| Source médias : zone de dépôt | Invitation à déposer + formats acceptés. 1 ligne + formats. | 🟡 |
| Source Figma | Lien ou connexion. Fonctionnalité à construire. | ⏳ |
| Réglages : mode de capture | Légende + 2 options. Libellés courts. | ⚪ |
| Réglages : qualité | Légende + 2 options. Libellés courts. | ⚪ |
| Réglages : devices | Légende + 3 noms + presets + "Personnalisé" + largeur/hauteur. | ⚪ |
| Réglages : aides | Ce que changent mode et qualité. Probablement au survol ou au clic. | 🟡 |
| Site protégé | Déclencheur + identifiant + mot de passe + note de sécurité. | 🟡 |
| Bouton de génération | Voir fiche. | 🔴 |
| Erreurs de saisie | URL invalide, source vide, fichier non accepté, résolution hors bornes (200 à 3840). Cause + action. | 🟡 |
| Section problème | La méthode manuelle pénible (capturer, adapter, Photoshop, exporter). | 🔴 |
| Section comment ça marche | Titre de section + 3 étapes (source, réglages, résultat). | 🟡 |
| Section usages | 1 bloc par usage : portfolio, réseaux sociaux, présentation client. | 🔴 |
| Section contrôle | Formats et export (PNG, WebP, PDF, ZIP). | 🟡 |
| Section à venir | Fonctionnalités annoncées. Pas de date. Statut : à venir / disponible / retiré. À mettre à jour avec le slot source quand une fonctionnalité sort. | 🔴 |
| Section objections (FAQ) | Confidentialité, sites protégés, limites. | 🟡 |
| Appel final | CTA de fin de page. | 🔴 |
| Méta | Titre de l'onglet, description, favicon. | 🔴 |

## Chargement

| Slot | Rôle et contrainte | Dép. |
|---|---|---|
| Titre d'état | Dire que la génération est en cours. | 🟡 |
| Étapes de progression | Par device : chargement, écran n sur total. Doivent correspondre à ce que fait vraiment le serveur. | ⚪ |
| Message d'attente longue | Au-delà d'environ 10 s, rassurer et informer. | 🟡 |
| Avertissements | 3 cas existants : scroll piloté en JavaScript (2 variantes), page longue. Non bloquants. | 🟡 |
| Annulation | Bouton + confirmation d'annulation + état annulé (avec ou sans relance). | 🟡 |
| Erreurs de génération | Familles : site bloquant (anti-bot), échec générique, génération expirée, connexion perdue, erreurs techniques à reformuler (ex. ffmpeg). Cause + action possible. | 🟡 |
| Erreur inconnue | Message de repli. | 🟡 |

## Résultat

| Slot | Rôle et contrainte | Dép. |
|---|---|---|
| Titre / confirmation | Dire ce qui a été produit. Absent aujourd'hui. | 🔴 |
| Groupes par device | Noms Desktop, Tablette, Mobile. | ⚪ |
| Libellé d'écran | "Écran N". | ⚪ |
| Alt des images | Texte accessible, par mockup et pour la lightbox. | ⚪ |
| Export : format | Libellé + noms de formats. | ⚪ |
| Export : actions | Télécharger un mockup, tout télécharger (zip), états de préparation. | 🟡 |
| Erreur d'export | Cause + action. | 🟡 |
| Lightbox | Aide à la fermeture. | 🟡 |
| Recommencer | Lancer une nouvelle génération. Absent aujourd'hui. | 🟡 |
| État vide / aucun résultat | Cas où aucune image n'est produite. Absent aujourd'hui. | 🟡 |

## Panneau vidéo (mode "par écrans")

| Slot | Rôle et contrainte | Dép. |
|---|---|---|
| Ouvrir / annuler | Déclencheur du panneau. | 🟡 |
| Durée | Label + presets + placeholder personnalisé + bornes (1 à 30 s). | ⚪ |
| Qualité | Label + options (dont "native"). | ⚪ |
| Mouvement | Scroll vers l'écran suivant + raison de l'état désactivé. | 🟡 |
| Survol | Déclencheur de recherche, état de chargement, option "aucun", cas "aucun élément trouvé" (absent aujourd'hui). | 🟡 |
| Lancer la capture | Bouton + état de capture en cours. | 🟡 |
| Résultat vidéo | Télécharger la vidéo, erreur vidéo. | 🟡 |

## Pages futures

Une page ajoutée = une section de plus dans ce document : bibliothèque de mockups, import par fichier, import Figma, personnalisation d'export. ⏳

## Glossaire provisoire

| Terme retenu | À éviter | Statut |
|---|---|---|
| mockup | visuel de présentation, maquette, capture | provisoire, à valider |

## Questions ouvertes

- Ton et voix : réflexion dédiée à faire (tutoiement ou vouvoiement, registre des erreurs).
- "URL" dans le titre ou le sous-titre ?
- Où écrire les aides de mode et qualité (survol, clic, landing) ?
- Où écrire les formats acceptés (zone de dépôt, aide) ?
- Section "à venir" : qui met à jour le statut quand une fonctionnalité sort ?
- Proportion de lecteurs qui connaissent déjà l'outil et de ceux qui le découvrent (hypothèse non vérifiée).

## Prochaines étapes

1. Relire ce tableau et corriger ce qui est faux.
2. Geler les slots ⚪ une fois le design stable.
3. Réflexion dédiée sur le ton et le glossaire.
4. Rédiger les slots 🔴 et 🟡, puis fixer les longueurs maximales après les maquettes.
5. Tester les textes (test des 5 secondes sur la hero, test de rappel).
