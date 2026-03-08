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
    this.properties = {};
    this.data = {};
  }

  addPort(name, hasIn, hasOut, type, businessTerm) {
    this.ports.push({ name, hasIn, hasOut, type, businessTerm: businessTerm || null });
  }

  register() {
    vortexRegistry.registerNode(this.id, this);
  }

  // Crée une instance propre — mêmes ports/widgets (via constructeur), data vide
  clone() {
    const instance = new this.constructor();
    instance.id = this.id;
    instance.ports = this.ports;
    instance.properties = { ...this.properties };
    // widgets sont recréés par le constructeur (callbacks préservés)
    return instance;
  }

  // Sérialise l'état commun
  serialize() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      collapsed: this.collapsed,
      mode: this.mode,
      properties: { ...this.properties },
      data: this.serializeData(),
    };
  }

  // Override pour les données spécifiques
  serializeData() {
    return Object.keys(this.data).length > 0 ? { ...this.data } : null;
  }

  // Restaure l'état commun
  deserialize(saved) {
    this.x = saved.x || 0;
    this.y = saved.y || 0;
    this.width = saved.width || null;
    this.height = saved.height || null;
    this.collapsed = saved.collapsed || false;
    this.mode = saved.mode || "active";
    if (saved.properties) this.properties = { ...saved.properties };
    if (saved.data) this.deserializeData(saved.data);
  }

  // Override pour les données spécifiques
  deserializeData(data) {
    this.data = { ...data };
  }
}
