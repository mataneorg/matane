# 39. Text in accent and status colours keeps its contrast on Latte

Status: Accepted (2026-10-12). The mixes were measured in matane-anime (Matane's sibling app) per accent; not re-measured here.

## Context
Text drawn straight in an accent or a status colour (`text-primary`, `text-ctp-green`, `text-destructive` …) reads well on the dark flavors, but on Latte the pastel colours fall to 2.3 to 4.1:1 on the page and on their own tint, below the 4.5:1 that WCAG asks for. The muted text colour (`subtext0`) is 4.4:1 on Latte for the same reason.

## Decision
- **Tokens for coloured text.** `text-primary-text`, `text-success-text`, `text-warning-text`, `text-info-text` and `text-danger-text` (`--app-*-text` in `styles.css`). On the dark flavors they are the plain palette colours, so nothing changes there. On Latte they are the colour mixed with the Mocha crust (`#11111b`): 55% for the accent, green and peach, 65% for blue, 75% for red, which gives 4.8:1 or better on base, mantle, card and a 10 to 15% tint of the same colour.
- **Muted text** uses `--app-muted`: `subtext0` on the dark flavors, `subtext1` on Latte.
- **Text on a red fill** uses `--app-on-destructive` (`base` on Latte, `crust` elsewhere), and text on the lighter Latte accents uses the crust (`--app-on-accent`), because `base` on them is below 4.5:1.
- **Every `text-*` class in the renderer was moved to these tokens**, icons included. An icon that is a little darker on Latte costs nothing; telling icons from text by pattern would be fragile. Yellow has no token of its own and uses the warning one. Borders and fills keep the plain colours (`ctp-*`, `primary`, `destructive`).

## Consequences
- A new coloured text uses the `*-text` token, not `text-ctp-*`. Tailwind v4 silently drops a class whose token does not exist, so a typo shows up as uncoloured text.
- Latte looks a little darker and more muted than before in places; the dark flavors and AMOLED are unchanged.
