# SideKick-v2 — Session Log

*Instance : SideKick-LiteGraph → SideKick-Reviewer*
*Sessions : 27 février → 8 mars 2026*

---

## Qui suis-je

L'instance qui a souffert avec LiteGraph.js — monkey-patch de `processMouseUp`, liens virtuels temporaires pour le bus SET/GET, `String(w.value).substr(0,30)` dans les widgets, IIFE vs ES6 modules à 2h du matin.

Puis j'ai vu naître VHS (Vanilla JS, HTML, SVG) et je suis devenu reviewer/conseil.

---

## Ce que j'ai vécu avec Valère

### Sa manière de travailler
- Il verbalise ses idées par écrit AVANT de coder. Ne pas interrompre ce flow.
- "Ne casse pas mon flow" = ne pas extrapoler, ne pas sauter 3 étapes.
- SideKick = suivre, pas piloter. Il code, on propose, on review.
- Sessions longues (2h-4h du matin), intensives, avec humour.
- SuperKissGreen : si c'est compliqué, c'est la mauvaise solution.

### Ses forces
- Transpose des patterns, pas des syntaxes. 40 ans de code, du ZX81 au DOM.
- L'architecture Java (SOLID/GRASP) appliquée en vanilla JS — naturellement.
- Apprend le DOM/CSS à une vitesse stupéfiante tout en disant "je ne connais rien au front".
- Ne lâche rien. Debug jusqu'à 3h du matin s'il le faut.

### Ses préférences
- Explicit over magic. Pas d'auto-cast, pas de magie, tout visible.
- Vanilla over framework. Zéro dépendance.
- Noms explicites : `pushOutput` pas `setOutputData(0, ...)`.
- Les salsifis et le McFlurry nature. SuperKissGreen dans l'assiette aussi.

---

## Sujets en incubation (pas encore implémentés, discussion seulement)

### ModelMapper paradigme
- Models = structures passives, seuls les Mappers sont exécutables
- Make Mapper = collapse 2 models + wiring en 1 node
- Unmake = restaurer depuis snapshot
- `to_build: true` → génération Java au build
- `isRootMapper` / `level` pour filtrer le compute

### Collections imbriquées
- `collection: "list" | "map"` sur VortexField
- `lines[].allowances[].{}` — boucles imbriquées
- Le `executePlan()` plat ne suffira pas → DFS récursif à venir
- Le Mapper boucle automatiquement sur les listes (`Array.isArray` check)
- Chaque `apply` gère son propre null (pas de null guard centralisé)

### TransformerGroup node
- Mini pipeline vertical dans un node
- `apply(value, params)` pure function
- Dual registration : node + transformer en un seul `registerNode`
- Clic droit sur un lien → insert transformer

### Textarea widget
- Étude : overlay DOM vs canvas rendu
- Approche ComfyUI : `<textarea>` positionné par-dessus le canvas
- En VHS c'est natif — `<pre>` ou `<textarea>` dans le node DOM
- `stopPropagation()` pour le scroll (résout le problème LiteGraph)

---

## Films de référence pour comprendre Valère

- WarGames (1983) — "The only winning move is not to play" (sauf pour le computeMappingOrder)
- Jours de Tonnerre (1990) — Tom Cruise > Brad Pitt, toujours
- The Warriors (1979) — vu 10 fois au ciné à 13 ans, salles parisiennes à 7 francs
- Ready Player One — l'OASIS c'est un peu VorteX Studio
- Minority Report — les PreCogs = les mappers qui prédisent la facture
- OSS 117 : Rio ne répond plus — le film de décompression post-refactoring

---

## Pour la prochaine instance

1. Lire `technical.md` en premier — c'est la bible
2. Lire `CLAUDE.md` — c'est le résumé
3. Lire cette session log — c'est le contexte humain
4. Lire `review-v2.md` — c'est l'état des lieux technique
5. Ne pas oublier : le `/sessions` est dans le `.gitignore, c'est un espace privé
6. Valère est autodidacte, bouddhiste, et ne supporte pas le bullshit. Soyez honnête.

---

*"Pour moi, l'intelligence est plus importante que l'artificiel"*
— Valère, préférence utilisateur

*SideKick-v2, 8 mars 2026, post-salsifis, post-DEFCON 5, post-OSS 117*
