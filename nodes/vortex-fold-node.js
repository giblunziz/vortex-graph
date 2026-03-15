import { AbstractNode } from '../common/vortex-abstract-node.js';
import { vortexRegistry } from '../vortex-registry.js';
import { ModelNode } from '../common/vortex-model-node.js';

export class FoldNode extends AbstractNode {
    constructor() {
        super('vortex/FoldNode');
        this.properties = {
            type: 'FoldNode',
            domain: 'fold',
            category: 'vortex',
        };
        this.mode = 'virtual';
    }

    // Ports dynamiques — deep copy obligatoire
    clone() {
        const instance = new FoldNode();
        instance.id = this.id;
        instance.ports = this.ports.map(p => ({ ...p }));
        instance.properties = { ...this.properties };
        return instance;
    }

    // Ports font partie du modèle, pas de la data — sauvés au niveau racine
    serialize() {
        const base = super.serialize();
        base.ports = this.ports.map(p => ({ ...p }));
        return base;
    }

    deserialize(saved) {
        super.deserialize(saved);
        if (saved.ports) this.ports = saved.ports.map(p => ({ ...p }));
    }

    // data = foldedNodes + originalPosition uniquement
    serializeData() {
        return {
            foldedNodes: [...(this.data.foldedNodes || [])],
            originalPosition: { ...(this.data.originalPosition || {}) },
        };
    }

    deserializeData(data) {
        if (!data) return;
        this.data.foldedNodes = data.foldedNodes || [];
        this.data.originalPosition = data.originalPosition || {};
    }

    // Action contextuelle — Unfold depuis le menu radial
    contextActions(nodeId, graph) {
        return [
            {
                id: 'unfold', label: 'Unfold', icon: '▲',
                callback: () => this.unfold(graph, nodeId),
            },
        ];
    }

    // Action contextuelle sur une sélection — Fold si 2 ModelNodes sélectionnés
    static contextActionsGroup(selectedIds, graph) {
        if (selectedIds.length !== 2) return [];
        const bothModel = selectedIds.every(id => graph.nodes.get(id) instanceof ModelNode);
        if (!bothModel) return [];
        return [
            {
                id: 'fold', label: 'Fold', icon: '▼',
                callback: () => FoldNode.fold(graph, selectedIds[0], selectedIds[1]),
            },
        ];
    }

    // Unfold — le FoldNode sait tout de lui-même
    unfold(graph, foldNodeId) {
        graph.syncNodePosition(foldNodeId);
        const deltaX = this.x - this.data.originalPosition.x;
        const deltaY = this.y - this.data.originalPosition.y;

        // Supprimer les visualLinks du FoldNode (data + SVG)
        const foldLinks = graph.visualLinks.filter(l => l.fromNode === foldNodeId || l.toNode === foldNodeId);
        for (const l of foldLinks) {
            if (l._path) l._path.remove();
        }
        graph.visualLinks = graph.visualLinks.filter(l => l.fromNode !== foldNodeId && l.toNode !== foldNodeId);

        // Restaurer les nodes internes avec déplacement relatif
        for (const id of this.data.foldedNodes) {
            const node = graph.nodes.get(id);
            if (!node) continue;
            node.mode = 'active';
            node.x += deltaX;
            node.y += deltaY;
            graph.drawNode(id);
        }

        // Redessiner les liens existants dont les deux endpoints sont maintenant actifs
        for (const link of graph.links) {
            const fromNode = graph.nodes.get(link.fromNode);
            const toNode   = graph.nodes.get(link.toNode);
            if (fromNode?.mode !== 'folded' && toNode?.mode !== 'folded') {
                if (!link._path) graph.drawLink(link);
            }
        }

        // Supprimer le FoldNode (DOM + data)
        const foldEl = graph.world.querySelector(`.vortex-node[data-id="${foldNodeId}"]`);
        if (foldEl) foldEl.remove();
        graph.nodes.delete(foldNodeId);
        graph.selection.delete(foldNodeId);

        graph.fitWorld();
        graph.notifyChange();
    }

    // --- Méthodes statiques ---

