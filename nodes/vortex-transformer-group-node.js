// nodes/vortex-transformer-group-node.js — TransformerGroup : mini pipeline vertical inline
// Chaîne N transformers en séquence. Chaque transformer vient du TransformerRegistry.

import { AbstractNode } from '../common/vortex-abstract-node.js';
import { transformerRegistry } from '../common/vortex-transformer-registry.js';

class TransformerGroupNode extends AbstractNode {
    constructor() {
        super('vortex/TransformerGroup');
        this.properties = {
            type: 'TransformerGroup',
            domain: 'utility',
            category: 'vortex',
        };

        // Ports principaux — type dynamique, emprunte au lien connecté
        this.addPort('in', true, false, 'raw');
        this.addPort('out', false, true, 'raw');

        // Liste des transformers dans la chaîne (runtime)
        // Chaque entrée : { uid, transformerId, def }
        // Persisté dans this.data._chain (sans def — résolu depuis le registry)
        this._chain = [];

        // Compteur monotone — jamais de collision, jamais de renommage
        // Persisté dans this.data._nextUid
        this._nextUid = 0;
    }

    // ==========================================================
    // Type dynamique sur le port `in`
    // ==========================================================

    onPortConnected(portName, connectedPorts, fromType) {
        if (portName !== 'in') return false;

        const inPort = this.ports.find(p => p.name === 'in');
        const oldType = inPort.type;
        inPort.type = fromType || 'raw';

        // Type incompatible avec le premier transformer → purge
        if (this._chain.length > 0) {
            const firstDef = this._chain[0].def;
            if (firstDef.inputType !== inPort.type && firstDef.inputType !== '*' && firstDef.inputType !== 'raw') {
                this._purgeChain();
            }
        }

        this._updateOutType();
        return oldType !== inPort.type;
    }

    onPortDisconnected(portName, connectedPorts) {
        if (portName !== 'in') return false;

        // Retour à raw mais on garde les transformers
        const inPort = this.ports.find(p => p.name === 'in');
        inPort.type = 'raw';
        this._updateOutType();
        return true;
    }

    // ==========================================================
    // Gestion de la chaîne
    // ==========================================================

    addTransformer(transformerId) {
        const def = transformerRegistry.get(transformerId);
        if (!def) return null;

        const uid = this._nextUid++;
        const entry = { uid, transformerId, def };
        this._chain.push(entry);

        // Ajouter les ports params de ce transformer
        // this._addParamPorts(uid, def);

        this._updateOutType();
        this._syncDataChain();
        return entry;
    }

    removeTransformer(uid) {
        const idx = this._chain.findIndex(e => e.uid === uid);
        if (idx === -1) return false;

        // Retirer les ports params de ce transformer
        this.ports = this.ports.filter(p => p._uid !== uid);

        this._chain.splice(idx, 1);
        this._updateOutType();
        this._syncDataChain();
        return true;
    }

    _purgeChain() {
        // Retirer tous les ports params
        this.ports = this.ports.filter(p => p._uid === undefined);
        this._chain = [];
        this._syncDataChain();
    }

    _addParamPorts(uid, def) {
        for (const param of def.params || []) {
            if (param.port) {
                const portName = `${uid}_${param.name}`;
                const outPort = this.ports.find(p => p.name === 'out');
                const outIdx = this.ports.indexOf(outPort);
                // Insérer avant le port `out`
                this.ports.splice(outIdx, 0, {
                    name: portName,
                    hasIn: true,
                    hasOut: false,
                    type: param.type || 'string',
                    businessTerm: null,
                    widget: null,
                    _label: param.name,    // label affiché (sans le uid)
                    _uid: uid,             // pour le groupement visuel
                    _paramDef: param,      // référence à la def du param
                });
            }
        }
    }

    _updateOutType() {
        const outPort = this.ports.find(p => p.name === 'out');
        if (this._chain.length > 0) {
            const lastDef = this._chain[this._chain.length - 1].def;
            outPort.type = lastDef.outputType || lastDef.inputType;
        } else {
            const inPort = this.ports.find(p => p.name === 'in');
            outPort.type = inPort.type;
        }
    }

