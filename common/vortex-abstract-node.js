import { vortexRegistry } from "../vortex-registry.js";

export class AbstractNode {
  constructor(id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.width = null;
    this.height = null;
    this.collapsed = false;
    this.mode = "active"; // active, inactive, bypass
    this.ports = [];
    this.widgets = [];
  }

  addPort(name, hasIn, hasOut, type, businessTerm) {
    this.ports.push({
      name,
      hasIn,
      hasOut,
      type,
      businessTerm: businessTerm || null,
    });
  }

  register() {
    vortexRegistry.registerNode(this.id, this);
  }

  // Override dans les sous-classes pour sauvegarder les données spécifiques
  serialize(nodeEl) {
    return null;
  }

  // Override dans les sous-classes pour restaurer les données spécifiques
  deserialize(nodeEl, data) {
  }
}
