// modules/mapper/reports/mapped-out-report.js
// Rapport de structure d'un ModelNode — vue hiérarchique avec statut des connexions out

import { ModelNode } from '../../../common/vortex-model-node.js';

export const MappedOutReport = {
    id: 'mapped-out-report',
    label: 'Model Structure',
    description: 'Hierarchical view of all fields with mapping status.',
    icon: '🗂️',
    badges: ['Technical', 'MD'],
    context: 'node',

    generate(graph, target) {
        return generateReport(graph, target, false);
    }
};

export const MappedOutConnectedReport = {
    id: 'mapped-out-connected-report',
    label: 'Model Connected Fields',
    description: 'Hierarchical view of connected output fields only.',
    icon: '🔗',
    badges: ['Technical', 'MD'],
    context: 'node',

    generate(graph, target) {
        return generateReport(graph, target, true);
    }
};

// --- Implémentation commune ---

function generateReport(graph, target, connected) {
    const nodeId = target.nodeId;
    if (!nodeId) {
        alert('Select a single ModelNode to generate this report.');
        return null;
    }

    const node = graph.nodes.get(nodeId);
    if (!node || !(node instanceof ModelNode)) {
        alert('Selected node is not a ModelNode.');
        return null;
    }

    const nodeName = node.properties?.type || nodeId;
    const domain = node.properties?.domain || '';

    // Collecter les rows en deep
    const rows = [];
    let maxDepth = 0;

    collectFields(graph, nodeId, 0, rows, (depth) => {
        if (depth > maxDepth) maxDepth = depth;
    }, connected);

    // Filtrer si connected only
    const displayRows = connected
        ? rows.filter(r => r.type === 'bg' ? hasMappedChildren(rows, r) : r.mapped)
        : rows;

    // Stats
    const allFields = displayRows.filter(r => r.type === 'field');
    const mappedCount = allFields.filter(r => r.mapped).length;
    const totalCount = allFields.length;

    return buildMarkdown({
        nodeName, domain, displayRows, maxDepth,
        totalCount, mappedCount, connected,
    });
}

function collectFields(graph, nodeId, depth, rows, trackDepth, connected) {
    const node = graph.nodes.get(nodeId);
    if (!node) return;

    trackDepth(depth);

    for (const port of node.ports) {
        if (!port.hasOut || port.name === '_Self') continue;

        const bt = port.bt?.name || null;
        const isMapped = graph.links.some(l => l.fromNode === nodeId && l.fromName === port.name);

        // Vérifier si ce port mène à un sous-objet ModelNode
        const childLink = graph.links.find(l =>
            l.fromNode === nodeId && l.fromName === port.name && l.toName === '_Self'
        );
        const childNode = childLink ? graph.nodes.get(childLink.toNode) : null;
        const isSubObject = childNode instanceof ModelNode;

        if (isSubObject) {
            // BG header
            rows.push({
                type: 'bg',
                bt,
                name: port.name,
                depth,
                mapped: isMapped,
            });
            // Recurse
            collectFields(graph, childLink.toNode, depth + 1, rows, trackDepth, connected);
        } else {
            // Champ simple
            if (!connected || isMapped) {
                rows.push({
                    type: 'field',
                    bt,
                    name: port.name,
                    portType: port.type,
                    depth,
                    mapped: isMapped,
                });
            }
        }
    }
}

// Vérifie si un BG a au moins un enfant mappé (pour le mode connected)
function hasMappedChildren(rows, bgRow) {
    const bgIndex = rows.indexOf(bgRow);
    for (let i = bgIndex + 1; i < rows.length; i++) {
        const r = rows[i];
        // On est sorti du sous-arbre du BG
        if (r.depth <= bgRow.depth && r.type === 'bg') break;
        if (r.depth <= bgRow.depth && r.type === 'field') break;
        if (r.mapped) return true;
    }
    return false;
}

// --- Markdown ---

function buildMarkdown({ nodeName, domain, displayRows, maxDepth, totalCount, mappedCount, connected }) {
    const lines = [];
    const title = connected ? 'Connected Fields' : 'Model Structure';

    lines.push(`# ${title} — ${nodeName}`);
    lines.push('');
    lines.push(`> **Node** : \`${nodeName}\``);
    lines.push(`> **Domain** : \`${domain}\``);
    lines.push(`> **Generated** : ${new Date().toLocaleString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| | |');
    lines.push('|---|---|');
    lines.push(`| Fields | ${totalCount} |`);
    lines.push(`| Mapped out | ${mappedCount} ✅ |`);
    if (!connected) lines.push(`| Unmapped | ${totalCount - mappedCount} |`);
    lines.push(`| **Coverage** | **${totalCount > 0 ? Math.round(mappedCount / totalCount * 100) : 0}%** |`);
    lines.push('');

    // Structure
    lines.push('## Structure');
    lines.push('');

    // Header dynamique selon la profondeur
    const levelCols = [];
    for (let i = 0; i <= maxDepth; i++) {
        levelCols.push(`Level ${i + 1}`);
    }
    lines.push(`|BT|${levelCols.join('|')}|Type|Out|`);
    lines.push(`|:--|${levelCols.map(() => ':--').join('|')}|:--|:-:|`);

    // Rows
    for (const row of displayRows) {
        const bt = row.type === 'bg' && row.bt ? `**${row.bt}**` : (row.bt || '');
        const name = row.type === 'bg' ? `**${row.name}**` : row.name;
        const type = row.type === 'field' ? row.portType : '';
        const out = row.type === 'field' && row.mapped ? '✅' : '';

        // Construire les colonnes Level : le nom va dans la colonne de sa profondeur
        const cells = [];
        for (let i = 0; i <= maxDepth; i++) {
            cells.push(i === row.depth ? name : '');
        }

        lines.push(`|${bt}|${cells.join('|')}|${type}|${out}|`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated by VorteX Studio — Objects Mapper*');

    return lines.join('\n');
}