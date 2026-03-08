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
    this.widgets = [];
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

    // Fallback widgets — si pas de donnée en input, prendre la valeur du widget
  for (const w of this.widgets || []) {
    if (_data[w.name] === undefined && w.value !== undefined) {
      _data[w.name] = w.value;
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
}
