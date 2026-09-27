# Changelog

## 2026-09-27

- Fiabilisé la capture sur les sites à intro/preloader et à scroll-jacking (agences créatives type Awwwards, GSAP ScrollTrigger) : attente réelle de la stabilisation visuelle avant chaque screenshot au lieu d'un délai fixe, détection du scroll natif inopérant avec bascule automatique sur des wheel events simulés, et détection de fin de contenu robuste face aux animations en boucle (marquee, ticker).
- Ajout de résolutions personnalisables pour tablette et mobile (presets iPad/iPhone/Android + saisie libre), en plus de desktop qui l'avait déjà.
