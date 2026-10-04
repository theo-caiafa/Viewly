# Reprendre le travail sur un autre ordinateur

> Un prompt par conversation (Dev, UX Research, UX Writing, UI Design). Le contexte détaillé de chaque thème est dans `docs/contexte/`, les prompts ne font que le charger.

## Mise en place (une seule fois par PC).

1. `git clone https://github.com/theo-caiafa/Viewly` puis ouvrir le dossier dans VS Code / Claude Code.
2. Dans `Viewly/Viewly` : `npm install`, puis `npx playwright install chromium`.
3. Le dossier `identity/` (polices) peut ne pas être sur GitHub : le copier à la main si besoin.

<br><br>

## À chaque reprise.

1. Sur l'ancien PC : demander `/checkpoint` en fin de session, puis pousser (accord explicite requis).
2. Sur le nouveau PC : `git pull`.
3. Ouvrir une conversation, coller le prompt du thème voulu.

<br><br>

## Les prompts.

| Thème | Prompt |
|---|---|
| Dev | [prompt-dev.md](prompt-dev.md) |
| UX Research | [prompt-ux-research.md](prompt-ux-research.md) |
| UX Writing | [prompt-ux-writing.md](prompt-ux-writing.md) |
| UI Design | [prompt-ui-design.md](prompt-ui-design.md) |

<br><br>

## Limites.

- La mémoire automatique de Claude (`~/.claude/projects/...`) reste sur l'ancien PC. Les décisions importantes sont déjà dans `CLAUDE.md` et `docs/contexte/` : c'est eux la source de reprise.
- Une décision prise en conversation et pas écrite dans `docs/contexte/` n'est pas transférée : la consigner avant de changer de PC.
