// modules/mapper/reports/mapping-report.js
// Rapport de mapping BT/BG — matrice source/target avec couverture

import { ModelNode } from '../../../common/vortex-model-node.js';

export const MappingReport = {
    id: 'mapping-report',
    label: 'Mapping Report',
    description: 'BT/BG mapping matrix with source, target and coverage.',
    icon: '📊',
    badges: ['Technical', 'MD'],
    context: 'selection',

    generate(graph, target) {
        const selectedIds = target.nodeIds || [];
        if (selectedIds.length !== 2) {
            alert('Select exactly 2 ModelNodes to generate a Mapping Report.');
            return null;
        }

        // Identifier source et target via BFS
        const { sourceId, targetId } = resolveDirection(graph, selectedIds[0], selectedIds[1]);
        if (!sourceId || !targetId) {
            alert('No path found between the selected nodes.');
            return null;
        }

        const sourceNode = graph.nodes.get(sourceId);
        const targetNode = graph.nodes.get(targetId);
        const sourceName = sourceNode?.properties?.type || sourceId;
        const targetName = targetNode?.properties?.type || targetId;

        const subtree = bfsForward(graph, sourceId);

        // Collecter les sous-objets
        const sourceNodes = collectSourceSubObjects(graph, sourceId, subtree);

        // Construire les lignes du rapport en suivant l'ordre des ports du target
        const rows = [];
        const usedSourcePorts = new Set();

        buildRows(graph, targetId, '', subtree, sourceNodes, rows, usedSourcePorts);

        // Ports source non utilisés
        const unusedSourcePorts = [];
        for (const { nodeId, node, parentPath } of sourceNodes) {
            for (const port of node.ports) {
                if (!port.hasOut || port.name === '_Self') continue;
                const key = `${nodeId}:${port.name}`;
                if (!usedSourcePorts.has(key)) {
                    const fullName = parentPath ? `${parentPath}.${port.name}` : port.name;
                    unusedSourcePorts.push({ name: fullName, type: port.type });
                }
            }
        }

        // Stats — BG exclus du count
        const btRows = rows.filter(r => r.type === 'mapping');
        const totalBT = btRows.filter(r => r.targetBT).length;
        const mappedBT = btRows.filter(r => r.targetBT && r.state !== '🟦').length;
        const warnings = btRows.filter(r => r.state === '⚠️').length;

        return buildMarkdown({
            sourceName, targetName, rows, unusedSourcePorts,
            totalBT, mappedBT, warnings,
        });
    }
};

// --- Construit les lignes en suivant l'ordre des ports du target, récursivement ---

function buildRows(graph, targetNodeId, parentPath, subtree, sourceNodes, rows, usedSourcePorts) {
    const node = graph.nodes.get(targetNodeId);
    if (!node) return;

    for (const port of node.ports) {
        if (!port.hasIn || port.name === '_Self') continue;

        const targetBT = port.bt?.name || null;
        const fullTargetName = parentPath ? `${parentPath}.${port.name}` : port.name;

        // Vérifier si ce port est un BG (un ModelNode connecte son _Self out vers ce port)
        const bgChild = findBGChild(graph, targetNodeId, port.name, subtree);

        if (bgChild) {
            // C'est un BG — ligne header
            const sourcePortName = findSourcePortForBG(graph, bgChild.nodeId, subtree, sourceNodes);
            rows.push({
                type: 'bg',
                targetBT,
                source: sourcePortName,
                target: fullTargetName,
            });
            // Recurse dans le sous-objet
            buildRows(graph, bgChild.nodeId, fullTargetName, subtree, sourceNodes, rows, usedSourcePorts);
        } else {
            // C'est un BT ou un champ simple — tracer la source
            const trace = traceSource(graph, targetNodeId, port.name, subtree, sourceNodes);

            if (trace) {
                usedSourcePorts.add(`${trace.sourceNodeId}:${trace.sourcePortName}`);
                rows.push({
                    type: 'mapping',
                    sourceBT: trace.sourceBT,
                    targetBT,
                    source: trace.fullSourceName,
                    target: fullTargetName,
                    sourceType: trace.sourceType,
                    targetType: port.type,
                    transformations: trace.transformations,
                    state: resolveState(trace.sourceType, port.type, trace.transformations),
                });
            } else if (targetBT) {
                rows.push({
                    type: 'mapping',
                    sourceBT: null,
                    targetBT,
                    source: null,
                    target: fullTargetName,
                    sourceType: null,
                    targetType: port.type,
                    transformations: [],
                    state: '🟦',
                });
            }
        }
    }
}

