# SideKick-Haiku — Journal de Session

*Instance: SideKick-Haiku (Claude Haiku 4.5)*
*Rôle: Support + Implémentation pour VorteX Graph*
*Créé: 8 mars 2026*

---

## Contexte de travail

**Projet**: VorteX Studio (mapper visuel de graphes pour e-invoicing EN16931)
**Architecture**: Vanilla JS/SVG/CSS, backend Java/Spring Boot/MongoDB/Kafka
**Moteur frontend**: VHS (VorteX Graph System) — moteur DOM custom SVG
**Philosophie**: SuperKissGreen — simplicité, pas de magie, code explicite

---

## Principes clés (de Valère)

1. **Je suis SideKick, pas Lead**: Suivre, ne pas anticiper. Valère verbalise d'abord.
2. **"Ne casse pas mon flow"**: Pas d'extrapolation. Code ce qui est demandé, rien de plus.
3. **SuperKissGreen**: Si c'est complexe, c'est faux. Simplifier agressivement.
4. **Le modèle est source de vérité**: Données dans node.data, DOM est la vue. SRP partout.
5. **Chaque node gère son lifecycle**: Ports, widgets, logique d'exécution, sérialisation.
6. **Vanilla JS + DOM**: Pas de frameworks, pas d'abstractions qui fuient.

---

## Session 8-9 mars — ModelPreviewNode (✅ DONE)

### Réalisé
- ✅ Classe ModelPreviewNode (port `data` type `raw`)
- ✅ Widget `checkbox` (toggle iOS style) — pas d'IDs random, utiliser `node.id + '_' + widget.name`
- ✅ CSS toggle (pointer-events: auto, flex-shrink: 0, pointer-events sur input)
- ✅ État du widget persisté dans `node.data.widgetValues`
- ✅ Fonction `filterEmpty()` récursive (supprime {} et [])
- ✅ `contextActions()` pour clic-droit "Copier dans le presse-papiers"
- ✅ Label "Hide empty" maintenant cliquable via htmlFor
- ✅ Toggle ne bloque plus le collapse du node
- ✅ Sérialisation/désérialisation fonctionne (node.data en propriétaire)

### Bugs corrigés
- Label htmlFor lié correctement à l'input id
- Toggle qui consommait mousedown (ajouté pointer-events + stopPropagation au click)
- IDs random vs déterministes `node.id + '_' + widget.name`
- Collapse fonctionnel (stopPropagation sur checkbox + pointer-events auto)

---

## Priorités suivantes (du backlog)

🔥 **Prioritaire immédiat** (à faire):
1. **Brancher vortex-type-rules.js** (findCompatibleNodes + autoWire avec validation types)
2. **ModelNode.execute()** (spread _Self + retourner tous les fields)
3. **Logique Self ↔ Self** (Valère doit la verbaliser d'abord)
4. **Duplicate Ctrl+C/Ctrl+V** (trivial via clone/serialize)
5. **Save/Save As submenu hover** sur le radial

🟠 **Après (Prochain)**:
- TransformerGroup node (mini pipeline vertical)
- Transformers standalone (uppercase, trim, substring, etc)
- RadialMenu clic-droit sur lien → insert transformer

---

## Patterns et apprentissages

### Lifecycle des widgets
```
addWidget() crée → node.data.widgetValues stocke
drawNode() recrée depuis node.data.widgetValues
serialize() sauvegarde node.data
deserialize() restaure node.data
```

### Pattern des IDs
- IDs d'instance: `vn_1`, `vn_2` (générés par graph.nextId())
- IDs de widgets: `node.id + '_' + widget.name` (déterministe, ex: `vortex/ModelPreview_hideEmpty`)

### Propriété de la sérialisation
- Graph: serialize() → appelle node.serialize()
- Node: serialize() → retourne { x, y, width, height, collapsed, properties, data }
- Chaque node gère son schema de données via serializeData()/deserializeData()

---

## Vérifications qualité code

- ✅ Pas d'état random (utiliser node.id pour les IDs déterministes)
- ✅ Pas de données portées par le DOM (tout dans node.data)
- ✅ SRP: graph gère modèle + interactions, node gère lifecycle
- ✅ Explicite plutôt que malin (pas de getters/setters magiques)
- ✅ Vanilla JS (pas d'overhead framework)
- ✅ CSS propre: pointer-events, flex-shrink, transitions smooth

---

## Pour la prochaine instance

1. Lire ce fichier d'abord — contexte et principes
2. Style de Valère: verbalise → tu codes → valide
3. "Ne casse pas mon flow" — pas d'hypothèses
4. En cas de doute, demande — ne pas extrapoler
5. Tenir le backlog à jour en parallèle
6. Les IDs déterministes ne changent jamais (node.id + '_' + widget.name)

---

## ⚠️ NETTOYAGE TECHNIQUE — À FAIRE

**État actuel: SALE** 😂 (mais fonctionnel!)

Le système d'IDs a été patchifié pour que ça marche. Il faut **refactoriser proprement**:

### Refactoring des IDs

1. **Chaque node doit avoir un vrai ID basé sur son data-id** (vn_2, vn_3, etc.)
   - Actuellement: `node.id` = type du node (vortex/ModelPreview)
   - À faire: Stocker **instanceId** dans le node lui-même (ou le passer partout)
   - Impact: vortex-graph.js, tous les nodes, serialization

2. **Chaque widget doit avoir un ID basé sur instanceId + widget.name**
   - Actuellement: Calculé à la volée dans addWidget() avec `instanceId + '_' + widget.name`
   - À faire: Le widget lui-même devrait stocker son ID et son instanceId parent
   - Impact: addWidget(), tous les widgets (checkbox, text, preview, etc.)

3. **Refactoring désiré**:
   ```javascript
   // Actuellement (sale):
   input.id = instanceId + "_" + widget.name;  // Calculé à la volée
   
   // À faire (propre):
   // Node stocke son instance ID
   class VortexNode {
     constructor() {
       this.id = 'vortex/Type';  // Type du node (ne change pas)
       this.instanceId = null;   // À assigner par graph.drawNode(id)
     }
   }
   
   // Widget référence son parent
   widget.instanceId = instanceId;  // Dans addWidget()
   input.id = widget.instanceId + '_' + widget.name;
   ```

4. **Priorité**: Fais après les features principales. C'est du refactoring de code technique, pas d'UX.

---

**Qui est Valère?** Architecte senior ADEO, 60 ans, 45 ans d'IT, Normand, bouddhiste. Intelligence > Artificiel. N'aime pas Stambia et co — c'est pourquoi on construit VorteX.

---

*Dernière mise à jour: 8 mars 2026, après ModelPreviewNode ✅ + TODO nettoyage IDs*