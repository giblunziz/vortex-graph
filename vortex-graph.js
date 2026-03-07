import { vortexRegistry } from "./vortex-registry.js";

// Le modèle — source de vérité
export class VortexGraph {
  constructor(world) {
    this.nodes = new Map(); // id → nodeInstance
    this.selection = new Set(); // ids des nodes sélectionnés
    this.links = [];
    this.nodeCount = 0;
    this.world = world;
  }

  selectNode(id, addToSelection) {
    if (!addToSelection) {
      this.selection.clear();
    }

    if (this.selection.has(id)) {
      this.selection.delete(id);
    } else {
      this.selection.add(id);
    }

    // Notifier la vue
    this.updateSelectionView();
  }

  updateSelectionView() {
    // La vue se met à jour DEPUIS le modèle
    document.querySelectorAll(".vortex-node").forEach((el) => {
      el.classList.toggle("selected", this.selection.has(el.dataset.id));
    });
  }

  getSelectedNodes() {
    return [...this.selection];
  }

  clearSelection() {
    this.selection.clear();
    this.updateSelectionView();
  }

  deleteSelectedNodes() {
    if (this.selection.size === 0) return;

    for (const nodeId of [...this.selection]) {
      this.selection.delete(nodeId);

      // Supprimer les liens connectés à ce node
      const connectedLinks = this.links.filter(
        (l) => l.fromNode === nodeId || l.toNode === nodeId,
      );
      for (const link of connectedLinks) {
        this.removeLink(link);
      }

      // Supprimer le DOM
      const nodeEl = this.world.querySelector(`.vortex-node[data-id="${nodeId}"]`);
      if (nodeEl) nodeEl.remove();

      // Supprimer du modèle
      this.nodes.delete(nodeId);
    }
  }

  nextId() {
    // this.nodeCount = Math.max(
    //   0,
    //   ...[...this.nodes.keys()].map((id) => parseInt(id.split("_")[1])),
    // );
    return "vn_" + ++this.nodeCount;
  }

  appendNode(nodeId) {
    const descriptor = vortexRegistry.getNode(nodeId);
    if (!descriptor) {
      alert(`unable to find node ${nodeId}`);
      return null;
    }
    const id = this.nextId();
    this.nodes.set(id, descriptor);

    this.drawNode(id);
    return id;
  }

  addPort(node, name, type, hasIn, hasOut, businessTerm) {
    const tpl = document.getElementById("vortex-port-row");
    const row = tpl.content.cloneNode(true);

    this.setText(row, ".field-name", name);

    // Business Term
    const btEl = row.querySelector(".business-term");
    if (businessTerm) {
      this.setText(row, ".business-term", businessTerm);
      // btEl.textContent = businessTerm;
      const sp = businessTerm.split("-", 2);
      btEl.classList.add(sp[0].toLowerCase());
    }

    const portIn = row.querySelector(".port.in");
    const portOut = row.querySelector(".port.out");

    if (hasIn) {
      portIn.dataset.type = type;
    } else portIn.remove();

    if (hasOut) {
      portOut.dataset.type = type;
    } else portOut.remove();

    node.querySelector(".node-ports").appendChild(row);
  }

  setText(el, selector, value) {
    el.querySelector(selector).textContent = value;
  }

