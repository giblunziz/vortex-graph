# VorteX Graph — Technical Implementation Guide

## Architecture Overview

```
vortex-app.js                     ← Bootstrap — lance le module
│
├── modules/
│   └── mapper/
│       └── vortex-mapper.js      ← Module métier — pilote le cycle de vie
│
├── common/
│   ├── vortex-abstract-node.js   ← Classe abstraite — contrat commun des nodes
│   └── vortex-model-node.js      ← Node model — hérite d'AbstractNode
│
├── nodes/
│   ├── vortex-json-nodes.js      ← Nodes custom (JsonLoader, JsonPreview)
│   └── vortex-json-nodes.css     ← CSS spécifique aux json-nodes
│
├── components/
│   ├── sidebar/
│   │   ├── sidebar.js            ← Composant UI — catalogue de nodes
│   │   └── sidebar.css
│   ├── radial/
│   │   ├── radial.js             ← Composant UI — menu contextuel
│   │   └── radial.css
│   └── drop-selector/
│       ├── drop-selector.js      ← Composant UI — popup nodes compatibles
│       └── drop-selector.css
│
├── vortex-graph.js               ← Composant graphique — moteur du graph + interactions
├── vortex-viewport.js            ← Viewport — pan, zoom, transform
├── vortex-registry.js            ← Registre global des types de nodes
├── vortex-api-loader.js          ← Chargement des models depuis le backend
├── vortex-type-rules.js          ← Règles de compatibilité entre types (à brancher)
├── vortex-base.css               ← CSS core (grid, nodes, ports, widgets, links)
└── index.html                    ← Point d'entrée HTML (templates DOM)
```

---

## Responsabilités par composant

### vortex-app.js — Bootstrap

Responsabilité unique : construire le container DOM et instancier le module.

Ne connaît que le module. Ne connaît ni le graph, ni la sidebar, ni le radial.
Le module gère son propre cycle de vie.

---

### Module (vortex-mapper.js) — Pilote

Le module est le composant opérationnel. Il porte les use-cases et orchestre tout.

**Responsabilités :**
- Enregistrement des nodes (registerJsonNodes, loadModelsFromApi)
- Création du viewport et du graph
- Installation des composants UI (sidebar.install, radial.install)
- Logique métier de wiring via callback onLinkDrop (strategy pattern)
- Gestion des raccourcis clavier (DEL, Ctrl+S, Ctrl+O, Ctrl+A)
- Save/Load fichier (File System Access API) et auto-save (localStorage)
- Sérialisation module (wrape graph.serialize + viewport.serialize avec application/module metadata)
- Fournir les actions contextuelles au radial via getContextActions(target)

**Contrat avec les composants :**
- Expose `canvas`, `world`, `graph`, `viewport` pour les composants
- Expose `getContextActions(target)` pour le radial menu
- Expose `save()`, `load()`, `newGraph()` pour les actions utilisateur

**Ne fait PAS :**
- Ne dessine pas les nodes (délégué au graph)
- Ne gère pas les interactions graphiques (délégué au graph)
- Ne gère pas le pan/zoom (délégué au viewport)
- Ne gère pas le catalogue (délégué au registry)
- Ne connaît pas le DOM interne des nodes

---

### VortexViewport (vortex-viewport.js) — Pan/Zoom/Transform

Gère le viewport du canvas indépendamment du graph et du module.

**Responsabilités :**
- Pan (startPan déclenché par le graph quand clic sur le vide)
- Zoom (wheel event, centré sur la souris)
- Application du transform CSS (translate + scale) sur le world
- Mise à jour de la grille CSS (backgroundSize + backgroundPosition)
- Sérialisation/désérialisation du viewport (panX, panY, zoomLevel)
- Reset (newGraph)

**Contrat :**
- `registerEvents()` — initialise le wheel listener
- `startPan(e)` — déclenché par le graph lors d'un clic sur le vide
- `zoomLevel`, `panX`, `panY` — lus par le graph pour les calculs de position
- `serialize()` / `deserialize(viewport)` — état du viewport
- `reset()` — retour à l'état initial
- `onChange` callback — notifié après zoom (pour auto-save)

