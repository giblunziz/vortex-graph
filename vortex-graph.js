import { vortexRegistry } from "./vortex-registry.js";

// Le modèle — source de vérité
export class VortexGraph {
  constructor(world) {
    this.nodes = new Map(); // id → node instance (clonée)
    this.selection = new Set();
    this.links = [];
    this.nodeCount = 0;
    this.world = world;
    this.onChange = null;
  }

  notifyChange() {
    if (this.onChange) this.onChange();
  }

  // --- Selection ---

  selectNode(id, addToSelection) {
    if (!addToSelection) {
      this.selection.clear();
    }
    if (this.selection.has(id)) {
      this.selection.delete(id);
    } else {
      this.selection.add(id);
    }
    this.updateSelectionView();
  }

  updateSelectionView() {
    document.querySelectorAll(".vortex-node").forEach((el) => {
      el.classList.toggle("selected", this.selection.has(el.dataset.id));
    });
    for (const link of this.links) {
      if (!link._path) continue;
      const connected = this.selection.has(link.fromNode) || this.selection.has(link.toNode);
      link._path.classList.toggle("link-selected", connected);
    }
  }

  getSelectedNodes() {
    return [...this.selection];
  }

  clearSelection() {
    this.selection.clear();
    this.updateSelectionView();
  }

  // --- Node management ---

  deleteSelectedNodes() {
    if (this.selection.size === 0) return;

    for (const nodeId of [...this.selection]) {
      this.selection.delete(nodeId);
      const connectedLinks = this.links.filter(
        (l) => l.fromNode === nodeId || l.toNode === nodeId,
      );
      for (const link of connectedLinks) {
        this.removeLink(link);
      }
      const nodeEl = this.world.querySelector(`.vortex-node[data-id="${nodeId}"]`);
      if (nodeEl) nodeEl.remove();
      this.nodes.delete(nodeId);
    }
    this.notifyChange();
  }

  nextId() {
    return "vn_" + ++this.nodeCount;
  }

  appendNode(nodeId) {
    const descriptor = vortexRegistry.getNode(nodeId);
    if (!descriptor) {
      alert(`unable to find node ${nodeId}`);
      return null;
    }
    const node = descriptor.clone();
    const id = this.nextId();
    this.nodes.set(id, node);
    this.drawNode(id);
    this.notifyChange();
    return id;
  }

  // --- DOM rendering ---

  addPort(nodeEl, name, type, hasIn, hasOut, businessTerm) {
    const tpl = document.getElementById("vortex-port-row");
    const row = tpl.content.cloneNode(true);

    this.setText(row, ".field-name", name);

    const btEl = row.querySelector(".business-term");
    if (businessTerm) {
      this.setText(row, ".business-term", businessTerm);
      const sp = businessTerm.split("-", 2);
      btEl.classList.add(sp[0].toLowerCase());
    }

    const portIn = row.querySelector(".port.in");
    const portOut = row.querySelector(".port.out");
    if (hasIn) { portIn.dataset.type = type; } else portIn.remove();
    if (hasOut) { portOut.dataset.type = type; } else portOut.remove();

    nodeEl.querySelector(".node-ports").appendChild(row);
  }

  setText(el, selector, value) {
    el.querySelector(selector).textContent = value;
  }

