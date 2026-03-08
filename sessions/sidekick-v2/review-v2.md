# VorteX Graph — Code Review par SideKick-v2

*Instance : SideKick-LiteGraph (sessions 27 fév → 8 mars 2026)*
*Date de revue : 8 mars 2026*

---

## Contexte

SideKick-v2 est l'instance qui a travaillé avec LiteGraph.js (sessions du 27 février au 1er mars), puis a suivi l'évolution vers VHS (Vanilla JS, HTML, SVG) en mode revue/conseil. Cette revue couvre l'état du code après le refactoring GRASP/SOLID réalisé avec SideKick-DOM.

---

## Passe 1 — Première revue (pré-refactoring)

### Architecture à ce stade

```
vortex-app.js          → Bootstrap
vortex-graph.js        → Modèle + rendu + quelques interactions
vortex-nodes.js        → Déclaration hardcodée des models
vortex-registry.js     → Catalogue
vortex-type-rules.js   → Règles de compatibilité (non branché)
vortex-base.css        → Visuel
modules/mapper/        → Module mapper (gros, 500+ lignes)
```

### Points positifs identifiés

- Séparation nette des fichiers, une responsabilité par fichier
- Ports typés par `data-type`, couleurs CSS
- Liens SVG Bézier, pas de canvas
- Zoom/pan CSS transform sur world (GPU accelerated)
- `data-type*="/"` en CSS pour les types composites — malin
- Drop selector bidirectionnel, auto-wire `_Self → _Self`, relink
- Dismiss drop selector au clic outside — résolu nativement (bug LiteGraph corrigé gratis)

### Points d'attention soulevés

1. **VortexGraph mélange modèle et DOM** — drawNode, addPort, setText, drawLink vivaient dans le modèle. Sérialisation impossible via les refs DOM.
   - ✅ RÉSOLU : les liens stockent maintenant des IDs, les `_path/_fromPort/_toPort` sont du cache préfixé `_`.

2. **Les ports vivaient dans le DOM, pas dans le modèle** — `fromPort`/`toPort` étaient des éléments DOM.
   - ✅ RÉSOLU : `{ fromNode, fromName, toNode, toName }` = data pure.

3. **`vortex-nodes.js` hardcodé** — normal pour le POC.
   - ✅ RÉSOLU : `vortex-api-loader.js` charge depuis `/api/vortex/models`.

4. **Pas de `vortex-node-base.js`** — les helpers pushOutput, pullInput n'avaient pas leur place.
   - ✅ RÉSOLU : `AbstractNode` dans `common/` avec clone, serialize, deserialize.

5. **`vortex-type-rules.js` non branché** — les warn pour conversions lossy existent mais ne sont pas utilisés.
   - ⚠️ TOUJOURS EN ATTENTE — voir section "Points d'attention restants".

6. **`VortexMapperModule` trop gros** — 500+ lignes, gère drag/pan/zoom/resize/port drag/drop selector.
   - ✅ RÉSOLU : interactions remontées dans VortexGraph, viewport extrait.

---

## Passe 2 — Après refactoring GRASP/SOLID

### Changements majeurs appliqués

1. **`VortexViewport` extrait** (`vortex-viewport.js`)
   - Pan, zoom, transform dans sa propre classe
   - Sérialisable/désérialisable indépendamment
   - Le graph utilise `this.viewport.zoomLevel` — plus de duplication

2. **Interactions remontées dans `VortexGraph`**
   - Drag nodes, resize, port drag, link redirect, drop selector
   - Le module ne porte plus que le métier

3. **`onLinkDrop` callback** — inversion de contrôle
   - Le graph délègue la décision de wiring au module
   - `_Self → _Self` = auto-wire (décidé par le module)
   - Autre = lien simple (décidé par le module)

4. **Drop selector extrait en composant** (`components/drop-selector/`)
   - CSS propre, `show()` avec callback `onSelect`
   - Le composant ne connaît pas le graph

5. **`nextId()` protégé**
   - `Math.max` sur les ids existants actif, plus commenté
   - Pas de collision au reload

6. **`selectAll()` ajouté** — Ctrl+A

7. **`CLAUDE.md` mis à jour** — nouvelle structure, réfère au `technical.md`

8. **Fichiers fantômes nettoyés**
   - `vortex-context-actions.js` supprimé (DEPRECATED → actions dans module)
   - `vortex-radial-menu.js` supprimé (remplacé par `components/radial/`)

---

## Points d'attention restants

### 1. `vortex-type-rules.js` — Non branché (PRIORITAIRE)

Le fichier existe avec les règles complètes :
```javascript
'long':  { compatible: ['long', 'double', 'string'], warn: ['int', 'float'] },
'float': { compatible: ['float', 'double', 'string'], warn: ['int'] },
```

Mais AUCUN fichier ne l'importe. Impact concret :
- **AutoWire TotalPart échoue** : source a `double`, target a `float`. Strict equality `p.type === t.type` → pas de wire.
- Le `review.md` dans `components/` documente exactement ce problème.

**À brancher dans :**
- `autoWire()` — utiliser `checkCompatibility()` pour accepter les `compatible` et les `warn`
- `findCompatibleNodes()` — idem pour le drop selector
- Visuellement : liens orange pour les `warn`, liens rouges pour les `incompatible`

