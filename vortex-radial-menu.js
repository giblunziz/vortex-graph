// vortex-radial-menu.js — Menu radial contextuel

let activeMenu = null;

export function showRadialMenu(x, y, actions) {
  dismissRadialMenu();

  if (!actions || actions.length === 0) return;

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
      dismissRadialMenu();
    });

    menu.appendChild(a);
  });

  // Fermer si clic en dehors
  const onClickOutside = (e) => {
    if (!menu.contains(e.target)) {
      dismissRadialMenu();
      document.removeEventListener("mousedown", onClickOutside);
    }
  };

  // Fermer sur Escape
  const onEscape = (e) => {
    if (e.key === "Escape") {
      dismissRadialMenu();
      document.removeEventListener("keydown", onEscape);
    }
  };

  setTimeout(() => {
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
  }, 0);

  activeMenu = { el: menu, onClickOutside, onEscape };
  document.body.appendChild(menu);

  // Ouvrir avec animation au prochain frame
  requestAnimationFrame(() => menu.classList.add("open"));
}

export function dismissRadialMenu() {
  if (activeMenu) {
    document.removeEventListener("mousedown", activeMenu.onClickOutside);
    document.removeEventListener("keydown", activeMenu.onEscape);
    activeMenu.el.remove();
    activeMenu = null;
  }
}
