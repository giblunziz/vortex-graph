
class VortexRegistry {
    constructor() {
        this.registry = {}
    }

    registerNode(id, node) {
        this.registry[id] = node
    }

    getRegisteredNodes() { 
                    return this.registry;
    }

    getNode(id) {
        const result = this.registry[id]
        return result
    }

    getNodeTree() {
        const tree = {};
        for (const [id, node] of Object.entries(this.registry)) {
            const cat = node.properties.category;
            const domain = node.properties.domain;
            const name = id.split('/').pop();
            if (!tree[cat]) tree[cat] = {};
            if (!tree[cat][domain]) tree[cat][domain] = [];
            tree[cat][domain].push({ id, name });
        }
        return tree;
    }

    findCompatibleNodes(type, direction, excludeNodeType) {
        const results = [];
        for (const [id, node] of Object.entries(this.registry)) {
            if (id === excludeNodeType) continue;
            const hasMatch = node.ports.some(port => {
                return direction === 'in'
                    ? port.hasIn && port.type === type
                    : port.hasOut && port.type === type;
            });
            if (hasMatch) {
                results.push({ nodeId: id });
            }
        }
        return results;
    }
}

const vortexRegistry = new VortexRegistry();

export { vortexRegistry }



