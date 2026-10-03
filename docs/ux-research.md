# UX Research : Discover & Define

> **Ce que c'est** : phase Discover/Define/Develop (cadre Double Diamond) appliquée au projet Viewly. Statut : Define et Develop bouclés le 3 octobre 2026.
>
> Document complet avec détail (benchmark concurrentiel, recherche secondaire, grille d'analyse) : [page Notion UX Research](https://app.notion.com/p/3ed207130ab48149bfd4e5620ed05fd4).

## Sommaire

- [Limite assumée](#limite-assumée)
- [Persona](#persona)
- [Problem statement](#problem-statement)
- [How Might We](#how-might-we)
- [Backlog de pistes (Develop)](#backlog-de-pistes-develop)
- [Comment chaque pièce découle de la précédente](#comment-chaque-pièce-découle-de-la-précédente)
- [Prochaine étape](#prochaine-étape)

<br><br>

Recherche UX menée sur le projet Viewly, dans le cadre du module UX Design (My Digital School) et du développement du produit. Suit le cadre Double Diamond (Discover, Define, Develop, Deliver, Design Council UK).

```mermaid
flowchart LR
    subgraph D1["Diamant 1 : le bon problème"]
        A[Discover<br/>recherche, benchmark] --> B[Define<br/>persona, problem statement]
    end
    subgraph D2["Diamant 2 : la bonne solution"]
        C[Develop<br/>How Might We, backlog] --> E[Deliver<br/>test de la direction retenue]
    end
    B --> C

    style A fill:#2d6b4a,color:#fff
    style B fill:#2d6b4a,color:#fff
    style C fill:#2d6b4a,color:#fff
    style E fill:#8a8780,color:#fff
```

**Statut** : Discover, Define et Develop bouclés le 3 octobre 2026. Deliver pas encore commencé (teste la piste retenue une fois priorisée côté implémentation).

<br><br>

## Limite assumée.

> Les entretiens directs prévus n'ont pas pu être menés (accès limité au terrain). Le persona et le problem statement ci-dessous s'appuient sur l'hypothèse de départ, un benchmark concurrentiel et une recherche secondaire (témoignages publics de designers sur des forums), pas sur des entretiens directs.
>
> À confronter à du vrai terrain si l'occasion se présente plus tard.

<br><br>

## Persona.

Un designer ou développeur qui doit produire des visuels de présentation de ses sites web, pour plusieurs usages : portfolio, réseaux sociaux (Behance, LinkedIn, Instagram), présentation client.

Besoin central : produire ce rendu rapidement, avec moins d'effort que la méthode manuelle, tout en gardant un contrôle sur le format, la personnalisation et l'export.

<br><br>

## Problem statement.

Un designer ou développeur a besoin de produire rapidement un visuel de présentation soigné de son site web (pour son portfolio, les réseaux sociaux ou un client), avec un contrôle fin sur le format et l'export, car le faire à la main (captures, Photoshop, mise en forme) prend trop de temps pour une tâche qui n'a pas de valeur créative en elle-même.

> **Point de vigilance** : Viewly ne fonctionne actuellement qu'à partir d'un site déjà en ligne (via URL), pas d'une maquette Figma pas encore développée ni de fichiers de code. Risque que le vrai besoin se situe à un autre stade du projet que celui couvert par l'outil aujourd'hui.

<br><br>

## How Might We.

Comment pourrions-nous réduire le temps et l'effort qu'un designer ou développeur passe à produire un visuel de présentation, afin qu'il reste plus de temps pour le travail créatif réel plutôt que pour une tâche mécanique répétitive ?

<br><br>

## Backlog de pistes (Develop).

| Piste | Public visé | Risque / limite | Priorité |
|---|---|---|---|
| Import de médias divers (pas seulement une URL de site en ligne) | Designers et développeurs | Portée vague ("médias divers"), à préciser | Haute |
| Import direct depuis Figma (lien ou export) | Designers surtout | Dépend de l'API Figma, complexité technique à vérifier | Haute |
| Import de fichiers de code / extension VS Code | Développeurs spécifiquement | Piste plus spécifique et complexe à construire en premier | Moyenne |

> La priorité "moyenne" de la piste développeurs ne reflète pas une importance moindre de ce public (le persona inclut "designer ou développeur" depuis le départ), seulement qu'il s'agit d'une piste plus complexe à construire en premier que les deux autres.

<br><br>

## Comment chaque pièce découle de la précédente.

```mermaid
flowchart TD
    P["Persona<br/>designer ou développeur qui présente ses sites"]
    PS["Problem statement<br/>besoin de produire vite, avec contrôle sur le format et l'export"]
    H["How Might We<br/>réduire le temps et l'effort de production"]
    B1["Piste : import de médias divers<br/>priorité haute"]
    B2["Piste : import depuis Figma<br/>priorité haute"]
    B3["Piste : import de code / extension VS Code<br/>priorité moyenne"]

    P --> PS --> H
    H --> B1
    H --> B2
    H --> B3

    style P fill:#2d5c4e,color:#fff
    style PS fill:#2d5c4e,color:#fff
    style H fill:#b5582e,color:#fff
    style B1 fill:#eeece6,color:#1c1b19
    style B2 fill:#eeece6,color:#1c1b19
    style B3 fill:#eeece6,color:#1c1b19
```

<br><br>

## Prochaine étape.

Mise en forme du document final pour le rendu de cours, en attente du brief exact du professeur.