    // ==========================================================
    // Persistence — via node.data (save/load standard)
    // ==========================================================

    _syncDataChain() {
        if (!this.data) this.data = {};
        this.data._chain = this._chain.map(e => ({ uid: e.uid, transformerId: e.transformerId }));
        this.data._nextUid = this._nextUid;
    }

    _restoreChain() {
        this._nextUid = this.data._nextUid || 0;
        for (const entry of this.data._chain || []) {
            const def = transformerRegistry.get(entry.transformerId);
            if (!def) continue;

            this._chain.push({ uid: entry.uid, transformerId: entry.transformerId, def });
            this._addParamPorts(entry.uid, def);
        }
        this._updateOutType();
    }

    // ==========================================================
    // Filtrage des transformers disponibles
    // ==========================================================

    getAvailableTransformers() {
        const inPort = this.ports.find(p => p.name === 'in');
        // Pas connecté (raw par défaut) → liste vide
        if (inPort.type === 'raw') return [];

        const currentType = this._getCurrentInputType();
        return transformerRegistry.findByInputType(currentType);
    }

    _getCurrentInputType() {
        if (this._chain.length > 0) {
            const lastDef = this._chain[this._chain.length - 1].def;
            return lastDef.outputType || lastDef.inputType;
        }
        const inPort = this.ports.find(p => p.name === 'in');
        return inPort.type;
    }

    // ==========================================================
    // Widgets : liste des transformers + dropdown add
    // ==========================================================

    drawWidgets(container, nodeEl) {
        if (!this.data) this.data = {};
        this._nodeEl = nodeEl;
        const wv = this.data.widgetValues = this.data.widgetValues || {};

        // Restaurer la chaîne depuis data (après load / F5)
        if (this.data._chain && this._chain.length === 0) {
            this._restoreChain();
        }

        // Zone de la chaîne (drag/drop)
        const chainContainer = document.createElement('div');
        chainContainer.classList.add('transformer-group-chain');
        container.appendChild(chainContainer);

        this._renderChain(chainContainer, nodeEl);

        // Dropdown "Add transformer"
        const addRow = document.createElement('div');
        addRow.classList.add('transformer-group-add');

        const select = document.createElement('select');
        select.classList.add('widget-dropdown');
        select.addEventListener('mousedown', (e) => e.stopPropagation());

        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '+ Add transformer';
        emptyOpt.disabled = true;
        emptyOpt.selected = true;
        select.appendChild(emptyOpt);

        select.addEventListener('focus', () => {
            this._refreshAddDropdown(select);
        });

        select.addEventListener('change', (e) => {
            const id = e.target.value;
            if (!id) return;

            this.addTransformer(id);
            select.value = '';

            this._renderChain(chainContainer, nodeEl);
            this._refreshAddDropdown(select);

            // Notifier le graph pour redessiner les ports
            nodeEl.dispatchEvent(new CustomEvent('vortex-ports-changed', { bubbles: true }));
        });

        addRow.appendChild(select);
        container.appendChild(addRow);
    }

    _renderChain(chainContainer, nodeEl) {
        chainContainer.innerHTML = '';

        for (const entry of this._chain) {
            const row = document.createElement('div');
            row.classList.add('transformer-group-item');
            row.draggable = true;
            row.dataset.uid = entry.uid;

            // Label
            const label = document.createElement('span');
            label.classList.add('transformer-group-label');
            label.textContent = entry.def.label;
            row.appendChild(label);

            // Params inline (widgets pour les params de ce transformer)
            for (const param of entry.def.params || []) {
                const paramKey = `${entry.uid}_${param.name}`;
                const wv = this.data.widgetValues = this.data.widgetValues || {};

                const paramWrap = document.createElement('span');
                paramWrap.classList.add('transformer-group-param');

                const input = document.createElement('input');
                input.type = 'text';
                input.classList.add('transformer-group-param-input');
                input.placeholder = param.name;
                input.value = wv[paramKey] ?? param.default ?? '';
                input.addEventListener('mousedown', (e) => e.stopPropagation());
                input.addEventListener('input', () => {
                    wv[paramKey] = this._castValue(input.value, param.type);
                });

                paramWrap.appendChild(input);
                row.appendChild(paramWrap);
            }

            // Bouton supprimer
            const removeBtn = document.createElement('span');
            removeBtn.classList.add('transformer-group-remove');
            removeBtn.textContent = '✕';
            removeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            removeBtn.addEventListener('click', () => {
                this.removeTransformer(entry.uid);
                this._renderChain(chainContainer, nodeEl);

                // Notifier le graph pour redessiner les ports (params supprimés + type out)
                nodeEl.dispatchEvent(new CustomEvent('vortex-ports-changed', { bubbles: true }));
            });
            row.appendChild(removeBtn);

            // --- Drag/drop reorder (interne au widget, stop propagation) ---
            row.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('application/vortex-reorder', String(entry.uid));
                row.classList.add('dragging');
            });

