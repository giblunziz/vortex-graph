// vortex-transformer-node.js — Classe de base pour les nodes transformer
// Générée automatiquement par registerTransformer() — dual registration

import { AbstractNode } from './vortex-abstract-node.js';
import { WidgetFactory } from './vortex-widget-factory.js';
import { vortexRegistry } from '../vortex-registry.js';
import { transformerRegistry } from './vortex-transformer-registry.js';

/**
 * Crée et enregistre un transformer dans les deux registries :
 * - TransformerRegistry → pour le TransformerGroup et l'insertion sur lien
 * - VortexRegistry → comme node utilisable sur le canvas
 *
 * @param {object} def — définition du transformer
 * @param {string} def.id          — ex: 'string/Uppercase'
 * @param {string} def.label       — ex: 'Uppercase'
 * @param {string} def.domain      — ex: 'string'
 * @param {string} def.inputType   — ex: 'string'
 * @param {string} def.outputType  — ex: 'string' (si absent = inputType)
 * @param {Array}  [def.params]    — ex: [{ name: 'start', type: 'integer', default: 0, port: true }]
 * @param {Function} def.apply     — (value, params) => result
 */
export function registerTransformer(def) {
    const id = `vortex/${def.id}`;
    const outputType = def.outputType || def.inputType;

    // 1. Enregistrer dans le TransformerRegistry (pure function)
    transformerRegistry.register(id, {
        id,
        label: def.label,
        inputType: def.inputType,
        outputType,
        params: def.params || [],
        apply: def.apply,
    });

    // 2. Créer le node pour le canvas
    const node = new TransformerNode(id, def);
    node.register();
}

/**
 * Node transformer — généré automatiquement depuis la définition.
 * Hérite d'AbstractNode, porte les ports et widgets depuis def.
 */
class TransformerNode extends AbstractNode {
    constructor(id, def) {
        super(id || '');
        this._def = def || {};

        const outputType = this._def.outputType || this._def.inputType;

        this.properties = {
            type: this._def.label || '',
            domain: this._def.domain || '',
            category: 'vortex',
        };

        // Port principal : in → out
        this.addPort('in', true, false, this._def.inputType || 'string');
        this.addPort('out', false, true, outputType);

        // Ports secondaires pour les params avec port: true
        for (const param of this._def.params || []) {
            if (param.port) {
                this.addPort(param.name, true, false, param.type || 'string');
            }
        }
    }

    // Widgets pour les params (fallback si pas connecté)
    drawWidgets(container, nodeEl) {
        if (!this._def.params || this._def.params.length === 0) return;

        const wv = this.data.widgetValues = this.data.widgetValues || {};

        for (const param of this._def.params) {
            const widgetType = this.paramWidgetType(param.type);
            const dom = WidgetFactory.createWidget(widgetType);
            if (!dom) continue;

            const label = dom.querySelector('.widget-label');
            if (label) label.textContent = param.name;

            const input = dom.querySelector('.widget-input');
            if (input) {
                input.dataset.name = param.name;
                input.value = wv[param.name] ?? param.default ?? '';
                input.placeholder = param.name;
                input.addEventListener('mousedown', (e) => e.stopPropagation());
                input.addEventListener('input', () => { wv[param.name] = this.castValue(input.value, param.type); });
            }

            container.appendChild(dom);
        }
    }

    execute(inputs, nodeEl, node) {
        const value = inputs.in;
        const params = {};

        // Résoudre chaque param : input connecté → widget → default
        for (const param of this._def.params || []) {
            if (inputs[param.name] !== undefined) {
                params[param.name] = inputs[param.name];
            } else if (node.data.widgetValues && node.data.widgetValues[param.name] !== undefined) {
                params[param.name] = node.data.widgetValues[param.name];
            } else {
                params[param.name] = param.default;
            }
        }

        const result = this._def.apply(value, params);
        return { out: result };
    }

    // Clone — recréer avec la même def
    clone() {
        const instance = new TransformerNode(this.id, this._def);
        instance.properties = { ...this.properties };
        return instance;
    }

    // Helper — type de widget selon le type du param
    paramWidgetType(type) {
        switch (type) {
            case 'boolean': return 'checkbox';
            case 'dropdown': return 'dropdown';
            default: return 'text';
        }
    }

    // Helper — cast la valeur du widget vers le bon type
    castValue(value, type) {
        switch (type) {
            case 'integer': return parseInt(value) || 0;
            case 'long':    return parseInt(value) || 0;
            case 'float':   return parseFloat(value) || 0;
            case 'double':  return parseFloat(value) || 0;
            case 'boolean': return value === 'true' || value === true;
            default: return value;
        }
    }
}
