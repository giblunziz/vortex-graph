// nodes/vortex-utility-nodes.js — Nodes utilitaires (LineCounter, etc.)

import { AbstractNode } from '../common/vortex-abstract-node.js';
import { WidgetFactory } from '../common/vortex-widget-factory.js';

class LineCounterNode extends AbstractNode {
    constructor() {
        super('vortex/LineCounter');
        this.properties = {
            type: 'LineCounter',
            domain: 'utility',
            category: 'vortex',
        };
        this.addPort('trigger', true, false, 'any');
        this.addPort('out', false, true, 'integer');
    }

    drawWidgets(container, nodeEl) {
        if (!this.data) this.data = {};
        const wv = this.data.widgetValues = this.data.widgetValues || {};

        const textDom = WidgetFactory.createWidget('text');
        const textLabel = textDom.querySelector('.widget-label');
        textLabel.textContent = 'gap';
        const textInput = textDom.querySelector('.widget-input');
        textInput.placeholder = '1';
        textInput.value = wv.gap ?? '1';
        textInput.addEventListener('mousedown', (e) => e.stopPropagation());
        textInput.addEventListener('input', (e) => {
            wv.gap = parseInt(e.target.value) || 1;
        });
        container.appendChild(textDom);
    }

    execute(inputs, nodeEl, node) {
        const wv = this.data?.widgetValues || {};
        const gap = wv.gap ?? 1;
        const index = inputs._iterationIndex ?? 0;

        return {
            out: index + gap,
        };
    }
}

class ListPushNode extends AbstractNode {
    constructor() {
        super('vortex/ListPush');
        this.properties = {
            type: 'ListPush',
            domain: 'utility',
            category: 'vortex',
        };
        this.addPort('item_0', true, false, 'raw');
        this.addPort('list', false, true, 'raw');
    }

    // Quand un port item est connecté → ajouter un port libre à la fin si nécessaire
    onPortConnected(portName, connectedPorts) {
        if (!portName.startsWith('item_')) return false;

        const itemPorts = this.ports.filter(p => p.name.startsWith('item_'));
        const hasFreeTail = itemPorts.length > 0
            && !connectedPorts.includes(itemPorts[itemPorts.length - 1].name);

        if (!hasFreeTail) {
            const nextIndex = itemPorts.length;
            const listIdx = this.ports.findIndex(p => p.name === 'list');
            const newPort = { name: `item_${nextIndex}`, hasIn: true, hasOut: false, type: 'raw', businessTerm: null, widget: null };
            this.ports.splice(listIdx, 0, newPort);
            return true;
        }

        return false;
    }

    // Quand un port item est déconnecté → compacter, garder un seul port libre à la fin
    onPortDisconnected(portName, connectedPorts) {
        if (!portName.startsWith('item_')) return false;

        const itemPorts = this.ports.filter(p => p.name.startsWith('item_'));
        const freeItems = itemPorts.filter(p => !connectedPorts.includes(p.name));

        // Toujours garder exactement 1 port libre à la fin
        if (freeItems.length <= 1) return false;

        // Retirer tous les ports libres sauf le dernier dans la liste des ports
        const toRemove = freeItems.slice(0, -1);
        for (const port of toRemove) {
            const idx = this.ports.indexOf(port);
            if (idx !== -1) this.ports.splice(idx, 1);
        }

        // Renuméroter et construire le rename map pour les liens
        this._portRenameMap = new Map();
        let itemIndex = 0;
        for (const port of this.ports) {
            if (port.name.startsWith('item_')) {
                const newName = `item_${itemIndex++}`;
                if (port.name !== newName) {
                    this._portRenameMap.set(port.name, newName);
                    port.name = newName;
                }
            }
        }

        return true;
    }

    execute(inputs, nodeEl, node) {
        const result = [];

        for (const port of node.ports) {
            if (!port.name.startsWith('item_')) continue;
            const value = inputs[port.name];
            if (value != null) {
                result.push(value);
            }
        }

        return { list: result };
    }

    // Deep copy des ports — les ports sont dynamiques, pas partagés par ref
    clone() {
        const instance = new ListPushNode();
        instance.properties = { ...this.properties };
        instance.ports = this.ports.map(p => ({ ...p }));
        return instance;
    }
}

export function registerUtilityNodes() {
    new LineCounterNode().register();
    new ListPushNode().register();
}