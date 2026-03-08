import { AbstractNode } from "./vortex-abstract-node.js";

export class ModelNode extends AbstractNode {
  constructor(type, domain, category, businessTerm) {
    super(type);
    this.properties = {
      type,
      domain,
      category,
      businessTerm: businessTerm || null,
    };
  }
}

export function registerModelNodes() {}
