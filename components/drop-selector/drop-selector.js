// components/drop-selector/drop-selector.js
// Popup contextuelle pour sélectionner un node compatible après un drop dans le vide

import { vortexRegistry } from "../../vortex-registry.js";

let activeSelector = null;

export function install() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './components/drop-selector/drop-selector.css';
  document.head.appendChild(link);
}

/**
 * Affiche le drop selector
 * @param {number} x - position X (clientX)
 * @param {number} y - position Y (clientY)
 * @param {string} type - type du port source
 * @param {string} direction - 'in' ou 'out' (direction attendue sur le nouveau node)
 * @param {string} excludeType - type de node à exclure (le node source)
 * @param {function} onSelect - callback(match) appelé quand un node est sélectionné
 */
export function show(x, y, type, direction, excludeType, onSelect) {
  dismiss();

  const matches = vortexRegistry.findCompatibleNodes(type, direction, excludeType);
  if (matches.length === 0) return;

  const popup = document.createElement('div');
  popup.className = 'drop-selector';
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';

  const title = document.createElement('div');
  title.className = 'drop-selector-title';
  title.textContent = `${type} → ${direction}`;
  popup.appendChild(title);

  for (const match of matches) {
    const item = document.createElement('div');
    item.className = 'drop-selector-item';
    item.textContent = match.nodeId;

    item.addEventListener('click', () => {
      onSelect(match);
      dismiss();
    });

    popup.appendChild(item);
  }

  const onClickOutside = (e) => {
    if (!popup.contains(e.target)) {
      dismiss();
      document.removeEventListener('mousedown', onClickOutside);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', onClickOutside), 0);

  activeSelector = popup;
  document.body.appendChild(popup);
}

export function dismiss() {
  if (activeSelector) {
    activeSelector.remove();
    activeSelector = null;
  }
}
