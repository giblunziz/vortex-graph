# Session — Implémentation `list:` dans ModelNode.execute()

**Date :** 2026-03-14
**Fichiers modifiés :** `vortex-api-loader.js`, `common/vortex-model-node.js`, `backlog.md`

---

## Contexte

VorteX Lab est un éditeur de graphes node-based (vanilla JS). Les nodes de type `ModelNode` sont chargés dynamiquement depuis une API backend (`/api/vortex/models`). Chaque node représente un modèle métier avec des ports typés. Certains ports ont un type préfixé `list:` (ex. `list:invoiceRequest/LineItemClassificationInformation`), indiquant une collection.

L'objectif de cette session : faire en sorte que `ModelNode.execute()` gère correctement les ports `list:`, en itérant implicitement sur les données sans nécessiter de nodes dédiés.

---

## Stratégie générale

### Principe fondamental : itérateur implicite
Pas de node `ListMap` ou de mécanisme explicite. Le `ModelNode` détecte lui-même la structure de ses inputs et adapte son mode d'exécution.

Règle : si les inputs contiennent un array, on itère. Sinon, on exécute en mode scalaire.

### Refactoring de `execute()` en 4 cas

```
execute(inputs, nodeEl, node)
│
├── Cas 1  : inputs._Self est un Array
│            → itérateur implicite sur _Self
│            → si selfItem est lui-même un Array → nested (liste de listes)
│
├── Cas 2a : un field input est un Array d'Arrays (nested)
│            → zip imbriqué — préserve l'isolation par ligne
│
├── Cas 2b : un field input est un Array plat
│            → zip classique sur la longueur du tableau
│
└── Cas scalaire : aucun array → comportement nominal
```

### Extraction de deux helpers

- **`_executeScalar(inputs, knownFields, node)`** : calcule `_data` pour un jeu d'inputs scalaires (spread `_Self` + override ports + widget fallback + default list ports)
- **`_collectOutputs(items, node)`** : construit les outputs depuis un tableau d'items (gère plat et nested)

---

## Modifications apportées

### `vortex-api-loader.js` — Parsing `list:` / `map:`

```javascript
let collection = null;
let type = field.vortexType;
if (type && type.startsWith("list:")) {
  collection = 'list';
  type = type.replace("list:", "");
} else if (type && type.startsWith("map:")) {
  collection = 'map';
  type = type.replace("map:", "");
}
const port = node.addPort(field.name, field.hasIn, field.hasOut, type || "object");
port.collection = collection;
```

