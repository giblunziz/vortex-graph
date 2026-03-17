// components/picker/picker.js
// Composant générique de sélection modale
// Affiche une liste d'items filtrables et retourne l'item sélectionné ou null

let installed = false;

export async function install() {
    if (installed) return;

    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './components/picker/picker.css';
    document.head.appendChild(link);

    // Templates HTML
    const res = await fetch('./components/picker/picker.html');
    const html = await res.text();
    const container = document.createElement('div');
    container.innerHTML = html;
    for (const tpl of container.querySelectorAll('template')) {
        document.body.appendChild(tpl);
    }

    installed = true;
}

/**
 * Affiche le picker modal et retourne l'item sélectionné.
 *
 * @param {object} options
 * @param {string} options.title          — Titre de la modale
 * @param {string} [options.subtitle]     — Sous-titre
 * @param {string} [options.actionLabel]  — Label du bouton par item (défaut: "Select")
 * @param {Array}  options.items          — Liste d'items à afficher
 * @param {string} options.items[].id     — Identifiant unique
 * @param {string} options.items[].label  — Titre affiché
 * @param {string} [options.items[].description] — Description
 * @param {string} [options.items[].icon]        — Emoji ou caractère
 * @param {Array}  [options.items[].badges]      — Badges texte ['Technical', 'MD']
 *
 * @returns {Promise<object|null>} — L'item sélectionné, ou null si annulé
 */
export function show(options) {
    return new Promise((resolve) => {
        const screenTpl = document.getElementById('vortex-picker-screen');
        const cardTpl = document.getElementById('vortex-picker-card');
        if (!screenTpl || !cardTpl) {
            console.error('VortexPicker: templates not found. Did you call install()?');
            resolve(null);
            return;
        }

        // Construire la modale
        const screen = screenTpl.content.cloneNode(true);
        const overlay = screen.querySelector('.vortex-picker-overlay');
        const picker = screen.querySelector('.vortex-picker');
        const titleEl = screen.querySelector('.picker-title');
        const subtitleEl = screen.querySelector('.picker-subtitle');
        const searchInput = screen.querySelector('.picker-search-input');
        const itemsContainer = screen.querySelector('.picker-items');
        const cancelBtn = screen.querySelector('.picker-cancel');
        const closeBtn = screen.querySelector('.picker-close');

        titleEl.textContent = options.title || '';
        subtitleEl.textContent = options.subtitle || '';
        if (!options.subtitle) subtitleEl.remove();

        const actionLabel = options.actionLabel || 'Select';

        // Fermer
        function close(result) {
            overlay.remove();
            resolve(result);
        }

        cancelBtn.addEventListener('click', () => close(null));
        closeBtn.addEventListener('click', () => close(null));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(null);
        });

        // Escape
        function onKeyDown(e) {
            if (e.key === 'Escape') {
                close(null);
                document.removeEventListener('keydown', onKeyDown);
            }
        }
        document.addEventListener('keydown', onKeyDown);

        // Rendre les cards
        function renderItems(filter) {
            itemsContainer.innerHTML = '';
            const query = (filter || '').toLowerCase();

            const filtered = options.items.filter(item => {
                if (!query) return true;
                const label = (item.label || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                return label.includes(query) || desc.includes(query);
            });

            if (filtered.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'picker-empty';
                empty.textContent = 'No results found.';
                itemsContainer.appendChild(empty);
                return;
            }

            for (const item of filtered) {
                const card = cardTpl.content.cloneNode(true);
                const cardEl = card.querySelector('.picker-card');
                const iconEl = card.querySelector('.picker-card-icon');
                const titleEl = card.querySelector('.picker-card-title');
                const descEl = card.querySelector('.picker-card-description');
                const badgesEl = card.querySelector('.picker-card-badges');
                const actionBtn = card.querySelector('.picker-card-action');

                iconEl.textContent = item.icon || '';
                if (!item.icon) iconEl.remove();

                titleEl.textContent = item.label || item.id;

                if (item.description) {
                    descEl.textContent = item.description;
                } else {
                    descEl.remove();
                }

                if (item.badges && item.badges.length > 0) {
                    for (const badge of item.badges) {
                        const span = document.createElement('span');
                        span.className = 'picker-badge';
                        span.textContent = badge;
                        badgesEl.appendChild(span);
                    }
                } else {
                    badgesEl.remove();
                }

                actionBtn.textContent = actionLabel;
                actionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    close(item);
                });

                cardEl.addEventListener('click', () => close(item));

                itemsContainer.appendChild(card);
            }
        }

        // Recherche
        searchInput.addEventListener('input', () => {
            renderItems(searchInput.value);
        });

        // Render initial
        renderItems('');

        // Afficher
        document.body.appendChild(overlay);

        // Focus sur la search bar
        searchInput.focus();
    });
}