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
        onClick: (nodeEl) => this.onLoadFile(nodeEl),
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

  onLoadFile(nodeEl) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileWidget = nodeEl.querySelector(
        '.widget-value[data-name="file"]',
      );
      if (fileWidget) fileWidget.textContent = file.name;

      const reader = new FileReader();
      reader.onload = (ev) => {
        nodeEl._jsonRaw = ev.target.result;
        nodeEl._jsonData = JSON.parse(ev.target.result);
        console.log(
          'JsonLoader: loaded',
          file.name,
          Object.keys(nodeEl._jsonData),
        );
      };
      reader.readAsText(file);
    };
    input.click();
  }

  execute(inputs, nodeEl) {
    const raw = nodeEl._jsonRaw;
    if (!raw) return {};

    const data = nodeEl._jsonData;
    const rootInput = nodeEl.querySelector('.widget-input[data-name="root"]');
    const root = rootInput ? rootInput.value : '';
    const output = root
      ? root.split('.').reduce((obj, key) => obj?.[key], data)
      : data;

    return {
      json: JSON.stringify(output, null, 2),
      data: output,
    };
  }

  serialize(nodeEl) {
    return {
      jsonRaw: nodeEl._jsonRaw || null,
      jsonData: nodeEl._jsonData || null,
    };
  }

  deserialize(nodeEl, data) {
    if (data.jsonRaw) {
      nodeEl._jsonRaw = data.jsonRaw;
      nodeEl._jsonData = data.jsonData;
    }
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

  execute(inputs, nodeEl) {
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
