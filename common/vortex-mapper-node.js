// common/vortex-mapper-node.js — Node canvas pour un mapper généré
// Similaire à ModelNode mais nodeType='mapper', ports in/out directionnels

import { AbstractNode } from './vortex-abstract-node.js';

export class MapperNode extends AbstractNode {
    constructor(type, domain, category, source, target, ready, javaType, identity) {
        super(type || '');
        this.properties = {
            type:     type     || '',
            domain:   domain   || '',
            category: category || 'mapper',
            nodeType: 'mapper',
            source,
            target,
            ready:    ready    ?? false,
            javaType: javaType || '',
            identity: identity || null,
        };
        this._lastInputs = null;
        this._lastOutput = null;
    }

    async execute(inputs, nodeEl, node, graph) {
        const data = inputs.in;

        // Cache anti-rebond — pas d'appel si les données n'ont pas changé
        const inputHash = JSON.stringify(data);
        if (inputHash === this._lastInputs) return { out: this._lastOutput };
        this._lastInputs = inputHash;

        const baseUrl = graph?.baseUrl ?? 'http://localhost:8080';
        const response = await fetch(`${baseUrl}/api/vortex/mapper-call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                javaType: node.properties.javaType,
                identity: node.properties.identity,
                data,
            }),
        });

        if (!response.ok) {
            this._lastInputs = null
            throw new Error(`mapper-call failed [${node.properties.type}]: ${response.status}`);
        }

        const result = await response.json();
        this._lastOutput = result;
        return { out: result };
    }

    clone() {
        const instance = new MapperNode(
            this.properties.type,
            this.properties.domain,
            this.properties.category,
            this.properties.source,
            this.properties.target,
            this.properties.ready,
            this.properties.javaType,
            this.properties.identity,
        );
        instance.ports = this.ports.map(p => ({ ...p }));
        return instance;
    }

    serializeData() {
        return null;
    }

    deserializeData() {}
}
