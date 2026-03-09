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
    // 1. Build knownFields = tous les ports INPUT du node (sauf _Self)
    console.log("execute in: ", node.id, inputs);
    const knownFields = new Set(
      node.ports
        .filter(p => p.hasIn && p.name !== '_Self')
        .map(p => p.name)
    );

    const _data = {};

    // 2. Si _Self est connecté, filtrer ses data par knownFields
    if (inputs._Self !== undefined) {
      for (const [key, value] of Object.entries(inputs._Self)) {
        if (knownFields.has(key)) {
          _data[key] = value;  // Propager SEULEMENT ce qu'on connaît
        }
      }
    }

    // 3. Itérer sur tous les ports INPUT
    for (const field of node.ports) {
      if (!field.hasIn || field.name === '_Self') continue;

      const fieldName = field.name;

      // 3a. Si input connecté, prendre la data du input
      if (inputs[fieldName] !== undefined) {
        _data[fieldName] = inputs[fieldName];
      }
      // 3b. Sinon si widget avec valeur, utiliser la valeur du widget
      else if (node.data.widgetValues && node.data.widgetValues[fieldName] !== undefined) {
        _data[fieldName] = node.data.widgetValues[fieldName];
      }
    }

    // Fallback port widgets — si pas de donnée en input, prendre la valeur par défaut du widget du port
    for (const port of node.ports) {
      if (port.widget && _data[port.name] === undefined && port.widget.value !== undefined) {
        _data[port.name] = port.widget.value;
      }
    }

    // Propager _data à tous les outputs (y compris _Self)
    const outputs = {};
    
    // _Self sortie = la donnée complète
    outputs._Self = _data;
    
    // Chaque field avec hasOut reçoit sa valeur
    for (const field of node.ports) {
      if (!field.hasOut || field.name === '_Self') continue;
      outputs[field.name] = _data[field.name] ?? null;
    }
    
    console.log("result out: ", node.id, outputs);
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
