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
}

export function registerModelNodes() {}