**Ne fait PAS :**
- Ne connaît pas les nodes ni les liens
- Ne gère pas les interactions (délégué au graph)

---

### VortexGraph (vortex-graph.js) — Composant graphique + Interactions

Le graph est le moteur graphique. Il gère le modèle, le rendu, et les interactions utilisateur.
Constructeur : `new VortexGraph(world, canvas, viewport)`

**Responsabilités modèle :**
- Gestion des nodes (Map id → instance clonée), links (array), selection (Set)
- Création de nodes via clone du descripteur (chaque instance est unique)
- Sérialisation/désérialisation (lit le modèle, pas le DOM)
- Tri topologique Kahn et execution engine (executePlan)
- Auto-wire par nom/type
- Notification onChange pour l'auto-save

**Responsabilités rendu :**
- Rendu DOM des nodes (drawNode) depuis le modèle
- Rendu SVG des liens (drawLink, updateLink, couleur par type)
- Gestion des ports (addPort, findPort, getPortCenter)
- Gestion des widgets (addWidget avec sync DOM → node.data.widgetValues)
- Sélection et highlight des nodes/liens
- Collapse toggle (met à jour node.collapsed puis le DOM)

**Responsabilités interactions :**
- Dispatch mousedown (port, resize, header, node, vide)
- Drag nodes (multi-sélection)
- Resize nodes
- Port drag (création de lien)
- Link redirect (clic sur port in connecté)
- Drop selector (via composant drop-selector)
- syncNodePosition : seul point de sync DOM → modèle (après move/resize)

**Contrat callbacks module :**
- `onChange` → notifié à chaque modification (auto-save)
- `onLinkDrop(fromPortData, toPortData)` → le module décide du wiring :
  - Retourne `[]` si le module gère lui-même (ex: autoWire)
  - Retourne `[{ fromNode, fromName, toNode, toName }]` pour des liens explicites
  - Si `null` (pas de callback) → createLink simple

**Ne fait PAS :**
- Ne décide pas des actions contextuelles (délégué au module)
- Ne gère pas le save/load fichier (délégué au module)
- Ne gère pas le pan/zoom (délégué au viewport)
- Ne porte pas les métadonnées module (application, module)

---

### AbstractNode (vortex-abstract-node.js) — Contrat des nodes

Classe abstraite qui définit le contrat commun de tous les nodes.

**Porte les éléments communs :**
- `id` — identifiant du type de node
- `x`, `y` — position sur le graph
- `width`, `height` — taille (null si auto)
- `collapsed` — état collapsed
- `mode` — active, inactive, bypass
- `ports[]` — liste des ports (partagée par ref, deep-copy si ports dynamiques)
- `properties: {}` — métadonnées propres au type (type, domain, category, businessTerm)
- `data: {}` — données runtime de CETTE instance (widgetValues, jsonRaw, etc.)

**Méthodes communes :**
- `addPort(name, hasIn, hasOut, type, businessTerm)` — ajoute un port
- `register()` — enregistre dans le registry global
- `clone()` — crée une instance propre (new this.constructor(), copie id/ports/properties)
- `serialize()` — retourne l'état commun (position, taille, collapsed, properties, data)
- `deserialize(saved)` — restaure l'état depuis les données sauvegardées
- `serializeData()` / `deserializeData()` — override pour données spécifiques

**Ne porte PAS :**
- Widgets (responsabilité de chaque sous-classe)
- Logique d'exécution (responsabilité de chaque sous-classe)
- Rendu DOM (responsabilité du graph)

---

### Nodes custom (nodes/) — Logique métier par type

Chaque node est 100% responsable de son initialisation et de sa logique.

**Responsabilités propres :**
- Déclarer ses widgets dans le constructeur
- Déclarer ses ports via addPort()
- Implémenter execute(inputs, nodeEl, node) si exécutable
- Stocker ses données dans this.data (pas dans le DOM)
- Charger son CSS spécifique dans registerXxxNodes()
- Override serializeData()/deserializeData() si le défaut ne suffit pas

**Exemples :**

