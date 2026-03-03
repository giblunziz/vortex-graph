# VorteX Lab — Backlog

## ✅ Done
- Grille CSS infinie
- Pan (drag du fond) dans toutes les directions
- Zoom centré sur la souris (molette)
- Nodes depuis VortexRegistry
- Drag nodes compensé avec zoom
- Resize nodes
- Liens SVG courbes de Bézier
- Ports colorés par type (model, string, number, enum)
- Hover glow sur nodes et ports
- Templates HTML (vortex-node, vortex-port-row)
- ModelNode class + register()
- Création dynamique de nodes

## 🔥 Refactoring — Architecture
- Séparer vortex-app.js en modules (une responsabilité par fichier)
- VortexContext (comme ApplicationContext Spring)
- VortexEventBus avec emitAwait pour les phases d'init
- Event-driven initialization (VanillaBootstrap)
  - Chaque composant s'enregistre sur des phases via le bus
  - mapper-imports.js regroupe les imports
  - start(ctx) lance les phases en séquence
- Pattern strategy pour le mousedown (registre de drag strategies)
- vortex-dom-utils.js (setText, setData, removeIf, cloneTemplate, appendTo)
- vortex-id.js (générateur d'id séquentiel)
- Virer LiteGraph.js — remplacement complet par DOM+SVG+CSS

## 🔥 Features — Interaction
- Drag de port à port pour créer des liens interactifs
- Highlight des ports compatibles pendant le drag d'un lien
- Fade des ports incompatibles pendant le drag
- Drop selector (drag port dans le vide → popup nodes compatibles)
- Auto-wire by name (drag _Self → _Self)
- Suppression de liens (clic ou touche Delete)
- Suppression de nodes
- Multi-sélection de nodes (Shift+clic ou rectangle de sélection)
- Clic droit → menu contextuel

## 🔥 Features — Rendu
- Couleurs de nodes par domaine (data-domain → CSS)
- Label domaine au-dessus du node (comme onDrawForeground actuel)
- Node collapsed (toggle sur double-clic header)
- Formes différentes par type (box model, losange BPMN gateway, cercle BPMN event)
- Glowing border animé sur node en exécution (Kevin Powell style)
- Glow rouge pulsant sur node en erreur
- Auto-zoom sur ports lors du wiring
- Fisheye effect sur les ports proches du curseur (style dock macOS)
- Couleurs de liens par type de port
- Snap to grid

## 🔥 Features — Modules
- Structure par module (/core, /plugins, /modules/mapper, etc.)
- module.json (métadonnées, glowColor, status)
- CSS variables par module (--module-glow injecté depuis module.json)
- Splash screen VorteX Studio (4 cards modules)
- Chaque module a son propre executor
- Chaque module a son propre context avec catalogue et caches

## 🟠 Features — Data
- Chargement des models depuis l'API backend (/api/vortex/models)
- Sérialisation/désérialisation du graphe en JSON
- Sauvegarde/chargement de workflows
- Export PNG du graphe

## 🟠 Features — Nodes avancés
- Widgets dans les nodes (dropdown enum, textarea JSON preview)
- Nodes utilitaires (upper/lower/trim/regex/split)
- Bus Set/Get (plugin optionnel)
- Make Mapper (collapse couple source/target en Mapper node)

## 🧊 Ice
- Drag & drop .json sur canvas → load workflow
- Drag & drop .avsc sur canvas → Model node
- Onglets multi-graph
- Graph JSON dans métadonnées PNG
- Recherche de nodes sur canvas (Ctrl+F sur propre catalogue)
- Tips / "Did you know" sur la home page

## 📝 Notes techniques
- CSS : user-select: none sur les éléments draggables
- CSS : data-type^="model/" pour matcher tous les types model
- CSS : variables héritées dans le DOM, overridables localement
- DOM : closest() remonte au parent, fonctionne avec data-* selectors
- DOM : event delegation — un listener sur le container, pas sur chaque node
- DOM : createElementNS obligatoire pour les éléments SVG
- DOM : getBoundingClientRect() pour les coordonnées de ports
- SVG : pointer-events: none pour laisser passer les clics
- JS : closures pour capturer état dans les handlers drag/resize
- Piège : compenser zoomLevel dans le drag (diviser par zoomLevel)
- Piège : scrollLeft/scrollTop ne peut pas être négatif → utiliser translate
