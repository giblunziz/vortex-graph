import { VortexGraph } from '../../vortex-graph.js';
import { VortexViewport } from '../../vortex-viewport.js';
import { WidgetFactory } from '../../common/vortex-widget-factory.js';
import { registerJsonNodes } from '../../nodes/vortex-json-nodes.js';
import { registerPreviewNodes } from '../../nodes/vortex-preview-nodes.js';
import { registerStringNodes } from '../../nodes/vortex-string-nodes.js';
import { registerNumberNodes } from '../../nodes/vortex-number-nodes.js';
import { loadModelsFromApi, loadMappersFromApi } from '../../vortex-api-loader.js';
import { registerUtilityNodes } from '../../nodes/vortex-utility-nodes.js';
import {registerTransformerGroupNode} from '../../nodes/vortex-transformer-group-node.js';
import { registerFoldNode } from '../../nodes/vortex-fold-node.js';
import * as sidebar from '../../components/sidebar/sidebar.js';
import * as radial from '../../components/radial/radial.js';
import * as picker from '../../components/picker/picker.js';
import { FoldNode } from '../../nodes/vortex-fold-node.js';
import {MapperReportManager} from "./mapper-report-manager.js";

import {MappingReport} from "./reports/mapping-report.js";
import {MappedOutConnectedReport, MappedOutReport} from "./reports/mapped-out-report.js";

import {ExpandInAction, ExpandOutAction} from './actions/expand-action.js';
import {BuildMapperAction} from "./actions/build-action.js";

export class VortexMapperModule {
  constructor(canvas, world, svg, baseUrl = "http://localhost:8080") {
    this.canvas = canvas;
    this.world = world;
    this.svg = svg;
    this.viewport = new VortexViewport(canvas, world);
    this.baseUrl = baseUrl;
    this.graph = new VortexGraph(world, canvas, this.viewport, this.baseUrl);

    this.graph.onChange = () => this.scheduleAutoSave();
    this.graph.onLinkDrop = (from, to) => this.handleLinkDrop(from, to);

    this.ready = this.init();
  }

  async init() {
    this.bootstrapWidgets();
    registerJsonNodes();
    registerPreviewNodes();
    registerStringNodes();
    registerNumberNodes();
    registerUtilityNodes();
    registerTransformerGroupNode()
    registerFoldNode()
    await loadModelsFromApi(this.baseUrl);
    await loadMappersFromApi(this.baseUrl);
    this.viewport.registerEvents();
    this.registerKeyboardEvents();
    this.autoLoad();
    sidebar.install(this);
    radial.install(this);

    await this.initReport();

    console.log('VorteX Mapper ready');
  }

  async initReport() {
    await picker.install();
    this.reportManager = new MapperReportManager(this.graph);

    this.reportManager.register(MappingReport);
    this.reportManager.register(MappedOutReport);
    this.reportManager.register(MappedOutConnectedReport);
    console.log(`Reports loaded: ${this.reportManager.reports.length}`)
  }

  bootstrapWidgets() {
    WidgetFactory.registerTemplate('button', 'vortex-widget-button');
    WidgetFactory.registerTemplate('text', 'vortex-widget-text');
    WidgetFactory.registerTemplate('readonly', 'vortex-widget-readonly');
    WidgetFactory.registerTemplate('dropdown', 'vortex-widget-dropdown');
    WidgetFactory.registerTemplate('checkbox', 'vortex-widget-checkbox');
    WidgetFactory.registerTemplate('preview', 'vortex-widget-preview');
  }

  // --- Widget bootstrap ---

  // --- Link drop strategy (métier mapper) ---

  handleLinkDrop(from, to) {
    // _Self out → _Self in = auto-wire par nom/type
    if (from.portName === '_Self' && to.portName === '_Self') {
      this.graph.autoWire(from.nodeId, to.nodeId);
      return [];
    }
    // Sinon lien simple
    return [{ fromNode: from.nodeId, fromName: from.portName, toNode: to.nodeId, toName: to.portName }];
  }

  // --- Context actions (métier mapper) ---

