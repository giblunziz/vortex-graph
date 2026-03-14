// nodes/vortex-number-nodes.js — Transformers de type number/math
// Dual registration : node canvas + transformer registry

import { registerTransformer } from '../common/vortex-transformer-node.js';

export function registerNumberNodes() {

    // ============================================================
    // Arithmétique basique (scalaire → scalaire)
    // ============================================================

    registerTransformer({
        id: 'number/Add',
        label: 'Add',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        params: [
            { name: 'operand', type: 'double', default: 0, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return Number(value) + Number(params.operand);
        },
    });

    registerTransformer({
        id: 'number/Subtract',
        label: 'Subtract',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        params: [
            { name: 'operand', type: 'double', default: 0, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return Number(value) - Number(params.operand);
        },
    });

    registerTransformer({
        id: 'number/Multiply',
        label: 'Multiply',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        params: [
            { name: 'operand', type: 'double', default: 1, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return Number(value) * Number(params.operand);
        },
    });

    registerTransformer({
        id: 'number/Divide',
        label: 'Divide',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        params: [
            { name: 'divisor', type: 'double', default: 1, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            const d = Number(params.divisor);
            return d !== 0 ? Number(value) / d : null;
        },
    });

    registerTransformer({
        id: 'number/Modulo',
        label: 'Modulo',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        params: [
            { name: 'divisor', type: 'double', default: 1, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            const d = Number(params.divisor);
            return d !== 0 ? Number(value) % d : null;
        },
    });

    registerTransformer({
        id: 'number/Power',
        label: 'Power',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        params: [
            { name: 'exponent', type: 'double', default: 2, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return Math.pow(Number(value), Number(params.exponent));
        },
    });

    registerTransformer({
        id: 'number/Negate',
        label: 'Negate',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        apply: (value) => value != null ? -Number(value) : null,
    });

    registerTransformer({
        id: 'number/Abs',
        label: 'Abs',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        apply: (value) => value != null ? Math.abs(Number(value)) : null,
    });

    // ============================================================
    // Arrondi (scalaire → scalaire)
    // ============================================================

    registerTransformer({
        id: 'number/Round',
        label: 'Round',
        domain: 'math',
        inputType: 'double',
        outputType: 'double',
        params: [
            { name: 'decimals', type: 'integer', default: 0, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            const factor = Math.pow(10, Number(params.decimals) || 0);
            return Math.round(Number(value) * factor) / factor;
        },
    });

    registerTransformer({
        id: 'number/Floor',
        label: 'Floor',
        domain: 'math',
        inputType: 'double',
        outputType: 'integer',
        apply: (value) => value != null ? Math.floor(Number(value)) : null,
    });

    registerTransformer({
        id: 'number/Ceil',
        label: 'Ceil',
        domain: 'math',
        inputType: 'double',
        outputType: 'integer',
        apply: (value) => value != null ? Math.ceil(Number(value)) : null,
    });

    registerTransformer({
        id: 'number/ToFixed',
        label: 'ToFixed',
        domain: 'math',
        inputType: 'double',
        outputType: 'string',
        params: [
            { name: 'decimals', type: 'integer', default: 2, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return Number(value).toFixed(Number(params.decimals) || 0);
        },
    });

    // ============================================================
    // Agrégation (array → scalaire)
    // inputType: 'raw' pour accepter un array
    // ============================================================

    registerTransformer({
        id: 'number/Sum',
        label: 'Sum',
        domain: 'math',
        inputType: 'raw',
        outputType: 'double',
        apply: (value) => {
            if (!Array.isArray(value)) return value != null ? Number(value) : 0;
            return value.reduce((acc, v) => acc + (Number(v) || 0), 0);
        },
    });

    registerTransformer({
        id: 'number/Average',
        label: 'Average',
        domain: 'math',
        inputType: 'raw',
        outputType: 'double',
        apply: (value) => {
            if (!Array.isArray(value) || value.length === 0) return value != null ? Number(value) : 0;
            return value.reduce((acc, v) => acc + (Number(v) || 0), 0) / value.length;
        },
    });

    registerTransformer({
        id: 'number/Min',
        label: 'Min',
        domain: 'math',
        inputType: 'raw',
        outputType: 'double',
        apply: (value) => {
            if (!Array.isArray(value)) return value != null ? Number(value) : null;
            if (value.length === 0) return null;
            return Math.min(...value.map(v => Number(v)));
        },
    });

    registerTransformer({
        id: 'number/Max',
        label: 'Max',
        domain: 'math',
        inputType: 'raw',
        outputType: 'double',
        apply: (value) => {
            if (!Array.isArray(value)) return value != null ? Number(value) : null;
            if (value.length === 0) return null;
            return Math.max(...value.map(v => Number(v)));
        },
    });

    registerTransformer({
        id: 'number/Count',
        label: 'Count',
        domain: 'math',
        inputType: 'raw',
        outputType: 'integer',
        apply: (value) => {
            if (!Array.isArray(value)) return value != null ? 1 : 0;
            return value.length;
        },
    });

    // ============================================================
    // Conversion
    // ============================================================

    registerTransformer({
        id: 'number/ParseInt',
        label: 'ParseInt',
        domain: 'math',
        inputType: 'string',
        outputType: 'integer',
        apply: (value) => {
            if (value == null) return null;
            const n = parseInt(String(value), 10);
            return isNaN(n) ? null : n;
        },
    });

    registerTransformer({
        id: 'number/ParseFloat',
        label: 'ParseFloat',
        domain: 'math',
        inputType: 'string',
        outputType: 'double',
        apply: (value) => {
            if (value == null) return null;
            const n = parseFloat(String(value));
            return isNaN(n) ? null : n;
        },
    });

    registerTransformer({
        id: 'number/ToString',
        label: 'ToString',
        domain: 'math',
        inputType: 'raw',
        outputType: 'string',
        apply: (value) => {
            if (value == null) return null;
            return String(value);
        },
    });
}
