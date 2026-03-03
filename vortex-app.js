import { VortexMapperModule } from "./modules/mapper/vortex-mapper.js";
import { vortexRegistry } from "./vortex-registry.js";

function buildContainer() {
  const canvas = document.getElementById("vortex");
  const world = document.createElement("div");
  world.id = "vortex-world";
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  svg.id = "vortex-links";
  world.appendChild(svg);
  canvas.appendChild(world);
  return { canvas, world, svg };
}

const { canvas, world, svg } = buildContainer();
const mapperModule = new VortexMapperModule(canvas, world, svg);

document.getElementById('execute-plan').addEventListener("click",() => mapperModule.graph.executePlan())

// --- Sidebar tree ---
function buildSidebarTree() {
  const tree = vortexRegistry.getNodeTree();
  const container = document.getElementById('node-tree');
  container.innerHTML = '';

  const sortedCategories = Object.keys(tree).sort();

  for (const cat of sortedCategories) {
    const catEl = document.createElement('div');
    catEl.className = 'tree-category';
    catEl.textContent = cat;
    catEl.addEventListener('click', () => catEl.classList.toggle('collapsed'));
    container.appendChild(catEl);

    const domainGroup = document.createElement('div');
    domainGroup.className = 'tree-domain-group';

    const sortedDomains = Object.keys(tree[cat]).sort();

    for (const domain of sortedDomains) {
      const domainEl = document.createElement('div');
      domainEl.className = 'tree-domain';
      domainEl.textContent = domain;
      domainEl.addEventListener('click', () => domainEl.classList.toggle('collapsed'));
      domainGroup.appendChild(domainEl);

      const nodeGroup = document.createElement('div');
      nodeGroup.className = 'tree-node-group';

      for (const node of tree[cat][domain].sort((a, b) => a.name.localeCompare(b.name))) {
        const leaf = document.createElement('div');
        leaf.className = 'tree-leaf';
        leaf.textContent = node.name;
        leaf.dataset.nodeId = node.id;
        leaf.draggable = true;

        leaf.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', node.id);
          leaf.classList.add('dragging');
        });

        leaf.addEventListener('dragend', () => {
          leaf.classList.remove('dragging');
        });

        nodeGroup.appendChild(leaf);
      }

      domainGroup.appendChild(nodeGroup);
    }

    container.appendChild(domainGroup);
  }
}

buildSidebarTree();

// --- Search filter ---
document.getElementById('node-search').addEventListener('input', (e) => {
  const filter = e.target.value.toLowerCase();
  const tree = document.getElementById('node-tree');

  tree.querySelectorAll('.tree-leaf').forEach(leaf => {
    const match = leaf.textContent.toLowerCase().includes(filter)
        || leaf.dataset.nodeId.toLowerCase().includes(filter);
    leaf.style.display = match ? '' : 'none';
  });

  // Show parent groups if any child matches
  tree.querySelectorAll('.tree-node-group').forEach(group => {
    const hasVisible = group.querySelector('.tree-leaf:not([style*="display: none"])');
    group.previousElementSibling.style.display = hasVisible ? '' : 'none';
  });

  tree.querySelectorAll('.tree-domain-group').forEach(group => {
    const hasVisible = group.querySelector('.tree-domain:not([style*="display: none"])');
    group.previousElementSibling.style.display = hasVisible ? '' : 'none';
  });
});

// --- Drag & drop from sidebar to graph ---
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  const nodeId = e.dataTransfer.getData('text/plain');
  if (!nodeId) return;

  const worldRect = world.getBoundingClientRect();
  const x = (e.clientX - worldRect.left) / mapperModule.zoomLevel;
  const y = (e.clientY - worldRect.top) / mapperModule.zoomLevel;

  const id = mapperModule.graph.appendNode(nodeId);
  const nodeEl = world.querySelector(`.vortex-node[data-id="${id}"]`);
  if (nodeEl) {
    nodeEl.style.left = x + 'px';
    nodeEl.style.top = y + 'px';
  }
});



