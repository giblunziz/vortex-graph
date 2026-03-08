import { AbstractNode } from '../common/vortex-abstract-node.js';

class ModelPreviewNode extends AbstractNode {
  constructor() {
    super('vortex/ModelPreview');
    this.properties = {
      type: 'ModelPreview',
      domain: 'preview',
      category: 'vortex',
    };
    this.addPort('data', true, false, 'raw');
    this.widgets = [
      {
        type: 'checkbox',
        name: 'hideEmpty',
        label: 'Hide empty',
        value: false,
      },
      {
        type: 'preview',
        name: 'content',
        value: '',
      },
    ];
    this.cssClass = 'resizable-free';
    this.size = [350, 250];
  }

execute(inputs, nodeEl, node) {
    // Traiter tous les inputs (ports) — pas de _Self, on prend ce qui est connecté
    let input = undefined;
    for (const key in inputs) {
      if (key !== '_Self' && inputs[key] !== undefined) {
        input = inputs[key];
        break;  // Prendre le premier port avec data
      }
    }
    
    if (input === undefined) return {};

    // Cache le raw input (transitoire, pas persisté)
    if (!node.data) node.data = {};
    node.data._rawInput = input;

    // Appliquer le filtre et afficher
    this.updatePreview(nodeEl, node);

    return {};
  }

  updatePreview(nodeEl, node) {
    const input = node.data._rawInput;
    if (input === undefined) return;

    const wv = node.data.widgetValues || {};
    const hideEmpty = wv.hideEmpty || false;

    const filtered = hideEmpty ? this.filterEmpty(input) : input;
    const jsonStr = JSON.stringify(filtered, null, 2);

    const pre = nodeEl.querySelector('.node-preview');
    if (pre) {
      pre.textContent = jsonStr;
      pre.dataset.content = jsonStr;
    }
  }

  filterEmpty(obj) {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      if (obj.length === 0) return undefined;
      const filtered = obj.map(item => this.filterEmpty(item)).filter(v => v !== undefined);
      return filtered.length === 0 ? undefined : filtered;
    }
    const filtered = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = this.filterEmpty(value);
      if (cleaned !== undefined) {
        filtered[key] = cleaned;
      }
    }
    return Object.keys(filtered).length === 0 ? undefined : filtered;
  }

  contextActions(nodeId, graph) {
    return [
      {
        id: 'copy-preview',
        label: 'Copy',
        icon: '📋',
        callback: () => {
          const nodeEl = graph.world.querySelector('[data-id="' + nodeId + '"]');
          const pre = nodeEl?.querySelector('.node-preview');
          if (pre && pre.dataset.content) {
            navigator.clipboard.writeText(pre.dataset.content).then(() => {
              console.log('Preview copied to clipboard');
            }).catch(err => console.error('Copy failed:', err));
          }
        },
      },
    ];
  }

  serializeData() {
    return this.data && Object.keys(this.data).length > 0 ? { ...this.data } : null;
  }

  deserializeData(data) {
    if (data) this.data = { ...data };
  }
}

export function registerPreviewNodes() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './nodes/vortex-preview-nodes.css';
  document.head.appendChild(link);

  new ModelPreviewNode().register();
}