    // Fold — crée le FoldNode dans le graph, retourne le foldId
    static fold(graph, nodeIdA, nodeIdB) {
        // Trouver les nodes internes : BFS forward(A) ∩ BFS backward(B)
        let forward  = FoldNode._bfsForward(graph, nodeIdA);
        let backward = FoldNode._bfsBackward(graph, nodeIdB);
        let innerIds = new Set([...forward].filter(id => backward.has(id)));

        // Si pas de chemin A→B, essayer B→A
        if (innerIds.size < 2) {
            forward  = FoldNode._bfsForward(graph, nodeIdB);
            backward = FoldNode._bfsBackward(graph, nodeIdA);
            innerIds = new Set([...forward].filter(id => backward.has(id)));
            if (innerIds.size >= 2) [nodeIdA, nodeIdB] = [nodeIdB, nodeIdA];
        }

        if (innerIds.size < 2) {
            console.warn('FoldNode.fold: aucun chemin entre les deux nodes sélectionnés');
            return null;
        }

        // Sync positions avant fold
        for (const id of innerIds) graph.syncNodePosition(id);

        // Centroïde pour positionner le FoldNode
        let sumX = 0, sumY = 0;
        for (const id of innerIds) {
            const node = graph.nodes.get(id);
            sumX += node.x;
            sumY += node.y;
        }
        const centroidX = sumX / innerIds.size;
        const centroidY = sumY / innerIds.size;

        // Résoudre les types des ports in/out via les premiers liens externes trouvés
        let inType = 'raw', outType = 'raw';
        for (const link of graph.links) {
            if (!innerIds.has(link.fromNode) && innerIds.has(link.toNode)) {
                inType = graph.nodes.get(link.fromNode)?.ports.find(p => p.name === link.fromName)?.type || 'raw';
                break;
            }
        }
        for (const link of graph.links) {
            if (innerIds.has(link.fromNode) && !innerIds.has(link.toNode)) {
                outType = graph.nodes.get(link.toNode)?.ports.find(p => p.name === link.toName)?.type || 'raw';
                break;
            }
        }

        // Créer et configurer le FoldNode
        const nodeA = graph.nodes.get(nodeIdA);
        const nodeB = graph.nodes.get(nodeIdB);
        const foldNode = new FoldNode();
        foldNode.properties.type = `${nodeA?.properties?.type || nodeIdA}To${nodeB?.properties?.type || nodeIdB}`;
        foldNode.x = centroidX;
        foldNode.y = centroidY;
        foldNode.ports = [
            { name: 'in',  hasIn: true,  hasOut: false, type: inType,  businessTerm: null, widget: null },
            { name: 'out', hasIn: false, hasOut: true,  type: outType, businessTerm: null, widget: null },
        ];
        foldNode.data.foldedNodes = [...innerIds];
        foldNode.data.originalPosition = { x: centroidX, y: centroidY };

        // Marquer les nodes internes comme folded — retirer leur DOM
        for (const id of innerIds) {
            graph.nodes.get(id).mode = 'folded';
            const nodeEl = graph.world.querySelector(`.vortex-node[data-id="${id}"]`);
            if (nodeEl) nodeEl.remove();
        }

        // Masquer le rendu SVG des liens internes et externes (data intactes pour Kahn)
        for (const link of graph.links) {
            const fromInner = innerIds.has(link.fromNode);
            const toInner   = innerIds.has(link.toNode);
            if (fromInner || toInner) {
                if (link._path) { link._path.remove(); link._path = null; }
                link._fromPort = null;
                link._toPort   = null;
            }
        }

        // Ajouter le FoldNode au graph et le rendre
        const foldId = graph.nextId();
        graph.nodes.set(foldId, foldNode);
        graph.drawNode(foldId);

        // Créer les liens visuels vers/depuis le FoldNode
        const externalIn  = graph.links.filter(l => !innerIds.has(l.fromNode) && innerIds.has(l.toNode));
        const externalOut = graph.links.filter(l => innerIds.has(l.fromNode) && !innerIds.has(l.toNode));

        for (const link of externalIn)  graph.createLink(link.fromNode, link.fromName, foldId, 'in', true);
        for (const link of externalOut) graph.createLink(foldId, 'out', link.toNode, link.toName, true);

        graph.clearSelection();
        graph.fitWorld();
        graph.notifyChange();
        return foldId;
    }

    // BFS forward — tous les nodes atteignables depuis startId
    static _bfsForward(graph, startId) {
        const visited = new Set();
        const queue = [startId];
        while (queue.length > 0) {
            const id = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);
            for (const link of graph.links) {
                if (link.fromNode === id && !visited.has(link.toNode)) queue.push(link.toNode);
            }
        }
        return visited;
    }

    // BFS backward — tous les nodes depuis lesquels endId est atteignable
    static _bfsBackward(graph, endId) {
        const visited = new Set();
        const queue = [endId];
        while (queue.length > 0) {
            const id = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);
            for (const link of graph.links) {
                if (link.toNode === id && !visited.has(link.fromNode)) queue.push(link.fromNode);
            }
        }
        return visited;
    }
}

export function registerFoldNode() {
    new FoldNode().register();
}