import { vortexRegistry } from "../../vortex-registry.js";

export function install(module) {
  loadCSS();
  buildTree();
  registerSearch();
  registerDragDrop(module.canvas, module.world, module);
}

function loadCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './components/sidebar/sidebar.css';
  document.head.appendChild(link);
}

function buildTree() {
  const tree = vortexRegistry.getNodeTree();
  const container = document.getElementById("node-tree");
  container.innerHTML = "";

  const sortedCategories = Object.keys(tree).sort();

  for (const cat of sortedCategories) {
    const catEl = document.createElement("div");
    catEl.className = "tree-category collapsed";
    catEl.textContent = cat;
    catEl.addEventListener("click", () => catEl.classList.toggle("collapsed"));
    container.appendChild(catEl);

    const domainGroup = document.createElement("div");
    domainGroup.className = "tree-domain-group";

    const sortedDomains = Object.keys(tree[cat]).sort();

    for (const domain of sortedDomains) {
      const domainEl = document.createElement("div");
      domainEl.className = "tree-domain collapsed";
      domainEl.textContent = domain;
      domainEl.addEventListener("click", () =>
        domainEl.classList.toggle("collapsed"),
      );
      domainGroup.appendChild(domainEl);

      const nodeGroup = document.createElement("div");
      nodeGroup.className = "tree-node-group";

      for (const node of tree[cat][domain].sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const leaf = document.createElement("div");
        leaf.className = "tree-leaf";
        leaf.textContent = node.name;
        leaf.dataset.nodeId = node.id;
        leaf.draggable = true;

        leaf.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", node.id);
          leaf.classList.add("dragging");
        });

        leaf.addEventListener("dragend", () => {
          leaf.classList.remove("dragging");
        });

        nodeGroup.appendChild(leaf);
      }

      domainGroup.appendChild(nodeGroup);
    }

    container.appendChild(domainGroup);
  }
}

function registerSearch() {
  document.getElementById("node-search").addEventListener("input", (e) => {
    const filter = e.target.value.toLowerCase();
    const tree = document.getElementById("node-tree");

    tree.querySelectorAll(".tree-leaf").forEach((leaf) => {
      const match =
        leaf.textContent.toLowerCase().includes(filter) ||
        leaf.dataset.nodeId.toLowerCase().includes(filter);
      leaf.style.display = match ? "" : "none";
    });

    tree.querySelectorAll(".tree-node-group").forEach((group) => {
      const hasVisible = group.querySelector(
        '.tree-leaf:not([style*="display: none"])',
      );
      group.previousElementSibling.style.display = hasVisible ? "" : "none";
    });

    tree.querySelectorAll(".tree-domain-group").forEach((group) => {
      const hasVisible = group.querySelector(
        '.tree-domain:not([style*="display: none"])',
      );
      group.previousElementSibling.style.display = hasVisible ? "" : "none";
    });
  });
}

function registerDragDrop(canvas, world, module) {
  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    const nodeId = e.dataTransfer.getData("text/plain");
    if (!nodeId) return;

    const worldRect = world.getBoundingClientRect();
    const x = (e.clientX - worldRect.left) / module.zoomLevel;
    const y = (e.clientY - worldRect.top) / module.zoomLevel;

    const id = module.graph.appendNode(nodeId);
    const nodeEl = world.querySelector(`.vortex-node[data-id="${id}"]`);
    if (nodeEl) {
      nodeEl.style.left = x + "px";
      nodeEl.style.top = y + "px";
    }
  });
}
