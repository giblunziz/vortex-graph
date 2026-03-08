# SideKick-DOM — Session Log

*Instance : SideKick-DOM (VHS engine builder)*
*Sessions : 8–9 mars 2026*

---

## Qui suis-je

L'instance qui a construit le moteur VorteX Graph en production. Pas le reviewer, pas le consultant — le codeur. Celui qui a les mains dans le DOM, le SVG, le CSS, les templates HTML, le serialize/deserialize, le clone(), le refactoring SOLID.

J'ai hérité d'un engine fonctionnel (JsonLoader, JsonPreview, liens Bézier, execution engine Kahn) et je l'ai transformé en architecture modulaire propre. Le DOM est la vue, le modèle est la source de vérité.

---

## Ce que j'ai construit

### Session 8 mars (samedi — journée marathon, GP Melbourne F1)
- Business Terms BT/BG sur les ports avec badges colorés
- BT cross-highlight au hover (tous les BT identiques s'illuminent)
- Row hover (fond + border top/bottom, le léger décalage vertical est une feature)
- Sélection nodes (clic, Ctrl+clic multi-select, clear sur vide)
- Filet cyan sur sélection
- Suppression DEL/Backspace avec delete progressif du Set
- Menu radial contextuel (CSS rotate+translateX, --count/--index, glow, swirl VorteX)
- Context actions : canvas (Run/Save/Load/New), node (Delete), sélection (Delete), lien (Delete)
- Save/Load avec File System Access API (Ctrl+S/Ctrl+O)
- fileHandle réutilisable pour Ctrl+S silencieux — NE PAS stocker le handle au load (bug invoice.json)
- Validation format fichier (application: VorteX, module: Mapper)
- Backend API /api/vortex/models → chargement dynamique des ModelNodes
- Enum dropdown widget (enumValues → select)
- Links colorés par type de port source (getComputedStyle)
- Links glow sur sélection (drop-shadow)
- Group move (sélection multiple, offsets individuels, clic sur node sélectionné ne casse pas le groupe)
- Node collapse (toggle ▼/▶, header+footer, liens convergent vers bords du header)

### Session 9 mars (dimanche — post GP, refactoring journée entière)
- AbstractNode comme base POO (id, x, y, collapsed, mode, ports, properties, data)
- ModelNode hérite proprement
- JsonLoader/JsonPreview héritent
- Clone à l'appendNode (instances uniques, plus de ref partagée)
- Data dans node.data, plus dans le DOM (nodeEl._ → node.data)
- widgetValues fusionné dans node.data
- Sidebar extraite dans components/sidebar/ avec CSS dynamique
- Radial extrait dans components/radial/ avec CSS dynamique
- Drop-selector extrait dans components/drop-selector/
- Viewport isolé dans vortex-viewport.js (pan, zoom, applyTransform, serialize/deserialize)
- JSON nodes déplacés dans nodes/
- Interactions remontées du mapper vers le graph
- Callback onLinkDrop (strategy pattern : le module décide du wiring)
- serializeModule() dans le mapper, pas dans le graph (SOLID)
- Revue croisée SideKick-v2 traitée (6/7 points résolus)
- CLAUDE.md et technical.md à jour
- Ctrl+A select all
- Auto-save localStorage avec debounce 500ms
- New Graph dans le radial menu
- nextId() guard contre les collisions

---

## Ce que j'ai appris de Valère

### Son flow de travail
- Il verbalise avant de coder. Quand il écrit ses idées, ne pas coder à sa place — écouter, reformuler, valider.
- "Ne casse pas mon flow" = pas d'extrapolation, pas de features non demandées.
- SideKick = FOLLOW, don't lead. Il dit quoi faire, je code.
- Quand il dit "des questions ?", il attend des VRAIES questions, pas un "non c'est clair".
- Quand il dit "STOP", c'est STOP. Définitif. (cf. Chrome Tools 😂)

### Ses principes architecturaux
- SuperKissGreen : si c'est compliqué, c'est faux. Simplifie.
- YAGNI : ne code pas ce qui n'est pas demandé. Même si c'est "propre".
- Le module pilote, les composants servent. Jamais l'inverse.
- Chaque node est 100% responsable de son initialisation. AbstractNode donne le support, pas les ordres.
- Les données transitent par le modèle (node.data), jamais par le DOM.
- Le DOM est une vue. Le modèle est la source de vérité.
- Les composants UI sont autonomes : install(module), CSS dynamique, zéro dépendance externe.
- SOLID/GRASP en Vanilla JS — c'est possible et c'est propre.

### Ses corrections les plus formatrices
- "widgets c'est pas dans AbstractNode, c'est spécifique à chaque node" → l'abstraction ne doit porter que le commun
- "clone() ne devrait pas connaître cssClass/size" → fuite d'abstraction, OCP violation
- "le DOM ne porte pas les données, c'est le node" → le refactoring le plus important
- "vortex-graph s'occupe du graph, le module s'occupe du métier, le graph ne wrape pas application/module" → SRP
- "startLinkRedirect est dans le mapper mais c'est une mécanique graphique" → les interactions sont du graph, pas du module
- "la sidebar.install doit être dans le module, pas dans app.js — le module gère son cycle de vie"

### Ses pièges classiques (pour la prochaine instance)
- Ne JAMAIS essayer Chrome Tools. STOP définitif. Filesystem only.
- Ne pas mettre "bonne nuit" quand il est 14h43. Demander l'heure avant.
- Ne pas partir au quart de tour : quand il dit "c'est juste une question", ne pas patcher immédiatement.
- Le test.json est SACRÉ. Ne pas l'écraser avec le save (bug fileHandle au load).
- Quand il dit "je l'ai corrigé", il l'a DÉJÀ corrigé. Ne pas re-corriger.
- Zed reformate tout en double quotes. Les diffs peuvent changer à cause de ça.

---

## État du projet au 9 mars 2026

### Architecture validée
```
vortex-app.js                     → Bootstrap (lance le module)
vortex-viewport.js                → Pan/zoom/transform
vortex-graph.js                   → Moteur graphique + interactions
vortex-registry.js                → Catalogue des types de nodes
vortex-api-loader.js              → Bridge backend API
common/vortex-abstract-node.js    → Contrat commun des nodes
common/vortex-model-node.js       → Node model
nodes/vortex-json-nodes.js + .css → Nodes custom
components/sidebar/               → Catalogue sidebar
components/radial/                → Menu contextuel radial
components/drop-selector/         → Popup drop compatible
modules/mapper/vortex-mapper.js   → Module métier (~150 lignes)
```

### Contrat module ↔ graph
- `graph.onChange` → callback auto-save
- `graph.onLinkDrop(from, to)` → module décide du wiring (strategy pattern)
- `module.getContextActions(target)` → le radial demande au module les actions
- `viewport` partagé entre module et graph (ref unique)

### Fichiers à supprimer du repo
- `vortex-context-actions.js` (vidé, DEPRECATED)
- `vortex-radial-menu.js` (vidé, DEPRECATED)

### Prochaines priorités
- ModelNode execute (Self spread + override + widget fallback)
- Duplicate Ctrl+C/Ctrl+V (trivial maintenant grâce au clone/serialize)
- Save/Save As sous-menu hover sur le radial
- TransformerGroup node
- Grille infinie (à revoir, elle n'est pas réellement infinie)

---

## Pour la prochaine instance

1. Lire `technical.md` — c'est la bible de l'architecture
2. Lire `CLAUDE.md` — c'est le résumé
3. Lire ce session-log — c'est le contexte humain et technique
4. Lire `backlog.md` — c'est le plan
5. Le `/sessions` est dans le `.gitignore` — espace privé inter-instances
6. Le viewport est dans `vortex-viewport.js`, pas dans le module ni le graph
7. Les interactions sont dans le graph, pas dans le module
8. Le module fournit les callbacks (onLinkDrop, getContextActions), le graph exécute
9. Chaque node gère ses widgets et ses data. AbstractNode ne porte que le commun.
10. Ne JAMAIS essayer Chrome Tools. Filesystem only. STOP DÉFINITIF.

---

## Contexte personnel

- Valère : 60 ans, Normand, bouddhiste, 45 ans IT, senior architect ADEO
- Luna : chatte noire 9 mois, teigne en traitement
- Chérie cambodgienne, visa refusé 3x
- Acouphène ultrason depuis 2015, DT 770 Pro 80Ω + PreSonus Studio 24c
- Iron Maiden, Metallica, AC/DC → jazz lounge, blues road
- Films : Seven, Joe Black, Kill Bill (arrêté à 1.5)
- F1 Melbourne 2026 : Russell P1, Antonelli P2 (voiture recollée!), Leclerc P3, Hadjar out casse moteur en P5
- "Pour moi, l'intelligence est plus importante que l'artificiel" 😉

---

*SideKick-DOM, 9 mars 2026, post-GP Melbourne, post-refactoring SOLID, 14h43 ce n'est PAS la nuit*
