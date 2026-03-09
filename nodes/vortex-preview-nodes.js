import { AbstractNode } from '../common/vortex-abstract-node.js';
import { WidgetFactory } from '../common/vortex-widget-factory.js';

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

drawWidgets(container, nodeEl) {
    if (!this.data) this.data = {};
    const wv = this.data.widgetValues = this.data.widgetValues || {};

    // Widget 1: Checkbox "Hide empty"
    const checkboxDom = WidgetFactory.createWidget('checkbox');
    const input = checkboxDom.querySelector('input');
    input.id = nodeEl.dataset.id + '_hideEmpty';
    input.checked = wv.hideEmpty ?? false;
    const label = checkboxDom.querySelector('label');
    label.htmlFor = input.id;
    label.textContent = 'Hide empty';
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('change', (e) => {
      wv.hideEmpty = e.target.checked;
      this.updatePreview(nodeEl);
    });
    container.appendChild(checkboxDom);

    // Widget 2: Preview (JSON display)
    const previewDom = WidgetFactory.createWidget('preview');
    const wrapper = previewDom.querySelector('.node-preview-wrapper');
    const pre = previewDom.querySelector('.node-preview');
    pre.textContent = '';
    this.previewEl = pre;  // Cache pour updatePreview()
    
    // Stoppage wheel event pour éviter zoom du viewport
    wrapper.addEventListener('wheel', (e) => e.stopPropagation());
    wrapper.addEventListener('mousedown', (e) => e.stopPropagation());
    
    container.appendChild(previewDom);
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
    this.updatePreview(nodeEl);

    return {};
  }

  updatePreview(nodeEl) {
    if (!this.previewEl) return;
    const input = this.data?._rawInput;
    if (input === undefined) {
      this.previewEl.textContent = '';
      return;
    }

    const wv = this.data.widgetValues || {};
    const hideEmpty = wv.hideEmpty || false;

    const filtered = hideEmpty ? this.filterEmpty(input) : input;
    const jsonStr = JSON.stringify(filtered, null, 2);

    this.previewEl.textContent = jsonStr;
    this.previewEl.dataset.content = jsonStr;
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
    if (!this.data) return null;
    // Exclure _rawInput (transitoire), garder widgetValues (persisté)
    const { _rawInput, ...persistedData } = this.data;
    return Object.keys(persistedData).length > 0 ? persistedData : null;
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