  addWidget(container, nodeEl, widget) {
    if (widget.type === "button") {
      const tpl = document.getElementById("vortex-widget-button");
      const clone = tpl.content.cloneNode(true);
      const btn = clone.querySelector(".widget-button");
      btn.textContent = widget.label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (widget.onClick) widget.onClick(nodeEl);
      });
      container.appendChild(clone);
    } else if (widget.type === "text") {
      const tpl = document.getElementById("vortex-widget-text");
      const clone = tpl.content.cloneNode(true);
      clone.querySelector(".widget-label").textContent = widget.label;
      const input = clone.querySelector(".widget-input");
      input.dataset.name = widget.name;
      input.value = widget.value || "";
      input.placeholder = widget.placeholder || "";
      input.addEventListener("mousedown", (e) => e.stopPropagation());
      container.appendChild(clone);
    } else if (widget.type === "readonly") {
      const tpl = document.getElementById("vortex-widget-readonly");
      const clone = tpl.content.cloneNode(true);
      clone.querySelector(".widget-label").textContent = widget.label;
      const val = clone.querySelector(".widget-value");
      val.dataset.name = widget.name;
      val.textContent = widget.value || "";
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
    const descriptor = this.nodes.get(id);
    if (!descriptor) {
      alert(`Invalid graph, node ${id} missing!`);
      return;
    }
    const tpl = document.getElementById("vortex-node");
    const clone = tpl.content.cloneNode(true);
    const nodeEl = clone.querySelector(".vortex-node");

    nodeEl.dataset.id = id;
    nodeEl.dataset.type = descriptor.id;
    this.setText(nodeEl, ".node-header", descriptor.properties.type);

    if (descriptor.cssClass) nodeEl.classList.add(descriptor.cssClass);
    if (descriptor.size) {
      nodeEl.style.width = descriptor.size[0] + "px";
      nodeEl.style.height = descriptor.size[1] + "px";
    }

    for (const port of descriptor.ports) {
      this.addPort(
        nodeEl,
        port.name,
        port.type,
        port.hasIn,
        port.hasOut,
        port.businessTerm,
      );
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

    if (descriptor.widgets && descriptor.widgets.length > 0) {
      const slot = nodeEl.querySelector(".node-widgets-slot");
      slot.className = "node-widgets";
      for (const widget of descriptor.widgets) {
        this.addWidget(slot, nodeEl, widget);
      }
    }

    this.world.appendChild(nodeEl);
  }

  createLink(fromNode, fromName, toNode, toName) {
    // Guard : un port in ne reçoit qu'un seul lien
    const alreadyLinked = this.links.some(
      (l) => l.toNode === toNode && l.toName === toName,
    );
    if (alreadyLinked) return null;

    const link = { fromNode, fromName, toNode, toName };
    this.links.push(link);
    this.drawLink(link);
    return link;
  }

  drawLink(link) {
    const fromPort = this.findPort(link.fromNode, link.fromName, "out");
    const toPort = this.findPort(link.toNode, link.toName, "in");
    if (!fromPort || !toPort) return;

    const svg = this.world.querySelector("#vortex-links");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("vortex-link");
    svg.appendChild(path);

    link._path = path;
    link._fromPort = fromPort;
    link._toPort = toPort;
    this.updateLink(link);
  }

  findPort(nodeId, portName, direction) {
    const nodeEl = this.world.querySelector(
      `.vortex-node[data-id="${nodeId}"]`,
    );
    if (!nodeEl) return null;
    for (const row of nodeEl.querySelectorAll(".node-row")) {
      const name = row.querySelector(".field-name")?.textContent;
      if (name === portName) {
        return row.querySelector(`.port.${direction}`);
      }
    }
    return null;
  }

  updateLink(link) {
    if (!link._fromPort || !link._toPort || !link._path) return;
    const from = this.getPortCenter(link._fromPort);
    const to = this.getPortCenter(link._toPort);
    const dx = Math.abs(to.x - from.x) * 0.5;

    link._path.setAttribute(
      "d",
      `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`,
    );
  }

  removeLink(link) {
    const idx = this.links.indexOf(link);
    if (idx !== -1) this.links.splice(idx, 1);
    if (link._path) link._path.remove();
  }

  updateLinks() {
    for (const link of this.links) {
      this.updateLink(link);
    }
  }

  getPortCenter(port) {
    const rect = port.getBoundingClientRect();
    const worldRect = this.world.getBoundingClientRect();
    const zoom = this.zoomLevel || 1;
    return {
      x: (rect.left + rect.width / 2 - worldRect.left) / zoom,
      y: (rect.top + rect.height / 2 - worldRect.top) / zoom,
    };
  }

  fitWorld() {
    let maxX = 0,
      maxY = 0;
    for (const node of this.world.querySelectorAll(".vortex-node")) {
      const right = node.offsetLeft + node.offsetWidth + 200;
      const bottom = node.offsetTop + node.offsetHeight + 200;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    this.world.style.width =
      Math.max(maxX, this.world.parentElement.offsetWidth) + "px";
    this.world.style.height =
      Math.max(maxY, this.world.parentElement.offsetHeight) + "px";
  }

  // --- Serialization ---

  serialize(viewport) {
    const nodes = [];
    for (const [id, descriptor] of this.nodes) {
      const nodeEl = this.world.querySelector(`.vortex-node[data-id="${id}"]`);
      if (!nodeEl) continue;

      const nodeData = {
        id,
        type: descriptor.id,
        x: parseFloat(nodeEl.style.left) || 0,
        y: parseFloat(nodeEl.style.top) || 0,
        width: nodeEl.style.width ? parseFloat(nodeEl.style.width) : null,
        height: nodeEl.style.height ? parseFloat(nodeEl.style.height) : null,
      };

      // Collecter les valeurs des widgets depuis le DOM
      const widgetData = {};
      nodeEl.querySelectorAll('.widget-input').forEach(input => {
        widgetData[input.dataset.name] = input.value;
      });
      nodeEl.querySelectorAll('.widget-value').forEach(val => {
        widgetData[val.dataset.name] = val.textContent;
      });

      // Données spécifiques du node (serialize custom)
      if (descriptor.serialize) {
        nodeData.data = descriptor.serialize(nodeEl);
      }

      nodeData.widgets = widgetData;
      nodes.push(nodeData);
    }

    // Links — déjà de la data pure
    const links = this.links.map(l => ({
      fromNode: l.fromNode,
      fromName: l.fromName,
      toNode: l.toNode,
      toName: l.toName,
    }));

    return {
      version: 1,
      application: "VorteX",
      module: "Mapper",
      viewport,
      nodeCount: this.nodeCount,
      nodes,
      links,
    };
  }

  deserialize(data) {
    // Clear le graph actuel
    this.clearGraph();

    // Restaurer le compteur
    this.nodeCount = data.nodeCount || 0;

    // Recréer les nodes
    for (const nodeData of data.nodes) {
      const descriptor = vortexRegistry.getNode(nodeData.type);
      if (!descriptor) {
        console.error(`Node type not found: ${nodeData.type}`);
        continue;
      }

      this.nodes.set(nodeData.id, descriptor);
      this.drawNode(nodeData.id);

      const nodeEl = this.world.querySelector(`.vortex-node[data-id="${nodeData.id}"]`);
      if (!nodeEl) continue;

      // Restaurer position et taille
      nodeEl.style.left = nodeData.x + 'px';
      nodeEl.style.top = nodeData.y + 'px';
      if (nodeData.width) nodeEl.style.width = nodeData.width + 'px';
      if (nodeData.height) nodeEl.style.height = nodeData.height + 'px';

      // Restaurer les widgets
      if (nodeData.widgets) {
        for (const [name, value] of Object.entries(nodeData.widgets)) {
          const input = nodeEl.querySelector(`.widget-input[data-name="${name}"]`);
          if (input) { input.value = value; continue; }
          const readonly = nodeEl.querySelector(`.widget-value[data-name="${name}"]`);
          if (readonly) readonly.textContent = value;
        }
      }

      // Données spécifiques du node (deserialize custom)
      if (descriptor.deserialize && nodeData.data) {
        descriptor.deserialize(nodeEl, nodeData.data);
      }
    }

    // Recréer les liens
    for (const linkData of data.links) {
      this.createLink(linkData.fromNode, linkData.fromName, linkData.toNode, linkData.toName);
    }

    return data.viewport;
  }

  clearGraph() {
    // Supprimer tous les liens
    for (const link of [...this.links]) {
      this.removeLink(link);
    }
    // Supprimer tous les nodes du DOM
    this.world.querySelectorAll('.vortex-node').forEach(el => el.remove());
    // Vider le modèle
    this.nodes.clear();
    this.selection.clear();
    this.nodeCount = 0;
  }

  // --- Execution engine ---

  buildExecutionPlan() {
    // Construire le graphe de dépendances depuis les liens
    const nodeIds = [...this.nodes.keys()];
    const inDegree = new Map(); // nodeId → nombre de liens entrants
    const dependents = new Map(); // nodeId → [nodeIds qui en dépendent]

    for (const id of nodeIds) {
      inDegree.set(id, 0);
      dependents.set(id, []);
    }

    for (const link of this.links) {
      if (link.fromNode === link.toNode) continue;

      inDegree.set(link.toNode, inDegree.get(link.toNode) + 1);
      dependents.get(link.fromNode).push(link.toNode);
    }

    // Kahn — les sources (inDegree 0) en premier
    const queue = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const plan = [];
    while (queue.length > 0) {
      const id = queue.shift();
      plan.push(id);

      for (const depId of dependents.get(id)) {
        const newDegree = inDegree.get(depId) - 1;
        inDegree.set(depId, newDegree);
        if (newDegree === 0) queue.push(depId);
      }
    }

    if (plan.length !== nodeIds.length) {
      const missing = nodeIds.filter((id) => !plan.includes(id));
      console.error("Cycle detected! Nodes stuck:", missing);
    }

    return plan;
  }

  async executePlan() {
    console.log("executePlan started");
    const plan = this.buildExecutionPlan();
    console.log(plan);
    const nodeData = new Map(); // nodeId → { inputs: {}, outputs: {} }

    for (const nodeId of plan) {
      const nodeEl = this.world.querySelector(
        `.vortex-node[data-id="${nodeId}"]`,
      );
      const descriptor = this.nodes.get(nodeId);
      if (!nodeEl || !descriptor) continue;

      // 1. Résoudre les inputs depuis les liens
      const inputs = {};
      for (const link of this.links) {
        if (link.toNode !== nodeId) continue;
        const sourceData = nodeData.get(link.fromNode);
        if (sourceData && sourceData.outputs[link.fromName] !== undefined) {
          inputs[link.toName] = sourceData.outputs[link.fromName];
        }
      }

      // 2. onBeforeExecute → highlight
      nodeEl.classList.add("executing");
      await this.wait(50);

      // 3. Execute
      let outputs = {};
      try {
        if (descriptor.execute) {
          const result = descriptor.execute(inputs, nodeEl);
          outputs = result instanceof Promise ? await result : result;
        }
        nodeEl.classList.remove("executing");
        nodeEl.classList.add("executed");
      } catch (err) {
        console.error(`Error executing ${nodeId}:`, err);
        nodeEl.classList.remove("executing");
        nodeEl.classList.add("execute-error");
      }

      // 4. Stocker les outputs
      nodeData.set(nodeId, { inputs, outputs: outputs || {} });

      await this.wait(50);
    }

    // Cleanup highlights après 2s
    setTimeout(() => {
      this.world.querySelectorAll(".executed, .execute-error").forEach((el) => {
        el.classList.remove("executed", "execute-error");
      });
    }, 2000);

    return nodeData;
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  autoWire(sourceNodeId, targetNodeId) {
    const sourceDesc = this.nodes.get(sourceNodeId);
    const targetDesc = this.nodes.get(targetNodeId);
    if (!sourceDesc || !targetDesc) return;

    // Indexer les ports in du target par nom
    const targetPorts = new Map();
    for (const port of targetDesc.ports) {
      if (port.hasIn && port.name !== "_Self") {
        targetPorts.set(port.name, port);
      }
    }

    for (const port of sourceDesc.ports) {
      if (!port.hasOut || port.name === "_Self") continue;

      const target = targetPorts.get(port.name);
      if (!target) continue;

      // Même type ?
      if (port.type !== target.type) continue;

      // createLink gère le guard alreadyLinked
      this.createLink(sourceNodeId, port.name, targetNodeId, target.name);
    }
  }
}
