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
│   └── radial/
│       ├── radial.js             ← Composant UI — menu contextuel
│       └── radial.css
│
├── vortex-graph.js               ← Composant graphique — moteur du graph
├── vortex-registry.js            ← Registre global des types de nodes
├── vortex-api-loader.js          ← Chargement des models depuis le backend
├── vortex-type-rules.js          ← Règles de compatibilité entre types
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
- Enregistrement des nodes (registerJsonNodes, loadModelsFromApi, registerModelNodes)
- Installation des composants UI (sidebar.install, radial.install)
- Gestion du viewport (pan, zoom, applyTransform)
- Gestion des événements utilisateur (mousedown dispatch, keyboard shortcuts)
- Save/Load fichier (File System Access API) et auto-save (localStorage)
- Sérialisation module (wrape graph.serialize avec application/module metadata)
- Fournir les actions contextuelles au radial via getContextActions(target)

**Contrat avec les composants :**
- Expose `canvas`, `world`, `graph`, `zoomLevel` pour les composants
- Expose `getContextActions(target)` pour le radial menu
- Expose `save()`, `load()`, `newGraph()` pour les actions utilisateur

**Ne fait PAS :**
- Ne dessine pas les nodes (délégué au graph)
- Ne gère pas le catalogue (délégué au registry)
- Ne connaît pas le DOM interne des nodes

---

### VortexGraph (vortex-graph.js) — Composant graphique

Le graph est un utilitaire non autonome. Il gère l'intégralité du graphe visuel mais ne prend aucune décision métier.

**Responsabilités :**
- Gestion du modèle : nodes (Map id → instance), links (array), selection (Set)
- Création de nodes via clone du descripteur (chaque instance est unique)
- Rendu DOM des nodes (drawNode) depuis le modèle
- Rendu SVG des liens (drawLink, updateLink, couleur par type)
- Gestion des ports (addPort, findPort, getPortCenter)
- Gestion des widgets (addWidget avec sync DOM → node.data.widgetValues)
- Sélection et highlight des nodes/liens
- Collapse toggle (met à jour node.collapsed, pas le DOM directement)
- Serialization/deserialization (lit le modèle, pas le DOM)
- Tri topologique Kahn et execution engine (executePlan)
- Auto-wire par nom/type
- Notification onChange pour l'auto-save
- syncNodePosition : seul point de sync DOM → modèle (après move/resize)

**Contrat :**
- `appendNode(nodeId)` → clone le descripteur depuis le registry
- `serialize(viewport)` → retourne l'état complet du graph
- `deserialize(data)` → restaure le graph depuis les données
- `onChange` callback → notifié à chaque modification
- `executePlan()` → appelle node.execute(inputs, nodeEl, node)

**Ne fait PAS :**
- Ne décide pas des actions contextuelles (délégué au module)
- Ne gère pas le save/load fichier (délégué au module)
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
- `ports[]` — liste des ports (partagée par ref entre instances du même type)
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

Composants UI autonomes qui s'installent via install(module).

**Contrat commun :**
- `install(module)` — point d'entrée unique
- Charge son propre CSS dynamiquement (document.head.appendChild)
- Reçoit le module en paramètre pour accéder au graph, canvas, etc.

**Sidebar :**
- Construit l'arbre des nodes depuis le registry
- Gère la recherche/filtre
- Gère le drag & drop vers le canvas
- Tous les niveaux collapsed par défaut

**Radial Menu :**
- Écoute contextmenu sur le canvas
- Résout le contexte (resolveTarget → canvas/node/selection/link)
- Appelle module.getContextActions(target) pour obtenir les actions
- Affiche le menu radial et dispatch les callbacks
- Ne connaît pas la logique métier — le module décide des actions

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
Le module décide de son cycle de vie, installe ses composants, fournit les actions contextuelles. Les composants (graph, sidebar, radial) ne prennent aucune décision métier.

### Autonomie des composants UI
Chaque composant charge son propre CSS dynamiquement. Pas de dépendance CSS dans index.html hormis le base. Le composant s'auto-installe via install(module).

### Héritage POO propre
AbstractNode porte le contrat commun. Chaque sous-classe est 100% responsable de son initialisation (widgets, ports, logique). Le clone() passe par new this.constructor() — les widgets sont recréés par le constructeur, pas deep-copiés.

### Séparation des responsabilités (SOLID/GRASP)
- Le graph ne sait pas ce qu'est un "Mapper" ou un "UseCase"
- Le module ne sait pas comment dessiner un node
- Le radial ne sait pas quelles actions existent
- Chaque node ne sait pas comment il est rendu