  getContextActions(target) {
    const graph = this.graph;

    switch (target.type) {
      case 'canvas':
        return [
          { id: 'run',    label: 'Run',       icon: '▶',  callback: () => graph.executePlan() },
          { id: 'save',   label: 'Save',      icon: '💾', callback: () => this.save() },
          { id: 'load',   label: 'Load',      icon: '📂', callback: () => this.load() },
          { id: 'new',    label: 'New Graph', icon: '➕', callback: () => this.newGraph() },
          ...this.reportManager.getContextActions(target),
        ];

      case 'node': {
        const actions = [
          { id: 'delete', label: 'Delete', icon: '❌', callback: () => {
              graph.selection.add(target.nodeId);
              graph.deleteSelectedNodes();
            }},
          ...this.reportManager.getContextActions(target),
        ];
        const node = graph.nodes.get(target.nodeId);
        if (node && node.contextActions) {
          actions.push(...node.contextActions(target.nodeId, graph));
        }
        actions.push(...ExpandOutAction.getContextActions(target.nodeId, node, graph));
        actions.push(...ExpandInAction.getContextActions(target.nodeId, node, graph));
        actions.push(...BuildMapperAction.getContextActions(target.nodeId, node, graph));
        return actions;
      }

      case 'selection':
        return [
          { id: 'delete', label: 'Delete', icon: '❌', callback: () => graph.deleteSelectedNodes() },
          ...this._selectionContextActions(graph),
          ...this.reportManager.getContextActions(target),
        ];

      case 'link':
        return [
          { id: 'delete', label: 'Delete', icon: '❌', callback: () => graph.removeLink(target.link) },
        ];

      default:
        return [];
    }
  }

  // Fallback contextActionsGroup — contributions des nodes de la sélection
  _selectionContextActions(graph) {
    const selected = [...graph.selection];

    // Chaque node instance peut contribuer via contextActionsGroup
    const actions = [];
    for (const id of selected) {
      const node = graph.nodes.get(id);
      if (node && node.contextActionsGroup) {
        actions.push(...node.contextActionsGroup(selected, graph));
      }
    }

    // Classes statiques peuvent aussi contribuer — FoldNode.contextActionsGroup
    if (FoldNode.contextActionsGroup) {
      actions.push(...FoldNode.contextActionsGroup(selected, graph));
    }

    return actions;
  }

  // --- Keyboard (métier mapper) ---

  registerKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.graph.deleteSelectedNodes();
      } else if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        this.graph.selectAll();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.save();
      } else if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        this.load();
      }
    });
  }

  // --- Auto-save / Auto-load ---

  scheduleAutoSave() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      const data = this.serializeModule();
      localStorage.setItem('vortex-autosave', JSON.stringify(data));
    }, 500);
  }

  autoLoad() {
    const json = localStorage.getItem('vortex-autosave');
    if (!json) return;
    try {
      const data = JSON.parse(json);
      if (data.application !== 'VorteX' || data.module !== 'Mapper') return;
      this.graph.deserialize(data);
      this.viewport.deserialize(data.viewport);
      this.graph.updateLinks();
      this.graph.fitWorld();
      console.log('Auto-load: graph restored from localStorage');
    } catch (err) {
      console.error('Auto-load failed:', err);
    }
  }

  clearAutoSave() {
    localStorage.removeItem('vortex-autosave');
  }

  // --- Save / Load / New ---

  serializeModule() {
    const graphData = this.graph.serialize();
    return {
      application: 'VorteX',
      module: 'Mapper',
      viewport: this.viewport.serialize(),
      ...graphData,
    };
  }

  async save() {
    const data = this.serializeModule();
    const json = JSON.stringify(data, null, 2);

    try {
      if (!this._fileHandle) {
        this._fileHandle = await window.showSaveFilePicker({
          suggestedName: 'graph.json',
          types: [{
            description: 'VorteX Graph',
            accept: { 'application/json': ['.json'] },
          }],
        });
      }
      const writable = await this._fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      console.log('Graph saved:', this._fileHandle.name);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Save failed:', err);
    }
  }

  async load() {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'VorteX Graph',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const file = await fileHandle.getFile();
      const json = await file.text();
      const data = JSON.parse(json);

      if (data.application !== 'VorteX' || data.module !== 'Mapper') {
        alert('Invalid file: not a VorteX Mapper graph.');
        return;
      }

      this.graph.deserialize(data);
      this.viewport.deserialize(data.viewport);
      this.graph.updateLinks();
      this.graph.fitWorld();
      console.log('Graph loaded:', fileHandle.name);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Load failed:', err);
    }
  }

  newGraph() {
    this.graph.clearGraph();
    this.viewport.reset();
    this._fileHandle = null;
    this.clearAutoSave();
    console.log('New graph created');
  }
}