  addWidget(container, nodeEl, node, widget) {
    const wv = node.data.widgetValues = node.data.widgetValues || {};

    if (widget.type === "button") {
      const tpl = document.getElementById("vortex-widget-button");
      const clone = tpl.content.cloneNode(true);
      const btn = clone.querySelector(".widget-button");
      btn.textContent = widget.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (widget.onClick) widget.onClick(nodeEl, node);
      });
      container.appendChild(clone);
    } else if (widget.type === "text") {
      const tpl = document.getElementById("vortex-widget-text");
      const clone = tpl.content.cloneNode(true);
      clone.querySelector(".widget-label").textContent = widget.label;
      const input = clone.querySelector(".widget-input");
      input.dataset.name = widget.name;
      input.value = wv[widget.name] ?? widget.value ?? "";
      input.placeholder = widget.placeholder || "";
      input.addEventListener("mousedown", (e) => e.stopPropagation());
      input.addEventListener("input", () => { wv[widget.name] = input.value; });
      container.appendChild(clone);
    } else if (widget.type === "readonly") {
      const tpl = document.getElementById("vortex-widget-readonly");
      const clone = tpl.content.cloneNode(true);
      clone.querySelector(".widget-label").textContent = widget.label;
      const val = clone.querySelector(".widget-value");
      val.dataset.name = widget.name;
      val.textContent = wv[widget.name] ?? widget.value ?? "";
      container.appendChild(clone);
    } else if (widget.type === "dropdown") {
      const tpl = document.getElementById("vortex-widget-dropdown");
      const clone = tpl.content.cloneNode(true);
      clone.querySelector(".widget-label").textContent = widget.label;
      const select = clone.querySelector(".widget-dropdown");
      select.dataset.name = widget.name;
      for (const val of widget.options || []) {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      }
      select.value = wv[widget.name] ?? widget.value ?? "";
      select.addEventListener("mousedown", (e) => e.stopPropagation());
      select.addEventListener("change", () => { wv[widget.name] = select.value; });
      container.appendChild(clone);
    } else if (widget.type === "preview") {
      const wrapper = document.createElement("div");
      wrapper.className = "node-preview-wrapper";
      const pre = document.createElement("pre");
      pre.className = "node-preview";
      pre.dataset.name = widget.name;
      pre.textContent = widget.value || "";
      wrapper.appendChild(pre);
      wrapper.addEventListener("wheel", (e) => e.stopPropagation());
      wrapper.addEventListener("mousedown", (e) => e.stopPropagation());
      container.appendChild(wrapper);
    }
  }

  drawNode(id) {
    const node = this.nodes.get(id);
    if (!node) {
      alert(`Invalid graph, node ${id} missing!`);
      return;
    }
    const tpl = document.getElementById("vortex-node");
    const clone = tpl.content.cloneNode(true);
    const nodeEl = clone.querySelector(".vortex-node");

    nodeEl.dataset.id = id;
    nodeEl.dataset.type = node.id;
    this.setText(nodeEl, ".node-title", node.properties.type);
    this.setText(nodeEl, ".node-footer", node.properties.domain || '');

    // États depuis le modèle
    if (node.collapsed) nodeEl.classList.add("collapsed");
    if (node.x) nodeEl.style.left = node.x + "px";
    if (node.y) nodeEl.style.top = node.y + "px";
    if (node.width) nodeEl.style.width = node.width + "px";
    if (node.height) nodeEl.style.height = node.height + "px";

    // Collapse toggle → met à jour le modèle
    nodeEl.querySelector(".collapse-toggle").addEventListener("click", (e) => {
      e.stopPropagation();
      node.collapsed = !node.collapsed;
      nodeEl.classList.toggle("collapsed", node.collapsed);
      requestAnimationFrame(() => {
        this.updateLinks();
        this.fitWorld();
        this.notifyChange();
      });
    });

    // Propriétés visuelles spécifiques (sur le prototype, pas copiées)
    if (node.cssClass) nodeEl.classList.add(node.cssClass);
    if (node.size) {
      nodeEl.style.width = node.size[0] + "px";
      nodeEl.style.height = node.size[1] + "px";
    }

    // Ports
    for (const port of node.ports) {
      this.addPort(nodeEl, port.name, port.type, port.hasIn, port.hasOut, port.businessTerm);
    }

    // BT hover cross-highlight
    nodeEl.addEventListener("mouseenter", (e) => {
      const bt = e.target.closest(".business-term");
      if (bt && bt.textContent) {
        this.world.querySelectorAll(".business-term").forEach(el => {
          if (el.textContent === bt.textContent) el.classList.add("bt-highlight");
        });
      }
    }, true);
    nodeEl.addEventListener("mouseleave", (e) => {
      const bt = e.target.closest(".business-term");
      if (bt) {
        this.world.querySelectorAll(".bt-highlight").forEach(el => el.classList.remove("bt-highlight"));
      }
    }, true);

    // Widgets
    if (node.widgets && node.widgets.length > 0) {
      const slot = nodeEl.querySelector(".node-widgets-slot");
      slot.className = "node-widgets";
      for (const widget of node.widgets) {
        this.addWidget(slot, nodeEl, node, widget);
      }
    }

    this.world.appendChild(nodeEl);
  }

  // --- Sync DOM → modèle ---

  syncNodePosition(nodeId) {
    const node = this.nodes.get(nodeId);
    const nodeEl = this.world.querySelector(`.vortex-node[data-id="${nodeId}"]`);
    if (!node || !nodeEl) return;
    node.x = parseFloat(nodeEl.style.left) || 0;
    node.y = parseFloat(nodeEl.style.top) || 0;
    node.width = nodeEl.style.width ? parseFloat(nodeEl.style.width) : null;
    node.height = nodeEl.style.height ? parseFloat(nodeEl.style.height) : null;
  }

  // --- Links ---

  createLink(fromNode, fromName, toNode, toName) {
    const alreadyLinked = this.links.some(
      (l) => l.toNode === toNode && l.toName === toName,
    );
    if (alreadyLinked) return null;

    const link = { fromNode, fromName, toNode, toName };
    this.links.push(link);
    this.drawLink(link);
    this.notifyChange();
    return link;
  }

  drawLink(link) {
    const fromPort = this.findPort(link.fromNode, link.fromName, "out");
    const toPort = this.findPort(link.toNode, link.toName, "in");
    if (!fromPort || !toPort) return;

    const svg = this.world.querySelector("#vortex-links");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("vortex-link");

    const portColor = getComputedStyle(fromPort).backgroundColor;
    if (portColor && portColor !== 'rgba(0, 0, 0, 0)') {
      path.style.stroke = portColor;
    }

    svg.appendChild(path);
    link._path = path;
    link._fromPort = fromPort;
    link._toPort = toPort;
    this.updateLink(link);
  }

  findPort(nodeId, portName, direction) {
    const nodeEl = this.world.querySelector(`.vortex-node[data-id="${nodeId}"]`);
    if (!nodeEl) return null;
    for (const row of nodeEl.querySelectorAll(".node-row")) {
      const name = row.querySelector(".field-name")?.textContent;
      if (name === portName) return row.querySelector(`.port.${direction}`);
    }
    return null;
  }

  updateLink(link) {
    if (!link._fromPort || !link._toPort || !link._path) return;
    const from = this.getPortCenter(link._fromPort);
    const to = this.getPortCenter(link._toPort);
    const dx = Math.abs(to.x - from.x) * 0.5;
    link._path.setAttribute("d",
      `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`);
  }

  removeLink(link) {
    const idx = this.links.indexOf(link);
    if (idx !== -1) this.links.splice(idx, 1);
    if (link._path) link._path.remove();
    this.notifyChange();
  }

  updateLinks() {
    for (const link of this.links) this.updateLink(link);
  }

  getPortCenter(port) {
    const nodeEl = port.closest(".vortex-node");
    const zoom = this.zoomLevel || 1;
    const worldRect = this.world.getBoundingClientRect();

    if (nodeEl && nodeEl.classList.contains("collapsed")) {
      const header = nodeEl.querySelector(".node-header");
      const headerRect = header.getBoundingClientRect();
      const isOut = port.classList.contains("out");
      return {
        x: ((isOut ? headerRect.right : headerRect.left) - worldRect.left) / zoom,
        y: ((headerRect.top + headerRect.bottom) / 2 - worldRect.top) / zoom,
      };
    }

    const rect = port.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - worldRect.left) / zoom,
      y: (rect.top + rect.height / 2 - worldRect.top) / zoom,
    };
  }

  fitWorld() {
    let maxX = 0, maxY = 0;
    for (const el of this.world.querySelectorAll(".vortex-node")) {
      const right = el.offsetLeft + el.offsetWidth + 200;
      const bottom = el.offsetTop + el.offsetHeight + 200;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    this.world.style.width = Math.max(maxX, this.world.parentElement.offsetWidth) + "px";
    this.world.style.height = Math.max(maxY, this.world.parentElement.offsetHeight) + "px";
  }

  // --- Serialization ---

  serialize(viewport) {
    const nodes = [];
    for (const [id, node] of this.nodes) {
      this.syncNodePosition(id);
      const saved = node.serialize();
      saved.type = node.id;
      saved.id = id;
      nodes.push(saved);
    }

    return {
      version: 1,
      viewport,
      nodeCount: this.nodeCount,
      nodes,
      links: this.links.map(l => ({
        fromNode: l.fromNode, fromName: l.fromName,
        toNode: l.toNode, toName: l.toName,
      })),
    };
  }

  deserialize(data) {
    this.clearGraph();
    this.nodeCount = data.nodeCount || 0;

    for (const saved of data.nodes) {
      const descriptor = vortexRegistry.getNode(saved.type);
      if (!descriptor) {
        console.error(`Node type not found: ${saved.type}`);
        continue;
      }
      const node = descriptor.clone();
      node.deserialize(saved);
      this.nodes.set(saved.id, node);
      this.drawNode(saved.id);
    }

    for (const l of data.links) {
      this.createLink(l.fromNode, l.fromName, l.toNode, l.toName);
    }

    return data.viewport;
  }

  clearGraph() {
    for (const link of [...this.links]) this.removeLink(link);
    this.world.querySelectorAll('.vortex-node').forEach(el => el.remove());
    this.nodes.clear();
    this.selection.clear();
    this.nodeCount = 0;
  }

  // --- Execution engine ---

  buildExecutionPlan() {
    const nodeIds = [...this.nodes.keys()];
    const inDegree = new Map();
    const dependents = new Map();

    for (const id of nodeIds) { inDegree.set(id, 0); dependents.set(id, []); }

    for (const link of this.links) {
      if (link.fromNode === link.toNode) continue;
      inDegree.set(link.toNode, inDegree.get(link.toNode) + 1);
      dependents.get(link.fromNode).push(link.toNode);
    }

    const queue = [];
    for (const [id, degree] of inDegree) { if (degree === 0) queue.push(id); }

    const plan = [];
    while (queue.length > 0) {
      const id = queue.shift();
      plan.push(id);
      for (const depId of dependents.get(id)) {
        const nd = inDegree.get(depId) - 1;
        inDegree.set(depId, nd);
        if (nd === 0) queue.push(depId);
      }
    }

    if (plan.length !== nodeIds.length) {
      console.error("Cycle detected!", nodeIds.filter(id => !plan.includes(id)));
    }
    return plan;
  }

  async executePlan() {
    const plan = this.buildExecutionPlan();
    const nodeData = new Map();

    for (const nodeId of plan) {
      const nodeEl = this.world.querySelector(`.vortex-node[data-id="${nodeId}"]`);
      const node = this.nodes.get(nodeId);
      if (!nodeEl || !node) continue;

      const inputs = {};
      for (const link of this.links) {
        if (link.toNode !== nodeId) continue;
        const src = nodeData.get(link.fromNode);
        if (src && src.outputs[link.fromName] !== undefined) {
          inputs[link.toName] = src.outputs[link.fromName];
        }
      }

      nodeEl.classList.add("executing");
      await this.wait(50);

      let outputs = {};
      try {
        if (node.execute) {
          const result = node.execute(inputs, nodeEl, node);
          outputs = result instanceof Promise ? await result : result;
        }
        nodeEl.classList.remove("executing");
        nodeEl.classList.add("executed");
      } catch (err) {
        console.error(`Error executing ${nodeId}:`, err);
        nodeEl.classList.remove("executing");
        nodeEl.classList.add("execute-error");
      }

      nodeData.set(nodeId, { inputs, outputs: outputs || {} });
      await this.wait(50);
    }

    setTimeout(() => {
      this.world.querySelectorAll(".executed, .execute-error").forEach(el => {
        el.classList.remove("executed", "execute-error");
      });
    }, 2000);

    return nodeData;
  }

  wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  autoWire(sourceNodeId, targetNodeId) {
    const src = this.nodes.get(sourceNodeId);
    const tgt = this.nodes.get(targetNodeId);
    if (!src || !tgt) return;

    const tgtPorts = new Map();
    for (const p of tgt.ports) { if (p.hasIn && p.name !== "_Self") tgtPorts.set(p.name, p); }

    for (const p of src.ports) {
      if (!p.hasOut || p.name === "_Self") continue;
      const t = tgtPorts.get(p.name);
      if (t && p.type === t.type) this.createLink(sourceNodeId, p.name, targetNodeId, t.name);
    }
  }
}