ModelNode — node passif, pas d'execute, widgets optionnels (enum dropdown)
- properties: { type, domain, category, businessTerm }
- widgets: [] (rempli par l'api-loader pour les enums)

JsonLoaderNode — node actif, execute, widgets interactifs
- properties: { type, domain, category }
- widgets: button (Load File), readonly (file), text (root)
- data: { jsonRaw, jsonData, widgetValues: { file, root } }
- execute: lit node.data, applique root path, retourne json+data
- onLoadFile: stocke dans node.data, pas dans nodeEl._

JsonPreviewNode — node actif, execute, widget preview
- properties: { type, domain, category }
- widgets: preview
- cssClass: 'resizable-free', size: [350, 250]
- execute: met à jour le DOM preview (seule exception DOM car le preview EST du DOM)

---

### Components (components/) — UI réutilisables

Composants UI autonomes qui s'installent via install(module) ou install().

**Contrat commun :**
- `install(module)` ou `install()` — point d'entrée unique
- Charge son propre CSS dynamiquement (document.head.appendChild)
- Reçoit le module en paramètre pour accéder au graph, canvas, viewport, etc.

**Sidebar :**
- Construit l'arbre des nodes depuis le registry
- Gère la recherche/filtre
- Gère le drag & drop vers le canvas (utilise module.viewport.zoomLevel)
- Tous les niveaux collapsed par défaut

**Radial Menu :**
- Écoute contextmenu sur le canvas
- Résout le contexte (resolveTarget → canvas/node/selection/link)
- Appelle module.getContextActions(target) pour obtenir les actions
- Affiche le menu radial et dispatch les callbacks
- Ne connaît pas la logique métier — le module décide des actions

**Drop Selector :**
- Popup contextuelle après un drop de port dans le vide
- `show(x, y, type, direction, excludeType, onSelect)` — affiche les nodes compatibles
- `dismiss()` — ferme la popup
- Le graph appelle show() avec un callback onSelect
- Le composant ne connaît pas le graph — il appelle le callback avec le match sélectionné

---

### VortexRegistry (vortex-registry.js) — Catalogue

Registre global des descripteurs de nodes (templates).

- `registerNode(id, descriptor)` — enregistre un type de node
- `getNode(id)` — retourne le descripteur (template) pour clonage
- `getNodeTree()` — retourne l'arbre category > domain > nodes pour la sidebar
- `findCompatibleNodes(type, direction, excludeType)` — pour le drop selector

---

### vortex-api-loader.js — Bridge backend

Charge les ModelNodes depuis l'API backend et les enregistre dans le registry.

- Fetch `/api/vortex/models`
- Convertit chaque model API en ModelNode via apiModelToNode()
- Nettoie le vortexType (retire model_output legacy)
- Ajoute les widgets dropdown pour les enums
- Appelle node.register() pour chaque model

---

## Principes fondamentaux

### Le modèle est la source de vérité
Les données transitent par `node.data`, jamais par le DOM.
Le DOM est une vue qui se redraw depuis le modèle.
Le seul point de sync DOM → modèle est `syncNodePosition()` après move/resize.

### Chaque instance est unique
`appendNode()` clone le descripteur. Deux nodes du même type sur le graph sont deux instances distinctes avec leurs propres `data` et `properties`.

### Le module pilote, les composants servent
Le module décide de son cycle de vie, installe ses composants, fournit les actions contextuelles et les callbacks de wiring. Les composants (graph, viewport, sidebar, radial, drop-selector) ne prennent aucune décision métier.

### Autonomie des composants UI
Chaque composant charge son propre CSS dynamiquement. Pas de dépendance CSS dans index.html hormis le base. Le composant s'auto-installe via install(module).

### Héritage POO propre
AbstractNode porte le contrat commun. Chaque sous-classe est 100% responsable de son initialisation (widgets, ports, logique). Le clone() passe par new this.constructor() — les widgets sont recréés par le constructeur, pas deep-copiés.

### Séparation des responsabilités (SOLID/GRASP)
- Le graph ne sait pas ce qu'est un "Mapper" ou un "UseCase"
- Le module ne sait pas comment dessiner un node
- Le radial ne sait pas quelles actions existent
- Chaque node ne sait pas comment il est rendu
- Le viewport ne connaît ni les nodes ni les liens
- Le drop-selector ne connaît pas le graph — il retourne un callback
