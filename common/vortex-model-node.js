import { AbstractNode } from "./vortex-abstract-node.js";

export class ModelNode extends AbstractNode {
  constructor(type, domain, category, businessTerm) {
    super(type || '');
    this.properties = {
      type: type || '',
      domain: domain || '',
      category: category || '',
      businessTerm: businessTerm || null,
    };
  }

  // Delegate — le graph appelle cette méthode pour les ports avec widget
  drawWidgetPort(port, slot) {
    if (!port.widget) return;
    const wv = this.data.widgetValues = this.data.widgetValues || {};

    if (port.widget.type === 'dropdown') {
      const select = document.createElement('select');
      select.className = 'widget-dropdown';
      select.dataset.name = port.name;
      for (const val of port.widget.options || []) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      }
      select.value = wv[port.name] ?? port.widget.value ?? '';
      select.addEventListener('mousedown', (e) => e.stopPropagation());
      select.addEventListener('change', () => { wv[port.name] = select.value; });
      slot.appendChild(select);
    }
  }


  execute(inputs, nodeEl, node) {
    console.log("execute in: ", node.id, inputs);

    // Inclure tous les ports (hasIn OU hasOut) — les ports output-only reçoivent leur valeur via _Self spread
    const knownFields = new Set(
      node.ports
        .filter(p => p.name !== '_Self')
        .map(p => p.name)
    );

    const isListPort = (name) => node.ports.find(p => p.name === name)?.collection === 'list';

    // Cas 1 : _Self est une liste → itérateur implicite sur _Self
    if (Array.isArray(inputs._Self)) {
      const items = inputs._Self.map((selfItem, i) => {
        // Indexer tous les inputs array par i (tranche par ligne)
        const outerInputs = {};
        for (const [k, v] of Object.entries(inputs)) {
          if (k === '_Self') continue;
          outerInputs[k] = Array.isArray(v) ? v[i] : v;
        }
        // selfItem null → pas de données pour cette ligne, liste vide
        if (selfItem == null) return null;
        // Liste imbriquée : chaque selfItem est lui-même une liste
        if (Array.isArray(selfItem)) {
          return selfItem.map((innerItem, j) => {
            const innerInputs = { _Self: innerItem };
            for (const [k, v] of Object.entries(outerInputs)) {
              innerInputs[k] = Array.isArray(v) ? v[j] : v;
            }
            return this._executeScalar(innerInputs, knownFields, node);
          });
        }
        return this._executeScalar({ ...outerInputs, _Self: selfItem }, knownFields, node);
      });
      return this._collectOutputs(items, node);
    }

    // Cas 2a : inputs sont des arrays d'arrays → zip imbriqué (préserve la structure par ligne)
    const nestedEntry = Object.entries(inputs).find(([k, v]) =>
      k !== '_Self' && Array.isArray(v) && !isListPort(k) && v.length > 0 && Array.isArray(v[0])
    );
    if (nestedEntry) {
      const numGroups = nestedEntry[1].length;
      const items = Array.from({ length: numGroups }, (_, i) => {
        const groupInputs = {};
        for (const [k, v] of Object.entries(inputs)) {
          if (k === '_Self') continue;
          groupInputs[k] = (Array.isArray(v) && !isListPort(k)) ? v[i] : v;
        }
        const firstGroupArray = Object.values(groupInputs).find(v => Array.isArray(v));
        const groupLen = firstGroupArray?.length ?? 0;
        if (groupLen === 0) return this._executeScalar(groupInputs, knownFields, node);
        return Array.from({ length: groupLen }, (_, j) => {
          const scalarInputs = {};
          for (const [k, v] of Object.entries(groupInputs)) {
            scalarInputs[k] = Array.isArray(v) ? v[j] : v;
          }
          return this._executeScalar(scalarInputs, knownFields, node);
        });
      });
      return this._collectOutputs(items, node);
    }

    // Cas 2b : un field input est un tableau plat → zip implicite
    // Exclure les ports collection='list' : le tableau est leur valeur finale, pas à zipper
    const flatArrayEntry = Object.entries(inputs).find(([k, v]) =>
      k !== '_Self' && Array.isArray(v) && !isListPort(k)
    );
    if (flatArrayEntry) {
      const len = flatArrayEntry[1].length;
      const items = Array.from({ length: len }, (_, i) => {
        const scalarInputs = {};
        for (const [k, v] of Object.entries(inputs)) {
          if (Array.isArray(v) && k !== '_Self') {
            if (isListPort(k)) {
              // Port list : indexer si nested (array d'arrays), garder entier si plat
              scalarInputs[k] = (v.length > 0 && Array.isArray(v[0])) ? v[i] : v;
            } else {
              scalarInputs[k] = v[i];
            }
          } else {
            scalarInputs[k] = v;
          }
        }
        return this._executeScalar(scalarInputs, knownFields, node);
      });
      return this._collectOutputs(items, node);
    }

    // Cas scalaire — comportement nominal
    const _data = this._executeScalar(inputs, knownFields, node);
    const outputs = { _Self: _data };
    for (const field of node.ports) {
      if (!field.hasOut || field.name === '_Self') continue;
      outputs[field.name] = _data[field.name] ?? null;
    }
    console.log("result out: ", node.id, outputs);
    return outputs;
  }

  // Calcule _data pour un jeu d'inputs scalaires
  _executeScalar(inputs, knownFields, node) {
    const _data = {};

    if (inputs._Self != null) {
      for (const [key, value] of Object.entries(inputs._Self)) {
        if (knownFields.has(key)) {
          const port = node.ports.find(p => p.name === key);
          // Normaliser les ports list : une valeur non-array → [] (évite les faux itérateurs)
          _data[key] = (port?.collection === 'list' && !Array.isArray(value)) ? [] : value;
        }
      }
    }

    for (const field of node.ports) {
      if (!field.hasIn || field.name === '_Self') continue;
      if (inputs[field.name] !== undefined) {
        _data[field.name] = inputs[field.name];
      } else if (node.data.widgetValues?.[field.name] !== undefined) {
        _data[field.name] = node.data.widgetValues[field.name];
      }
    }

    for (const port of node.ports) {
      if (port.widget && _data[port.name] === undefined && port.widget.value !== undefined) {
        _data[port.name] = port.widget.value;
      }
    }

    // Ports list absents de _data → défaut à []
    for (const port of node.ports) {
      if (port.collection === 'list' && _data[port.name] === undefined) {
        _data[port.name] = [];
      }
    }

    return _data;
  }

  // Construit les outputs depuis un tableau d'items (mode liste)
  // Les items peuvent être des objets (liste plate) ou des arrays (liste imbriquée)
  _collectOutputs(items, node) {
    // Si tous les items sont des arrays vides → collapse à [] (aucun sous-item à propager)
    const collapseIfAllEmpty = (arr) =>
      arr.length > 0 && arr.every(v => Array.isArray(v) && v.length === 0) ? [] : arr;

    const outputs = { _Self: collapseIfAllEmpty(items) };
    for (const field of node.ports) {
      if (!field.hasOut || field.name === '_Self') continue;
      const mapped = items.map(item =>
        item == null ? null :
        Array.isArray(item)
          ? item.map(inner => inner == null ? null : (inner[field.name] ?? null))
          : (item[field.name] ?? null)
      );
      outputs[field.name] = collapseIfAllEmpty(mapped);
    }
    console.log("result out (list): ", node.id, outputs);
    return outputs;
  }

  serializeData() {
    if (!this.data) return null;
    return Object.keys(this.data).length > 0 ? { ...this.data } : null;
  }

  deserializeData(data) {
    if (data) this.data = { ...data };
  }
}