            row.addEventListener('dragend', (e) => {
                e.stopPropagation();
                row.classList.remove('dragging');
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                row.classList.add('drag-over');
            });

            row.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                row.classList.remove('drag-over');
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                row.classList.remove('drag-over');

                const data = e.dataTransfer.getData('application/vortex-reorder');
                if (!data) return; // Pas un reorder interne → ignorer

                const draggedUid = parseInt(data);
                const targetUid = entry.uid;
                if (draggedUid === targetUid) return;

                this._reorderByDrop(draggedUid, targetUid);
                this._renderChain(chainContainer, nodeEl);

                // Notifier le graph (l'ordre des ports params peut changer)
                nodeEl.dispatchEvent(new CustomEvent('vortex-ports-changed', { bubbles: true }));
            });

            chainContainer.appendChild(row);
        }
    }

    _reorderByDrop(draggedUid, targetUid) {
        const draggedIdx = this._chain.findIndex(e => e.uid === draggedUid);
        const targetIdx = this._chain.findIndex(e => e.uid === targetUid);
        if (draggedIdx === -1 || targetIdx === -1) return;

        const [entry] = this._chain.splice(draggedIdx, 1);
        this._chain.splice(targetIdx, 0, entry);
        this._updateOutType();
        this._syncDataChain();
    }

    _refreshAddDropdown(select) {
        const available = this.getAvailableTransformers();
        while (select.options.length > 1) select.remove(1);

        for (const t of available) {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.label;
            select.appendChild(opt);
        }
    }

    // ==========================================================
    // Execute : reduce séquentiel
    // ==========================================================

    execute(inputs, nodeEl, node) {
        let value = inputs.in;
        const wv = node.data?.widgetValues || {};

        for (const entry of this._chain) {
            // Résoudre les params : port connecté → widget → default
            const params = {};
            for (const param of entry.def.params || []) {
                const portName = `${entry.uid}_${param.name}`;
                if (inputs[portName] !== undefined) {
                    params[param.name] = inputs[portName];
                } else if (wv[portName] !== undefined) {
                    params[param.name] = wv[portName];
                } else {
                    params[param.name] = param.default;
                }
            }

            value = entry.def.apply(value, params);
        }

        return { out: value };
    }

    // ==========================================================
    // Clone : deep copy
    // ==========================================================

    clone() {
        const instance = new TransformerGroupNode();
        instance.properties = { ...this.properties };
        instance.ports = this.ports.map(p => ({ ...p }));
        instance._chain = this._chain.map(e => ({
            uid: e.uid,
            transformerId: e.transformerId,
            def: e.def,
        }));
        instance._nextUid = this._nextUid;
        return instance;
    }

    // ==========================================================
    // Helper
    // ==========================================================

    _castValue(value, type) {
        switch (type) {
            case 'integer': {
                const parsed = parseInt(value);
                return Number.isNaN(parsed) ? null : parsed;
            }
            case 'long': {
                const parsed = parseInt(value);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
            case 'float':
            case 'double': {
                const parsed = parseFloat(value);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
            case 'boolean': return value === 'true' || value === true;
            default: return value;
        }
    }
}

export function registerTransformerGroupNode() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './nodes/vortex-transformer-group-node.css';
    document.head.appendChild(link);
    new TransformerGroupNode().register();
}