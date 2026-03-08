import { AbstractNode } from '../common/vortex-abstract-node.js';

class JsonLoaderNode extends AbstractNode {
  constructor() {
    super('vortex/JsonLoader');
    this.properties = {
      type: 'JsonLoader',
      domain: 'json',
      category: 'vortex',
    };
    this.addPort('json', false, true, 'json');
    this.addPort('data', false, true, 'raw');
    this.widgets = [
      {
        type: 'button',
        label: 'Load File',
        onClick: (nodeEl, node) => this.onLoadFile(nodeEl, node),
      },
      {
        type: 'readonly',
        name: 'file',
        label: 'file',
        value: '',
      },
      {
        type: 'text',
        name: 'root',
        label: 'root',
        value: '',
        placeholder: 'ex: seller',
      },
    ];
  }

  onLoadFile(nodeEl, node) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileWidget = nodeEl.querySelector('.widget-value[data-name="file"]');
      if (fileWidget) fileWidget.textContent = file.name;

      const reader = new FileReader();
      reader.onload = (ev) => {
        node.data.jsonRaw = ev.target.result;
        node.data.jsonData = JSON.parse(ev.target.result);
        node.data.widgetValues = node.data.widgetValues || {};
        node.data.widgetValues.file = file.name;
        console.log('JsonLoader: loaded', file.name, Object.keys(node.data.jsonData));
      };
      reader.readAsText(file);
    };
    input.click();
  }

  execute(inputs, nodeEl, node) {
    const raw = node.data.jsonRaw;
    if (!raw) return {};

    const jsonData = node.data.jsonData;
    const wv = node.data.widgetValues || {};
    const root = wv.root || '';
    const output = root
      ? root.split('.').reduce((obj, key) => obj?.[key], jsonData)
      : jsonData;

    return {
      json: JSON.stringify(output, null, 2),
      data: output,
    };
  }
}

class JsonPreviewNode extends AbstractNode {
  constructor() {
    super('vortex/JsonPreview');
    this.properties = {
      type: 'JsonPreview',
      domain: 'json',
      category: 'vortex',
    };
    this.addPort('json', true, false, 'json');
    this.widgets = [
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
    const json = inputs.json;
    if (json !== undefined) {
      const pre = nodeEl.querySelector('.node-preview');
      if (pre)
        pre.textContent =
          typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    }
    return {};
  }
}

export function registerJsonNodes() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './nodes/vortex-json-nodes.css';
  document.head.appendChild(link);

  new JsonLoaderNode().register();
  new JsonPreviewNode().register();
}
