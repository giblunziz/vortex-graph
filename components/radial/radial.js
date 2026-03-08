// components/radial/radial.js — Menu radial contextuel

let activeMenu = null;

export function install(module) {
  loadCSS();
  registerContextMenu(module);
}

function loadCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './components/radial/radial.css';
  document.head.appendChild(link);
}

function registerContextMenu(module) {
  module.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const target = resolveTarget(e, module);
    const actions = module.getContextActions(target);

    if (actions && actions.length > 0) {
      show(e.clientX, e.clientY, actions);
    }
  });
}

// Résoudre le contexte du clic droit
function resolveTarget(e, module) {
  const graph = module.graph;

  // Priorité 1 : sélection multiple
  const selected = graph.getSelectedNodes();
  if (selected.length > 1) {
    return { type: 'selection', nodeIds: selected };
  }

  // Priorité 2 : élément sous le curseur
  const node = e.target.closest('.vortex-node');
  if (node) {
    return { type: 'node', nodeId: node.dataset.id };
  }

  const linkPath = e.target.closest('.vortex-link');
  if (linkPath) {
    const link = graph.links.find(l => l._path === linkPath);
    if (link) return { type: 'link', link };
  }

  // Priorité 3 : canvas vide
  return { type: 'canvas' };
}

function show(x, y, actions) {
  dismiss();

  const menu = document.createElement("div");
  menu.className = "radial-menu";
  menu.style.left = x + "px";
  menu.style.top = y + "px";
  menu.style.setProperty("--count", actions.length);

  actions.forEach((action, i) => {
    const a = document.createElement("a");
    a.className = "radial-item";
    a.title = action.label;
    a.style.setProperty("--index", i);

    if (action.icon) {
      a.innerHTML = action.icon;
    } else {
      a.textContent = action.label.charAt(0).toUpperCase();
    }

    a.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      action.callback();
      dismiss();
    });

    menu.appendChild(a);
  });

  // Fermer si clic en dehors
  const onClickOutside = (e) => {
    if (!menu.contains(e.target)) {
      dismiss();
    }
  };

  // Fermer sur Escape
  const onEscape = (e) => {
    if (e.key === "Escape") {
      dismiss();
    }
  };

  setTimeout(() => {
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
  }, 0);

  activeMenu = { el: menu, onClickOutside, onEscape };
  document.body.appendChild(menu);

  requestAnimationFrame(() => menu.classList.add("open"));
}

function dismiss() {
  if (activeMenu) {
    document.removeEventListener("mousedown", activeMenu.onClickOutside);
    document.removeEventListener("keydown", activeMenu.onEscape);
    activeMenu.el.remove();
    activeMenu = null;
  }
}
