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
    // 1. Build knownFields = tous les ports du node (sauf _Self)
    const knownFields = new Set(
        node.ports
            .filter(p => p.name !== '_Self')
            .map(p => p.name)
    );

    const _data = {};

    // 2. Si _Self est connecté, spread ses champs filtrés par knownFields
    if (inputs._Self != null) {
      for (const [key, value] of Object.entries(inputs._Self)) {
        if (knownFields.has(key)) {
          _data[key] = value;
        }
      }
    }

    // 3. Override par les inputs connectés (port par port)
    for (const field of node.ports) {
      if (!field.hasIn || field.name === '_Self') continue;

      const fieldName = field.name;

      if (inputs[fieldName] !== undefined) {
        _data[fieldName] = inputs[fieldName];
      }
      // Widget fallback
      else if (node.data.widgetValues && node.data.widgetValues[fieldName] !== undefined) {
        _data[fieldName] = node.data.widgetValues[fieldName];
      }
    }

    // 4. Fallback port widgets
    for (const port of node.ports) {
      if (port.widget && _data[port.name] === undefined && port.widget.value !== undefined) {
        _data[port.name] = port.widget.value;
      }
    }

    // 5. Propager _data à tous les outputs (y compris _Self)
    const outputs = {};
    outputs._Self = _data;

    for (const field of node.ports) {
      if (!field.hasOut || field.name === '_Self') continue;
      outputs[field.name] = _data[field.name] ?? null;
    }

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