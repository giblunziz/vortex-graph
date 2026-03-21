// modules/mapper/actions/build-action.js
// Action contextuelle : Build Mapper — génère le mapper Java depuis un FoldNode
// Disponible au clic droit sur un FoldNode (mode=virtual, type=vortex/FoldNode)

const BASE_URL = 'http://localhost:8080';

export const BuildMapperAction = {
    id: 'build-mapper',
    label: 'Build Mapper',
    icon: '⚙️',
    context: 'node',

    getContextActions(nodeId, node, graph) {
        console.log('BuildMapperAction.getContextActions(target.nodeId, node, graph));',node)
        if (node.mode !== 'virtual') return [];
        if (node.nodeType !== 'vortex/FoldNode') return [];

        return [{
            id: this.id,
            label: this.label,
            icon: this.icon,
            callback: () => buildMapper(graph, node),
        }];
    },
};

// --- Implémentation ---

async function buildMapper(graph, node) {
    const foldNodeName = node.properties.type;
    if (!foldNodeName) {
        console.error('[BuildMapper] FoldNode has no properties.type');
        return;
    }

    const graphExport = graph.serialize();
    const url = `${BASE_URL}/api/vortex/generate/mapper?foldNodeName=${encodeURIComponent(foldNodeName)}`;

    console.log(`[BuildMapper] Generating mapper for: ${foldNodeName}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(graphExport),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[BuildMapper] Server error ${response.status}:`, error);
            notify(`❌ Build failed: ${response.status}`, 'error');
            return;
        }

        const javaSource = await response.text();
        console.log(`[BuildMapper] Generated:\n${javaSource}`);
        notify(`✅ ${foldNodeName}Mapper generated`, 'success');

    } catch (err) {
        console.error('[BuildMapper] Network error:', err);
        notify(`❌ Network error: ${err.message}`, 'error');
    }
}

// --- Notification légère (console + UI si disponible) ---

function notify(message, level = 'info') {
    console.log(`[BuildMapper] ${message}`);

    // Injection d'un toast temporaire dans le DOM si pas de système de notif global
    const toast = document.createElement('div');
    toast.className = `vortex-toast vortex-toast--${level}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}
