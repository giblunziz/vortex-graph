// modules/mapper/actions/expand-action.js
// Actions contextuelles : Expand Out / Expand In — déploie les sous-objets d'un ModelNode

import { ModelNode } from '../../../common/vortex-model-node.js';
import { vortexRegistry } from '../../../vortex-registry.js';

const NODE_WIDTH = 250;
const HORIZONTAL_GAP = 100;
const VERTICAL_GAP = 20;

export const ExpandOutAction = {
    id: 'expand-out',
    label: 'Expand Out',
    icon: '➡️',
    context: 'node',

    getContextActions(nodeId, node, graph) {
        if (!(node instanceof ModelNode)) return [];
        if (!hasCompositePorts(node, 'out')) return [];

        return [{
            id: this.id,
            label: this.label,
            icon: this.icon,
            callback: () => expand(graph, nodeId, node, 'out'),
        }];
    },
};

export const ExpandInAction = {
    id: 'expand-in',
    label: 'Expand In',
    icon: '⬅️',
    context: 'node',

    getContextActions(nodeId, node, graph) {
        if (!(node instanceof ModelNode)) return [];
        if (!hasCompositePorts(node, 'in')) return [];

        return [{
            id: this.id,
            label: this.label,
            icon: this.icon,
            callback: () => expand(graph, nodeId, node, 'in'),
        }];
    },
};

// --- Implémentation commune ---

function hasCompositePorts(node, direction) {
    return node.ports.some(p =>
        p.name !== '_Self'
        && p.type?.includes('/')
        && (direction === 'out' ? p.hasOut : p.hasIn)
    );
}

function expand(graph, nodeId, node, direction) {
    graph.syncNodePosition(nodeId);

    const state = { nextY: node.y || 0 };

    for (const port of node.ports) {
        if (port.name === '_Self') continue;
        if (!port.type?.includes('/')) continue;
        if (direction === 'out' ? !port.hasOut : !port.hasIn) continue;

        // Vérifier que le type existe dans le registry
        const descriptor = vortexRegistry.getNode(port.type);
        if (!descriptor) continue;

        // Vérifier qu'un lien n'existe pas déjà sur ce port
        const alreadyLinked = direction === 'out'
            ? graph.links.some(l => l.fromNode === nodeId && l.fromName === port.name)
            : graph.links.some(l => l.toNode === nodeId && l.toName === port.name);
        if (alreadyLinked) continue;

        // Créer le child node
        const childId = graph.appendNode(port.type);
        if (!childId) continue;

        const childNode = graph.nodes.get(childId);
        const childEl = graph.world.querySelector(`.vortex-node[data-id="${childId}"]`);
        if (!childEl) continue;

        // Positionner
        const x = direction === 'out'
            ? (node.x || 0) + NODE_WIDTH + HORIZONTAL_GAP
            : (node.x || 0) - NODE_WIDTH - HORIZONTAL_GAP;

        const y = state.nextY;

        childEl.style.left = Math.max(0, x) + 'px';
        childEl.style.top = y + 'px';
        graph.syncNodePosition(childId);

        state.nextY += estimateNodeHeight(childNode) + VERTICAL_GAP;

        // Câbler selon la direction
        if (direction === 'out') {
            // parent.port (out) → child._Self (in)
            graph.createLink(nodeId, port.name, childId, '_Self');
        } else {
            // child._Self (out) → parent.port (in)
            graph.createLink(childId, '_Self', nodeId, port.name);
        }
    }

    graph.updateLinks();
    graph.fitWorld();
    graph.notifyChange();
}

function estimateNodeHeight(node) {
    const portCount = node.ports ? node.ports.length : 1;
    return 40 + portCount * 22 + 20;
}