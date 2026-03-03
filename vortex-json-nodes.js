import { vortexRegistry } from './vortex-registry.js'

class JsonLoaderNode {
    constructor() {
        this.id = 'vortex/JsonLoader';
        this.properties = {
            type: 'JsonLoader',
            domain: 'json',
            category: 'vortex'
        };
        this.ports = [
            { name: 'json', hasIn: false, hasOut: true, type: 'json' },
            { name: 'data', hasIn: false, hasOut: true, type: 'raw' }
        ];
        this.widgets = [
            {
                type: 'button',
                label: 'Load File',
                onClick: (nodeEl) => this.onLoadFile(nodeEl)
            },
            {
                type: 'readonly',
                name: 'file',
                label: 'file',
                value: ''
            },
            {
                type: 'text',
                name: 'root',
                label: 'root',
                value: '',
                placeholder: 'ex: seller'
            }
        ];
    }

    onLoadFile(nodeEl) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Mettre à jour le widget file (readonly)
            const fileWidget = nodeEl.querySelector('.widget-value[data-name="file"]');
            if (fileWidget) fileWidget.textContent = file.name;

            const reader = new FileReader();
            reader.onload = (ev) => {
                nodeEl._jsonRaw = ev.target.result;
                nodeEl._jsonData = JSON.parse(ev.target.result);
                console.log('JsonLoader: loaded', file.name, Object.keys(nodeEl._jsonData));
            };
            reader.readAsText(file);
        };
        input.click();
    }

    register() {
        vortexRegistry.registerNode(this.id, this);
    }
}

class JsonPreviewNode {
    constructor() {
        this.id = 'vortex/JsonPreview';
        this.properties = {
            type: 'JsonPreview',
            domain: 'json',
            category: 'vortex'
        };
        this.ports = [
            { name: 'json', hasIn: true, hasOut: false, type: 'json' }
        ];
        this.widgets = [
            {
                type: 'preview',
                name: 'content',
                value: ''
            }
        ];
        this.cssClass = 'resizable-free';
        this.size = [350, 250];
    }

    register() {
        vortexRegistry.registerNode(this.id, this);
    }
}

export function registerJsonNodes() {
    new JsonLoaderNode().register();
    new JsonPreviewNode().register();
}
