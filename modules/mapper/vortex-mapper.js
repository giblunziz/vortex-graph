import { VortexGraph } from '../../vortex-graph.js';
import { registerModelNodes } from '../../common/vortex-model-node.js';
import { registerJsonNodes } from '../../nodes/vortex-json-nodes.js';
import { loadModelsFromApi } from '../../vortex-api-loader.js';
import { vortexRegistry } from '../../vortex-registry.js';
import { showRadialMenu, dismissRadialMenu } from '../../vortex-radial-menu.js';
import { getCanvasActions, getNodeActions, getSelectionActions, getLinkActions } from '../../vortex-context-actions.js';
import * as sidebar from '../../components/sidebar/sidebar.js';

export class VortexMapperModule {
  constructor(canvas, world, svg) {
    this.canvas = canvas;
    this.world = world;
    this.svg = svg;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.graph = new VortexGraph(this.world);

    this.graph.onChange = () => this.scheduleAutoSave();
    this.ready = this.init();
  }

  async init() {
    registerJsonNodes();
    await loadModelsFromApi();
    registerModelNodes(); // fallback statique si l'API est indisponible
    this.registerWheelEvent();
    this.registerMouseDownEvent();
    this.registerKeyboardEvents();
    this.registerContextMenu();
    this.autoLoad();
    sidebar.install(this);
    console.log('VorteX Mapper ready');
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
      const viewport = this.graph.deserialize(data);
      if (viewport) {
        this.panX = viewport.panX || 0;
        this.panY = viewport.panY || 0;
        this.zoomLevel = viewport.zoomLevel || 1;
        this.graph.zoomLevel = this.zoomLevel;
        this.applyTransform();
      }
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

  newGraph() {
    this.graph.clearGraph();
    this.panX = 0;
    this.panY = 0;
    this.zoomLevel = 1;
    this.graph.zoomLevel = 1;
    this.applyTransform();
    this._fileHandle = null;
    this.clearAutoSave();
    console.log('New graph created');
  }

  registerContextMenu() {
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();

      // Priorité 1 : sélection multiple active
      const selected = this.graph.getSelectedNodes();
      if (selected.length > 1) {
        showRadialMenu(e.clientX, e.clientY, getSelectionActions(this.graph, selected));
        return;
      }

      // Priorité 2 : élément sous le curseur
      const node = e.target.closest('.vortex-node');
      const linkPath = e.target.closest('.vortex-link');

      if (node) {
        const nodeId = node.dataset.id;
        showRadialMenu(e.clientX, e.clientY, getNodeActions(this.graph, nodeId));
      } else if (linkPath) {
        const link = this.graph.links.find(l => l._path === linkPath);
        if (link) showRadialMenu(e.clientX, e.clientY, getLinkActions(this.graph, link));
      } else {
        showRadialMenu(e.clientX, e.clientY, getCanvasActions(this.graph, this));
      }
    });
  }

  registerKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.graph.deleteSelectedNodes();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.save();
      } else if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        this.load();
      }
    });
  }

  serializeModule() {
    const viewport = { panX: this.panX, panY: this.panY, zoomLevel: this.zoomLevel };
    const graphData = this.graph.serialize(viewport);
    return {
      application: 'VorteX',
      module: 'Mapper',
      ...graphData,
    };
  }

  async save() {
    const data = this.serializeModule();
    const json = JSON.stringify(data, null, 2);

    try {
      // Réutiliser le fileHandle existant si déjà ouvert
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

      // Validation du format
      if (data.application !== 'VorteX' || data.module !== 'Mapper') {
        alert('Invalid file: not a VorteX Mapper graph.');
        return;
      }

      const viewport = this.graph.deserialize(data);

      // Restaurer le viewport
      if (viewport) {
        this.panX = viewport.panX || 0;
        this.panY = viewport.panY || 0;
        this.zoomLevel = viewport.zoomLevel || 1;
        this.graph.zoomLevel = this.zoomLevel;
        this.applyTransform();
      }

      this.graph.updateLinks();
      this.graph.fitWorld();
      console.log('Graph loaded:', fileHandle.name);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Load failed:', err);
    }
  }
  appendNode(nodeId) {
    this.graph.appendNode(nodeId);
  }

  addPort(node, name, type, hasIn, hasOut) {
    this.graph.addPort(node, name, type, hasIn, hasOut);
  }

  registerMouseDownEvent() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      const resize = e.target.closest('.resize-handle');
      const collapseToggle = e.target.closest('.collapse-toggle');
      const header = e.target.closest('.node-header');
      const port = e.target.closest('.port');
      const node = e.target.closest('.vortex-node');

      if (collapseToggle) return; // Géré par le click handler du toggle

      if (port) {
        if (port.classList.contains('in')) {
          const pd = this.portData(port);
          const existingLink = this.graph.links.find(
            (l) => l.toNode === pd.nodeId && l.toName === pd.portName,
          );
          if (existingLink) {
            this.startLinkRedirect(existingLink, e);
            return;
          }
        }
        this.startPortDrag(port, e);
      } else if (resize) {
        this.startResize(node, e);
      } else if (header) {
        if (e.ctrlKey || e.metaKey) {
          this.graph.selectNode(node.dataset.id, true);
        } else if (!this.graph.selection.has(node.dataset.id)) {
          this.graph.selectNode(node.dataset.id, false);
        }
        this.startNodeDrag(node, e);
      } else if (node) {
        this.graph.selectNode(node.dataset.id, e.ctrlKey || e.metaKey);
      } else {
        this.graph.clearSelection();
        this.startCanvasPan(e);
      }
    });
  }

  startResize(node, e) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = node.offsetWidth;
    const startH = node.offsetHeight;

    const onMove = (e) => {
      node.style.width = startW + (e.clientX - startX) / this.zoomLevel + 'px';
      node.style.height = startH + (e.clientY - startY) / this.zoomLevel + 'px';
      this.graph.updateLinks();
    };

    const onUp = () => {
      this.canvas.removeEventListener('mousemove', onMove);
      this.canvas.removeEventListener('mouseup', onUp);
      this.graph.updateLinks();
      this.graph.fitWorld();
      this.scheduleAutoSave();
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
  }

  startNodeDrag(node, e) {
    // Collecter les nodes à déplacer : sélection ou node sous la souris
    const selected = this.graph.getSelectedNodes();
    const nodeIds = selected.includes(node.dataset.id)
      ? selected
      : [node.dataset.id];

    const nodeEls = nodeIds.map(id =>
      this.world.querySelector(`.vortex-node[data-id="${id}"]`)
    ).filter(Boolean);

    // Calculer les offsets pour chaque node
    const offsets = nodeEls.map(el => ({
      el,
      x: e.clientX - el.offsetLeft * this.zoomLevel - this.panX,
      y: e.clientY - el.offsetTop * this.zoomLevel - this.panY,
    }));

    node.style.cursor = 'grabbing';

    const onMove = (e) => {
      for (const o of offsets) {
        const x = Math.max(0, (e.clientX - o.x - this.panX) / this.zoomLevel);
        const y = Math.max(0, (e.clientY - o.y - this.panY) / this.zoomLevel);
        o.el.style.left = x + 'px';
        o.el.style.top = y + 'px';
      }
      this.graph.updateLinks();
    };

    const onUp = () => {
      node.style.cursor = '';
      this.canvas.removeEventListener('mousemove', onMove);
      this.canvas.removeEventListener('mouseup', onUp);
      this.graph.fitWorld();
      this.scheduleAutoSave();
    };
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
  }

  startCanvasPan(e) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = this.panX;
    const startPanY = this.panY;
    this.canvas.style.cursor = 'grabbing';

    const onMove = (e) => {
      this.panX = startPanX + (e.clientX - startX);
      this.panY = startPanY + (e.clientY - startY);
      this.applyTransform();
    };

    const onUp = () => {
      this.canvas.style.cursor = '';
      this.canvas.removeEventListener('mousemove', onMove);
      this.canvas.removeEventListener('mouseup', onUp);
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
  }

  registerWheelEvent() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(2, Math.max(0.3, this.zoomLevel + delta));

      // Position souris relative au canvas
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Ajuster le pan pour zoomer vers la souris
      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoomLevel);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoomLevel);

      this.zoomLevel = newZoom;
      this.graph.zoomLevel = newZoom;
      this.applyTransform();
    });
  }

  applyTransform() {
    this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    this.world.style.transformOrigin = '0 0';

    // La grille suit le pan et le zoom
    const gridSize = 20 * this.zoomLevel;
    this.canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    this.canvas.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
  }

  startPortDrag(port, e) {
    const svg = this.world.querySelector('#vortex-links');
    const tempPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    tempPath.classList.add('vortex-link');
    tempPath.style.opacity = '0.5';
    svg.appendChild(tempPath);

    const isOutput = port.classList.contains('out');
    const startCenter = this.graph.getPortCenter(port);

    const onMove = (e) => {
      const rect = this.world.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const from = isOutput ? startCenter : { x: mouseX, y: mouseY };
      const to = isOutput ? { x: mouseX, y: mouseY } : startCenter;
      const dx = Math.abs(to.x - from.x) * 0.5;
      tempPath.setAttribute(
        'd',
        `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`,
      );
    };

    const onUp = (e) => {
      const targetPort = e.target.closest('.port');

      if (targetPort && targetPort !== port) {
        const fromPort = isOutput ? port : targetPort;
        const toPort = isOutput ? targetPort : port;
        this.tryAutoWire(fromPort, toPort);
      } else if (!targetPort) {
        // Drop dans le vide → drop selector
        const sourceType = port.dataset.type;
        const direction = isOutput ? 'in' : 'out';
        this.showDropSelector(
          e.clientX,
          e.clientY,
          sourceType,
          direction,
          port,
          isOutput,
        );
      }

      tempPath.remove();
      this.canvas.removeEventListener('mousemove', onMove);
      this.canvas.removeEventListener('mouseup', onUp);
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
  }

  startLinkRedirect(link, e) {
    const fromPort = link._fromPort;

    // Détacher visuellement — créer un path temporaire
    const svg = this.world.querySelector('#vortex-links');
    const tempPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    tempPath.classList.add('vortex-link');
    tempPath.style.opacity = '0.5';
    svg.appendChild(tempPath);

    // Garder les infos du lien original avant suppression
    const originalFromNode = link.fromNode;
    const originalFromName = link.fromName;

    // Supprimer du graph (supprime aussi le path SVG)
    this.graph.removeLink(link);

    const startCenter = this.graph.getPortCenter(fromPort);

    const onMove = (e) => {
      const rect = this.world.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / this.zoomLevel;
      const mouseY = (e.clientY - rect.top) / this.zoomLevel;
      const dx = Math.abs(mouseX - startCenter.x) * 0.5;

      tempPath.setAttribute(
        'd',
        `M ${startCenter.x} ${startCenter.y} C ${startCenter.x + dx} ${startCenter.y}, ${mouseX - dx} ${mouseY}, ${mouseX} ${mouseY}`,
      );
    };

    const onUp = (e) => {
      const targetPort = e.target.closest('.port.in');

      if (targetPort) {
        const to = this.portData(targetPort);
        this.graph.createLink(
          originalFromNode,
          originalFromName,
          to.nodeId,
          to.portName,
        );
      } else {
        // Drop dans le vide → drop selector
        const sourceType = fromPort.dataset.type;
        this.showDropSelector(
          e.clientX,
          e.clientY,
          sourceType,
          'in',
          fromPort,
          true,
        );
      }

      tempPath.remove();
      this.canvas.removeEventListener('mousemove', onMove);
      this.canvas.removeEventListener('mouseup', onUp);
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
  }

  showDropSelector(x, y, type, direction, sourcePort, isOutput) {
    this.dismissDropSelector();

    // Trouver le type du node source pour l'exclure
    const sourceNode = sourcePort.closest('.vortex-node');
    const sourceNodeType = sourceNode ? sourceNode.dataset.type : null;

    const matches = vortexRegistry.findCompatibleNodes(
      type,
      direction,
      sourceNodeType,
    );
    if (matches.length === 0) return;

    const popup = document.createElement('div');
    popup.className = 'drop-selector';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';

    const title = document.createElement('div');
    title.className = 'drop-selector-title';
    title.textContent = `${type} \u2192 ${direction}`;
    popup.appendChild(title);

    for (const match of matches) {
      const item = document.createElement('div');
      item.className = 'drop-selector-item';
      item.textContent = match.nodeId;

      item.addEventListener('click', () => {
        // Cr\u00e9er le node \u00e0 la position du drop
        const worldRect = this.world.getBoundingClientRect();
        const nodeX = (x - worldRect.left) / this.zoomLevel;
        const nodeY = (y - worldRect.top) / this.zoomLevel;

        const newNodeId  = this.graph.appendNode(match.nodeId);
        const nodeEl = this.world.querySelector(
          `.vortex-node[data-id="${newNodeId}"]`,
        );
        nodeEl.style.left = nodeX + 'px';
        nodeEl.style.top = nodeY + 'px';

        // Chercher le meilleur port pour le lien (via le modèle)
        const source = this.portData(sourcePort);
        const newDesc = this.graph.nodes.get(newNodeId);

        let targetName = null;
        const matchByName = newDesc.ports.find(
          (p) =>
            p.name === source.portName &&
            p.type === type &&
            (direction === 'in' ? p.hasIn : p.hasOut),
        );
        if (matchByName) {
          targetName = matchByName.name;
        } else {
          const matchBySelf = newDesc.ports.find(
            (p) =>
              p.name === '_Self' &&
              p.type === type &&
              (direction === 'in' ? p.hasIn : p.hasOut),
          );
          if (matchBySelf) targetName = '_Self';
        }

        if (targetName) {
          if (isOutput) {
            this.graph.createLink(
              source.nodeId,
              source.portName,
              newNodeId,
              targetName,
            );
          } else {
            this.graph.createLink(
              newNodeId,
              targetName,
              source.nodeId,
              source.portName,
            );
          }
        }

        this.dismissDropSelector();
      });

      popup.appendChild(item);
    }

    // Fermer si clic en dehors
    const onClickOutside = (e) => {
      if (!popup.contains(e.target)) {
        this.dismissDropSelector();
        document.removeEventListener('mousedown', onClickOutside);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', onClickOutside), 0);

    this.activeDropSelector = popup;
    document.body.appendChild(popup);
  }

  dismissDropSelector() {
    if (this.activeDropSelector) {
      this.activeDropSelector.remove();
      this.activeDropSelector = null;
    }
  }

  // Extraire la data d'un port DOM
  portData(port) {
    const nodeEl = port.closest('.vortex-node');
    const row = port.closest('.node-row');
    return {
      nodeId: nodeEl.dataset.id,
      portName: row.querySelector('.field-name').textContent,
    };
  }

  tryAutoWire(fromPort, toPort) {
    const from = this.portData(fromPort);
    const to = this.portData(toPort);

    // _Self out → _Self in = auto-wire par nom/type, pas de lien sur _Self
    if (from.portName === '_Self' && to.portName === '_Self') {
      this.graph.autoWire(from.nodeId, to.nodeId);
    } else {
      this.graph.createLink(from.nodeId, from.portName, to.nodeId, to.portName);
    }
  }

  findPortOnNode(nodeEl, portName, direction) {
    const rows = nodeEl.querySelectorAll('.node-row');
    for (const row of rows) {
      const fieldName = row.querySelector('.field-name');
      if (fieldName && fieldName.textContent === portName) {
        const portClass = direction === 'in' ? '.port.in' : '.port.out';
        return row.querySelector(portClass);
      }
    }
    return null;
  }
}
