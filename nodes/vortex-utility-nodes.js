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

export function registerUtilityNodes() {
    new LineCounterNode().register();
}