`map:` est parsé mais non utilisé (YAGNI — pas de cas concret pour l'instant).

### `common/vortex-model-node.js` — Refactoring complet de `execute()`

**Cas 1 — `_Self` array :**
```javascript
if (Array.isArray(inputs._Self)) {
  const items = inputs._Self.map((selfItem, i) => {
    const outerInputs = {};
    for (const [k, v] of Object.entries(inputs)) {
      if (k === '_Self') continue;
      outerInputs[k] = Array.isArray(v) ? v[i] : v;  // indexer par i
    }
    if (selfItem == null) return null;
    if (Array.isArray(selfItem)) {
      return selfItem.map((innerItem, j) => {
        const innerInputs = { _Self: innerItem };
        for (const [k, v] of Object.entries(outerInputs)) {
          innerInputs[k] = Array.isArray(v) ? v[j] : v;  // indexer par j
        }
        return this._executeScalar(innerInputs, knownFields, node);
      });
    }
    return this._executeScalar({ ...outerInputs, _Self: selfItem }, knownFields, node);
  });
  return this._collectOutputs(items, node);
}
```

**Cas 2a — arrays d'arrays :**
Détection : `v.length > 0 && Array.isArray(v[0])` (et non-list port).
Exclut les ports `collection='list'` de la détection pour éviter de zipper des valeurs finales.

**Cas 2b — array plat :**
Détection : array non-list.
Pour les ports list dans la boucle : `(v.length > 0 && Array.isArray(v[0])) ? v[i] : v` (indexer si nested, garder entier si plat).

**`_executeScalar` — 4 passes :**
1. Spread de `_Self` → `_data` (avec `knownFields` pour filtrer, normalisation `non-array → []` pour ports list)
2. Override par les inputs de ports (`hasIn`)
3. Widget fallback
4. Default `[]` pour les ports `list` absents de `_data`

**`_collectOutputs` — collapse `[[], []]` → `[]` :**
```javascript
const collapseIfAllEmpty = (arr) =>
  arr.length > 0 && arr.every(v => Array.isArray(v) && v.length === 0) ? [] : arr;
```
Appliqué à `_Self` et à chaque output port.

---

## Problèmes rencontrés et résolutions

### 1. `notes` dupliqués dans la sortie
**Symptôme :** `notes: [{notes:{noteSubject:...}}, ...]` au lieu de `notes:[{noteSubject:...}, ...]`
**Cause :** Cas 2 entrait en mode zip sur `notes` (port list), itérant le tableau comme si c'était une série d'items.
**Fix :** Exclure les ports `collection='list'` de la détection Cas 2a et 2b avec `!isListPort(k)`.

---

### 2. `additionalItemProperties` avec values en arrays + duplication
**Symptôme :** `additionalItemProperties: [{name:["Rayon:"], value:["ECLAIRAGE"]}, ...]`
**Cause :** Dans le Cas 1 nested, `_executeScalar` recevait `inputs` non indexés → les arrays d'arrays passaient entiers au lieu d'être tranchés par `i` puis `j`.
**Fix :** Indexer `outerInputs` par `i` avant d'entrer dans la boucle nested, puis `innerInputs` par `j`.

---

### 3. `TypeError: Cannot convert undefined or null to object`
**Symptôme :** Crash dans `_executeScalar` sur `Object.entries(inputs._Self)` quand `_Self = null`.
**Cause :** La garde était `inputs._Self !== undefined` — ne couvrait pas `null`.
**Fix :** `if (inputs._Self != null)` (couvre les deux cas).

---

### 4. Ports list dans Cas 2b — tableau nested reçu entier au lieu de v[i]
**Symptôme :** `additionalItemProperties` recevait `[[{...}],[{...}]]` au lieu de `[{...}]` par ligne.
**Cause :** Dans Cas 2b, tous les arrays étaient indexés par `i`. Pour un port list, la valeur attendue est le sous-tableau `v[i]`, pas `v` entier — mais seulement si `v` est un array d'arrays.
**Fix :**
```javascript
scalarInputs[k] = (v.length > 0 && Array.isArray(v[0])) ? v[i] : v;
```

---

### 5. `classificationInformation: [{itemClassificationCode: null, ...}, {...}]` (2 objets vides)
**Symptôme :** `classificationInformation` produisait 2 objets vides au lieu de `[]` pour des lignes sans classification dans le JSON.
**Cause racine :** Chaîne de propagation de `null` / sous-listes vides :
- `classificationInformation` absent du JSON → non présent dans `_Self` spread → `undefined` dans `_data`
- `_collectOutputs` pour `LineItemInformation` produisait `[null, null]` (un null par ligne)
- `invoiceRequest/LineItemClassificationInformation` recevait `_Self: [null, null]` → les 2 nulls traversaient tous les nodes
- `invoice/LineItemClassificationInformation` sans `_Self` connecté recevait `itemClassificationCode: [null, null]` → Cas 2b zipait sur 2 items null → 2 objets null

**Fix en deux temps :**

**Étape 1 — Null safety dans `_collectOutputs` :**
```javascript
outputs[field.name] = items.map(item =>
  item == null ? null :
  Array.isArray(item)
    ? item.map(inner => inner == null ? null : (inner[field.name] ?? null))
    : (item[field.name] ?? null)
);
```
Évite le crash `TypeError: null[field.name]` et maintient la propagation sans exception silencieuse.

**Étape 2 (tentative échouée) — Default `[]` seul :**
Ajouter le default `[]` pour les ports list dans `_executeScalar` sans autre protection produit `[[], []]` au lieu de `[null, null]`. Le Cas 2a en aval détecte `Array.isArray(v[0])` = true pour `[[], []]` → zip de 2 groupes vides → 2 objets avec `{itemClassificationCode: [], itemClassificationSchema: []}`. Régression.

**Étape 3 — Solution finale : default `[]` + collapse `[[], []]` → `[]` :**
Le default `[]` dans `_executeScalar` assure que les ports list absents du JSON valent `[]` et non `undefined`.
Le collapse dans `_collectOutputs` assure que `[[], []]` (toutes sous-listes vides) est réduit à `[]` avant propagation, coupant la chaîne qui déclenchait Cas 2a à tort.

```javascript
const collapseIfAllEmpty = (arr) =>
  arr.length > 0 && arr.every(v => Array.isArray(v) && v.length === 0) ? [] : arr;
```

**Trace finale correcte :**
```
LineItemInformation._executeScalar     → classificationInformation: []   (default list)
LineItemInformation._collectOutputs    → classificationInformation: [[], []] → collapse → []
LineItemClassificationInformation._Self = []
→ Cas 1 avec array vide → items = [] → _Self: []
→ invoice/LineItemClassificationInformation → _Self: []
→ LineItemInformation.classificationInformation = []  ✓
```

---

## État final

| Feature | Statut |
|---------|--------|
| Parsing `list:` dans `vortex-api-loader` | ✅ |
| Itérateur implicite Cas 1 (_Self array) | ✅ |
| Nested Cas 1 (selfItem array) | ✅ |
| Zip Cas 2a (array d'arrays) | ✅ |
| Zip Cas 2b (array plat) | ✅ |
| Ports list gardés entiers en Cas 2b plat | ✅ |
| Default `[]` pour ports list absents du JSON | ✅ |
| Collapse `[[], []]` → `[]` dans `_collectOutputs` | ✅ |
| Null safety dans `_collectOutputs` et `_executeScalar` | ✅ |
| `map:` | ⏸ YAGNI (parsé, pas de cas concret) |

---

## Principes appliqués

- **YAGNI** : `map:` parsé mais non implémenté
- **Itérateur implicite** : pas de node `ListMap` dédié, la détection est basée sur la structure des données
- **Source de vérité** : `node.ports` (et leur `collection`) drive toute la logique de dispatch
- **Isolation par ligne** : les arrays indexés par `i` (puis `j` pour le nested) garantissent qu'une ligne n'influence pas les données d'une autre
