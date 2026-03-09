import { AbstractNode } from '../common/vortex-abstract-node.js';
import { WidgetFactory } from '../common/vortex-widget-factory.js';

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
  }

  drawWidgets(container, nodeEl) {
    if (!this.data) this.data = {};
    const wv = this.data.widgetValues = this.data.widgetValues || {};

    // Widget 1: Button "Load File"
    const buttonDom = WidgetFactory.createWidget('button');
    const btn = buttonDom.querySelector('.widget-button');
    btn.textContent = 'Load File';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onLoadFile(nodeEl);
    });
    container.appendChild(buttonDom);

    // Widget 2: Readonly "file"
    const fileDom = WidgetFactory.createWidget('readonly');
    const fileLabel = fileDom.querySelector('.widget-label');
    fileLabel.textContent = 'file';
    this.fileWidget = fileDom.querySelector('.widget-value');
    this.fileWidget.textContent = wv.file || '';
    container.appendChild(fileDom);

    // Widget 3: Text "root"
    const textDom = WidgetFactory.createWidget('text');
    const textLabel = textDom.querySelector('.widget-label');
    textLabel.textContent = 'root';
    const textInput = textDom.querySelector('.widget-input');
    textInput.placeholder = 'ex: seller';
    textInput.value = wv.root || '';
    textInput.addEventListener('input', (e) => {
      wv.root = e.target.value;
    });
    container.appendChild(textDom);
  }

  onLoadFile(nodeEl) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        // Stocker PERSISTENTES dans node.data
        this.data.jsonRaw = ev.target.result;
        this.data.jsonData = JSON.parse(ev.target.result);
        this.data.widgetValues = this.data.widgetValues || {};
        this.data.widgetValues.file = file.name;
        
        // Mettre à jour le widget readonly
        if (this.fileWidget) this.fileWidget.textContent = file.name;
        
        console.log('JsonLoader: loaded', file.name, Object.keys(this.data.jsonData));
      };
      reader.readAsText(file);
    };
    input.click();
  }

  execute(inputs, nodeEl, node) {
    const raw = this.data?.jsonRaw;
    if (!raw) return {};

    const jsonData = this.data.jsonData;
    const wv = this.data.widgetValues || {};
    const root = wv.root || '';
    const output = root
      ? root.split('.').reduce((obj, key) => obj?.[key], jsonData)
      : jsonData;

    return {
      json: JSON.stringify(output, null, 2),
      data: output,
    };
  }

  serializeData() {
    if (!this.data) return null;
    // Persister widgetValues ET jsonData/jsonRaw
    return Object.keys(this.data).length > 0 ? { ...this.data } : null;
  }

  deserializeData(data) {
    if (data) this.data = { ...data };
  }
}

class JsonPreviewNode extends AbstractNode {
  constructor() {
    super('vortex/JsonPreview');
    this.properties = {
      type: 'JsonPreview',
      domain: 'preview',
      category: 'vortex',
    };
    this.addPort('json', true, false, 'json');
    this.cssClass = 'resizable-free';
    this.size = [350, 250];
  }

  drawWidgets(container, nodeEl) {
    // Widget: Preview (JSON display)
    const previewDom = WidgetFactory.createWidget('preview');
    const wrapper = previewDom.querySelector('.node-preview-wrapper');
    const pre = previewDom.querySelector('.node-preview');
    pre.textContent = '';
    this.previewEl = pre;  // Cache pour updates rapides
    
    // Stoppage wheel event pour éviter zoom du viewport
    wrapper.addEventListener('wheel', (e) => e.stopPropagation());
    wrapper.addEventListener('mousedown', (e) => e.stopPropagation());
    
    container.appendChild(previewDom);
  }

  execute(inputs, nodeEl, node) {
    const json = inputs.json;
    if (json !== undefined && this.previewEl) {
      this.previewEl.textContent =
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
