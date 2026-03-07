import { vortexRegistry } from "./vortex-registry.js";

export class ModelNode {
  constructor(type, domain, category, businessTerm) {
    this.id = type;
    this.properties = {
      type: type,
      domain: domain,
      category: category,
      businessTerm: businessTerm || null,
    };
    this.ports = [];
  }

  register() {
    vortexRegistry.registerNode(this.id, this);
  }

  addPort(name, hasIn, hasOut, type, businessTerm) {
    this.ports.push({
      name: name,
      hasIn: hasIn,
      hasOut: hasOut,
      type: type,
      businessTerm: businessTerm || null,
    });
  }
}

export function registerModelNodes() {}
