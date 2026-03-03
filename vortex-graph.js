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

  nextId() {
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

  addPort(node, name, type, hasIn, hasOut) {
    const tpl = document.getElementById("vortex-port-row");
    const row = tpl.content.cloneNode(true);

    this.setText(row, ".field-name", name);

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

    for (const port of descriptor.ports) {
      this.addPort(nodeEl, port.name, port.type, port.hasIn, port.hasOut);
    }

    this.world.appendChild(nodeEl);
  }

createLink(fromPortEl, toPortEl) {
  console.log("adding link from",fromPortEl,"to",toPortEl)
    const svg = this.world.querySelector('#vortex-links');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('vortex-link');
    svg.appendChild(path);

    const link = { path, fromPort: fromPortEl, toPort: toPortEl };
    this.links.push(link);
    this.updateLink(link);
    console.log("links", this.links)
    return link;
}

updateLink(link) {
    const from = this.getPortCenter(link.fromPort);
    const to = this.getPortCenter(link.toPort);
    const dx = Math.abs(to.x - from.x) * 0.5;

    link.path.setAttribute('d',
        `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`
    );
}

removeLink(link) {
    const idx = this.links.indexOf(link);
    if (idx !== -1) this.links.splice(idx, 1);
}

updateLinks() {
    for (const link of this.links) {
        this.updateLink(link);
    }
}

getPortCenter(port) {
    const rect = port.getBoundingClientRect();
    const worldRect = this.world.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2 - worldRect.left,
        y: rect.top + rect.height / 2 - worldRect.top
    }
  }

  autoWire(sourceNodeEl, targetNodeEl) {
    const sourceRows = sourceNodeEl.querySelectorAll('.node-row');
    const targetRows = targetNodeEl.querySelectorAll('.node-row');

    // Indexer les ports in du target par nom
    const targetPortsByName = new Map();
    for (const row of targetRows) {
      const name = row.querySelector('.field-name')?.textContent;
      const portIn = row.querySelector('.port.in');
      if (name && portIn && name !== '_Self') {
        targetPortsByName.set(name, portIn);
      }
    }

    for (const row of sourceRows) {
      const name = row.querySelector('.field-name')?.textContent;
      const portOut = row.querySelector('.port.out');
      if (!name || !portOut || name === '_Self') continue;

      const targetIn = targetPortsByName.get(name);
      if (!targetIn) continue;

      // Même type ?
      if (portOut.dataset.type !== targetIn.dataset.type) continue;

      // Déjà linké ? On ne touche pas
      const alreadyLinked = this.links.some(l => l.toPort === targetIn);
      if (alreadyLinked) continue;

      this.createLink(portOut, targetIn);
    }
  }

}