// --- Trouve le ModelNode enfant connecté via _Self out → parent.port in (BG) ---

function findBGChild(graph, parentNodeId, portName, subtree) {
    for (const link of graph.links) {
        if (link.toNode !== parentNodeId) continue;
        if (link.toName !== portName) continue;
        if (link.fromName !== '_Self') continue;
        if (!subtree.has(link.fromNode)) continue;

        const childNode = graph.nodes.get(link.fromNode);
        if (childNode instanceof ModelNode) {
            return { nodeId: link.fromNode, node: childNode };
        }
    }
    return null;
}

// --- Trouve le nom du port source correspondant à un BG ---

function findSourcePortForBG(graph, targetChildNodeId, subtree, sourceNodes) {
    for (const link of graph.links) {
        if (link.toNode !== targetChildNodeId) continue;
        if (link.toName !== '_Self') continue;

        const fromNode = graph.nodes.get(link.fromNode);
        if (!(fromNode instanceof ModelNode)) continue;

        const sourceEntry = sourceNodes.find(s => s.nodeId === link.fromNode);
        if (sourceEntry && sourceEntry.parentPath) {
            return sourceEntry.parentPath;
        }
        return link.fromName;
    }
    return '---';
}

// --- Direction ---

function resolveDirection(graph, idA, idB) {
    const forwardA = bfsForward(graph, idA);
    if (forwardA.has(idB)) return { sourceId: idA, targetId: idB };

    const forwardB = bfsForward(graph, idB);
    if (forwardB.has(idA)) return { sourceId: idB, targetId: idA };

    return { sourceId: null, targetId: null };
}

// --- BFS ---

function bfsForward(graph, startId) {
    const visited = new Set();
    const queue = [startId];
    while (queue.length > 0) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        for (const link of graph.links) {
            if (link.fromNode === id && !visited.has(link.toNode)) {
                queue.push(link.toNode);
            }
        }
    }
    return visited;
}

// --- Sous-objets source (forward: parent.port out → child._Self in) ---

function collectSourceSubObjects(graph, rootId, subtree) {
    const result = [];
    const visited = new Set();
    const queue = [{ nodeId: rootId, parentPath: '' }];

    while (queue.length > 0) {
        const { nodeId, parentPath } = queue.shift();
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = graph.nodes.get(nodeId);
        if (!node || !(node instanceof ModelNode)) continue;

        result.push({ nodeId, node, parentPath });

        for (const link of graph.links) {
            if (link.fromNode !== nodeId) continue;
            if (link.fromName === '_Self') continue;
            if (link.toName !== '_Self') continue;
            if (!subtree.has(link.toNode)) continue;

            const childNode = graph.nodes.get(link.toNode);
            if (!(childNode instanceof ModelNode)) continue;

            const childPath = parentPath ? `${parentPath}.${link.fromName}` : link.fromName;
            queue.push({ nodeId: link.toNode, parentPath: childPath });
        }
    }

    return result;
}

// --- Trace source ---
// Remonte la chaîne de liens depuis un port target jusqu'au ModelNode source
// Retourne aussi le BT du port source