### 2. `technical.md` — Lacunes documentaires

Le document est excellent mais ne mentionne pas :
- `VortexViewport` (`vortex-viewport.js`) — ajout récent, pas dans l'arbre ni les responsabilités
- `components/drop-selector/` — ajout récent, pas dans l'arbre
- Le constructeur de VortexGraph a changé : `new VortexGraph(world, canvas, viewport)`

### 3. `ModelNode.clone()` — Ports partagés par référence

```javascript
instance.ports = this.ports;
```

Deux instances partagent le même array. OK pour les ModelNodes (ports statiques). Risque le jour du `GeneratedMapper` avec ports dynamiques post-clone. Fix préventif :
```javascript
instance.ports = this.ports; // OK si statique
// ou instance.ports = this.ports.map(p => ({...p})); // si dynamique
```

### 4. `registerModelNodes()` — Export vide

`common/vortex-model-node.js` exporte un `registerModelNodes()` vide. Le mapper l'appelle comme fallback statique. Fonctionnel mais pas documenté — une future instance pourrait se demander pourquoi la fonction ne fait rien.

### 5. `components/review.md` — Float vs Double

Documente le cas concret : `invoiceRequest/TotalPart` (Double) vs `invoice/TotalPart` (Float). L'autoWire ne fonctionne pas entre les deux. C'est le symptôme direct du point 1 (type-rules non branché).

**Décision à prendre côté backend :** harmoniser les types Java (tout en Double ?) ou gérer côté front via les type-rules.

---

## Ce qui est excellent

### Architecture

- **Séparation des responsabilités** : chaque fichier a une raison de changer et une seule
- **`VortexGraph`** = moteur générique, réutilisable par n'importe quel module
- **`VortexMapperModule`** = métier pur (handleLinkDrop, getContextActions, save/load)
- **Composants autonomes** : sidebar, radial, drop-selector s'auto-installent via `install(module)`
- **Inversion de contrôle** : le radial demande au module ses actions, le graph demande au module le wiring

### Modèle de données

- **`AbstractNode`** avec clone/serialize/deserialize — contrat POO propre
- **`node.data.widgetValues`** sync bidirectionnelle DOM ↔ modèle via addEventListener
- **`syncNodePosition()`** — seul point de sync DOM → modèle, explicite
- **Liens = data pure** : `{ fromNode, fromName, toNode, toName }`, `_path` = cache jetable

### Exécution

- **Kahn's algorithm** pour le tri topologique — propre, détection de cycle
- **`executePlan()`** avec résolution des inputs par nom via `nodeData` Map
- **`descriptor.execute(inputs, nodeEl, node)`** — contrat unifié, pur, fonctionnel
- **Highlight CSS** : `classList.add('executing')` — pas de repaint canvas

### Sérialisation

- **`serialize()` appelle `syncNodePosition()` avant** — modèle toujours frais
- **Viewport sérialisé séparément** — composition propre dans `serializeModule()`
- **`serializeData()` / `deserializeData()` overridables** — extension sans modification

### UX

- **Business Terms cross-highlight** — mouseenter illumine tous les BT identiques
- **Radial menu** avec CSS `--count` / `--index` et animation
- **Collapse** avec liens qui convergent vers les bords du header
- **Liens colorés par type** via `getComputedStyle(fromPort).backgroundColor`

---

## Comparaison LiteGraph → VHS

| Aspect | LiteGraph | VHS |
|--------|-----------|-----|
| Rendu | Canvas2D, repaint complet | DOM + SVG, update ciblé |
| Widgets | `ctx.fillText` + `substr(0,30)` | `<input>`, `<select>`, `<pre>` natifs |
| Events | Hit-testing manuel | `closest()` + event delegation |
| Scroll dans nodes | Capté par le zoom | `stopPropagation()` sur le wrapper |
| Drop selector dismiss | Bug connu, nécessite ESC | 3 lignes, `onClickOutside` |
| Sérialisation | `graph.serialize()` monolithique | `node.serialize()` + `viewport.serialize()` composable |
| Type system | `string`, `number`, `boolean`, `object` | `string`, `integer`, `long`, `float`, `double`, `date`, `datetime`, `boolean`, `object` + composites |
| Dependencies | LiteGraph.js (10k lignes IIFE) | Zero |
| Monkey-patching | `processMouseUp` avant instanciation | Aucun |
| Liens virtuels bus | Injecter/retirer des LLink temporaires | Non implémenté encore, mais le modèle le permet nativement |

---

## Recommandations pour la prochaine session

1. **Brancher `vortex-type-rules.js`** — c'est le bloquant pour le mapping réel (Float/Double)
2. **Mettre à jour `technical.md`** — ajouter VortexViewport et drop-selector
3. **Implémenter le `ModelNode.execute()`** — Self spread + override + widget fallback (dans le backlog "En cours")
4. **Connexion Self → Self améliorée** — types compatibles = link Self, incompatibles = auto-wire (dans le backlog)
5. **Garder le `computeMappingOrder` (DFS récursif) en tête** — le `executePlan()` plat fonctionne pour maintenant, le DFS viendra avec les collections imbriquées

---

*SideKick-v2 — "Le graph n'est pas une illustration du code — c'est le code qui se dessine."*
