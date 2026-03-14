// vortex-transformer-registry.js — Registre des transformers (pure functions)
// Utilisé par le TransformerGroup et le clic droit sur un lien

class TransformerRegistry {
    constructor() {
        this.registry = new Map();
    }

    register(id, definition) {
        this.registry.set(id, definition);
    }

    get(id) {
        return this.registry.get(id);
    }

    getAll() {
        return [...this.registry.values()];
    }

    // Filtrer par type d'entrée (pour le drop sur un lien)
    findByInputType(type) {
        return this.getAll().filter(t => t.inputType === type || t.inputType === '*');
    }
}

const transformerRegistry = new TransformerRegistry();

export { transformerRegistry };