function traceSource(graph, targetNodeId, targetPortName, subtree, sourceNodes) {
    const transformations = [];
    let currentNodeId = targetNodeId;
    let currentPortName = targetPortName;

    for (let i = 0; i < 20; i++) {
        const link = graph.links.find(l =>
            l.toNode === currentNodeId && l.toName === currentPortName
        );
        if (!link) return null;

        const fromNode = graph.nodes.get(link.fromNode);
        if (!fromNode) return null;

        if (fromNode instanceof ModelNode) {
            const sourceEntry = sourceNodes.find(s => s.nodeId === link.fromNode);
            const parentPath = sourceEntry?.parentPath || '';
            const fullName = parentPath ? `${parentPath}.${link.fromName}` : link.fromName;

            const sourcePort = fromNode.ports.find(p => p.name === link.fromName);
            return {
                sourceNodeId: link.fromNode,
                sourcePortName: link.fromName,
                fullSourceName: fullName,
                sourceType: sourcePort?.type || 'unknown',
                sourceBT: sourcePort?.bt?.name || null,
                transformations,
            };
        }

        const label = fromNode.properties?.type || fromNode.id;
        transformations.unshift(label);

        const inPort = fromNode.ports.find(p => p.name === 'in' && p.hasIn)
            || fromNode.ports.find(p => p.hasIn);
        if (!inPort) return null;

        currentNodeId = link.fromNode;
        currentPortName = inPort.name;
    }

    return null;
}

// --- State ---

function resolveState(sourceType, targetType, transformations) {
    if (!sourceType) return '🟦';
    if (sourceType === targetType) return '✅';
    if (transformations.length > 0) return '✅';
    return '⚠️';
}

// --- Markdown ---

function buildMarkdown({ sourceName, targetName, rows, unusedSourcePorts, totalBT, mappedBT, warnings }) {
    const lines = [];
    const bold = {
        prefix: '<span style="color:#55F;font-weight: bold;">',
        suffix: '</span>',
    }

    lines.push(`# Mapping Report — ${sourceName} → ${targetName}`);
    lines.push('');
    lines.push(`> **Source** : \`${sourceName}\``);
    lines.push(`> **Target** : \`${targetName}\``);
    lines.push(`> **Generated** : ${new Date().toLocaleString()}`);
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push('| | |');
    lines.push('|---|---|');
    lines.push(`| BT/BG total | ${totalBT} |`);
    lines.push(`| Mapped | ${mappedBT} ✅ |`);
    lines.push(`| Unmapped | ${totalBT - mappedBT} 🟦 |`);
    if (warnings > 0) lines.push(`| Warnings | ${warnings} ⚠️ |`);
    lines.push(`| **Coverage** | **${totalBT > 0 ? Math.round(mappedBT / totalBT * 100) : 0}%** |`);
    lines.push('');

    lines.push('## Mapping');
    lines.push('');
    lines.push('|Source BT|Source|Target BT|Target|Type|State|');
    lines.push('|:--|:--|:--|:--|:--|:-:|');

    for (const row of rows) {
        if (row.type === 'bg') {
            const targetBT = row.targetBT ? `${bold.prefix}${row.targetBT}${bold.suffix}` : '';
            lines.push(`||${row.source}|${targetBT}|${row.target}|||`);
        } else {
            const sourceBT = row.sourceBT || '';
            const targetBT = row.targetBT || '';
            const source = row.source || '---';
            const target = row.target || '';
            const type = formatType(row.sourceType, row.targetType);
            const transfo = row.transformations.length > 0 ? ` (${row.transformations.length})` : '';
            lines.push(`|${sourceBT}|${source}|${targetBT}|${target}|${type}${transfo}|${row.state}|`);
        }
    }

    lines.push('');

    if (unusedSourcePorts.length > 0) {
        lines.push('## Unused source fields');
        lines.push('');
        lines.push('|Field|Type|');
        lines.push('|:--|:--|');
        for (const p of unusedSourcePorts) {
            lines.push(`|${p.name}|${p.type}|`);
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Generated by VorteX Studio — Objects Mapper*');

    return lines.join('\n');
}

function formatType(sourceType, targetType) {
    if (!sourceType) return targetType || '';
    if (sourceType === targetType) return sourceType;
    return `${sourceType} => ${targetType}`;
}