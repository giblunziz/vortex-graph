// nodes/vortex-string-nodes.js — Transformers de type string
// Dual registration : node canvas + transformer registry

import { registerTransformer } from '../common/vortex-transformer-node.js';

export function registerStringNodes() {

    // --- Sans paramètres ---

    registerTransformer({
        id: 'string/Uppercase',
        label: 'Uppercase',
        domain: 'string',
        inputType: 'string',
        apply: (value) => value != null ? String(value).toUpperCase() : null,
    });

    registerTransformer({
        id: 'string/Lowercase',
        label: 'Lowercase',
        domain: 'string',
        inputType: 'string',
        apply: (value) => value != null ? String(value).toLowerCase() : null,
    });

    registerTransformer({
        id: 'string/Trim',
        label: 'Trim',
        domain: 'string',
        inputType: 'string',
        apply: (value) => value != null ? String(value).trim() : null,
    });

    registerTransformer({
        id: 'string/TrimStart',
        label: 'TrimStart',
        domain: 'string',
        inputType: 'string',
        apply: (value) => value != null ? String(value).trimStart() : null,
    });

    registerTransformer({
        id: 'string/TrimEnd',
        label: 'TrimEnd',
        domain: 'string',
        inputType: 'string',
        apply: (value) => value != null ? String(value).trimEnd() : null,
    });

    registerTransformer({
        id: 'string/Length',
        label: 'Length',
        domain: 'string',
        inputType: 'string',
        outputType: 'integer',
        apply: (value) => value != null ? String(value).length : 0,
    });

    registerTransformer({
        id: 'string/Reverse',
        label: 'Reverse',
        domain: 'string',
        inputType: 'string',
        apply: (value) => value != null ? String(value).split('').reverse().join('') : null,
    });

    // --- Avec paramètres ---

    registerTransformer({
        id: 'string/Substring',
        label: 'Substring',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'start', type: 'integer', default: 0, port: true },
            { name: 'end',   type: 'integer', default: null, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            const s = String(value);
            return params.end != null ? s.substring(params.start, params.end) : s.substring(params.start);
        },
    });

    registerTransformer({
        id: 'string/Replace',
        label: 'Replace',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'search',  type: 'string', default: '', port: true },
            { name: 'replace',  type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return String(value).replaceAll(params.search, params.replace);
        },
    });

    registerTransformer({
        id: 'string/ReplaceFirst',
        label: 'ReplaceFirst',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'search',  type: 'string', default: '', port: true },
            { name: 'replace',  type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return String(value).replace(params.search, params.replace);
        },
    });

    registerTransformer({
        id: 'string/PadStart',
        label: 'PadStart',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'length', type: 'integer', default: 10, port: true },
            { name: 'fill',   type: 'string',  default: '0', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return String(value).padStart(params.length, params.fill);
        },
    });

    registerTransformer({
        id: 'string/PadEnd',
        label: 'PadEnd',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'length', type: 'integer', default: 10, port: true },
            { name: 'fill',   type: 'string',  default: ' ', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return String(value).padEnd(params.length, params.fill);
        },
    });

    registerTransformer({
        id: 'string/Concat',
        label: 'Concat',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'suffix', type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return String(value) + (params.suffix ?? '');
        },
    });

    registerTransformer({
        id: 'string/Prepend',
        label: 'Prepend',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'prefix', type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return (params.prefix ?? '') + String(value);
        },
    });

    registerTransformer({
        id: 'string/Split',
        label: 'Split',
        domain: 'string',
        inputType: 'string',
        outputType: 'raw',
        params: [
            { name: 'separator', type: 'string', default: ',', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return String(value).split(params.separator);
        },
    });

    registerTransformer({
        id: 'string/CharAt',
        label: 'CharAt',
        domain: 'string',
        inputType: 'string',
        params: [
            { name: 'index', type: 'integer', default: 0, port: true },
        ],
        apply: (value, params) => {
            if (value == null) return null;
            return String(value).charAt(params.index);
        },
    });

    registerTransformer({
        id: 'string/StartsWith',
        label: 'StartsWith',
        domain: 'string',
        inputType: 'string',
        outputType: 'boolean',
        params: [
            { name: 'search', type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return false;
            return String(value).startsWith(params.search);
        },
    });

    registerTransformer({
        id: 'string/EndsWith',
        label: 'EndsWith',
        domain: 'string',
        inputType: 'string',
        outputType: 'boolean',
        params: [
            { name: 'search', type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return false;
            return String(value).endsWith(params.search);
        },
    });

    registerTransformer({
        id: 'string/Contains',
        label: 'Contains',
        domain: 'string',
        inputType: 'string',
        outputType: 'boolean',
        params: [
            { name: 'search', type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return false;
            return String(value).includes(params.search);
        },
    });

    registerTransformer({
        id: 'string/IndexOf',
        label: 'IndexOf',
        domain: 'string',
        inputType: 'string',
        outputType: 'integer',
        params: [
            { name: 'search', type: 'string', default: '', port: true },
        ],
        apply: (value, params) => {
            if (value == null) return -1;
            return String(value).indexOf(params.search);
        },
    });

    // --- Case transformers ---

    registerTransformer({
        id: 'string/CamelCase',
        label: 'camelCase',
        domain: 'string',
        inputType: 'string',
        apply: (value) => {
            if (value == null) return null;
            return toWords(value)
                .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join('');
        },
    });

    registerTransformer({
        id: 'string/PascalCase',
        label: 'PascalCase',
        domain: 'string',
        inputType: 'string',
        apply: (value) => {
            if (value == null) return null;
            return toWords(value)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join('');
        },
    });

    registerTransformer({
        id: 'string/KebabCase',
        label: 'kebab-case',
        domain: 'string',
        inputType: 'string',
        apply: (value) => {
            if (value == null) return null;
            return toWords(value).map(w => w.toLowerCase()).join('-');
        },
    });

    registerTransformer({
        id: 'string/SnakeCase',
        label: 'snake_case',
        domain: 'string',
        inputType: 'string',
        apply: (value) => {
            if (value == null) return null;
            return toWords(value).map(w => w.toLowerCase()).join('_');
        },
    });
}

// --- Helper : découpe une string en mots ---
// Gère : camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE, espaces, mixtes
function toWords(str) {
    return String(str)
        .replace(/([a-z])([A-Z])/g, '$1 $2')       // camelCase → camel Case
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // XMLParser → XML Parser
        .replace(/[_\-]+/g, ' ')                     // snake_case / kebab-case → espaces
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0);
}
