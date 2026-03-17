// modules/mapper/mapper-report-manager.js
// Gère les rapports du module Mapper
// Instancié par VortexMapperModule, s'inscrit dans les contextActions du radial

import * as picker from '../../components/picker/picker.js';

export class MapperReportManager {
    constructor(graph) {
        this.graph = graph;
        this.reports = [];
    }

    /**
     * Enregistre un rapport.
     *
     * @param {object} def
     * @param {string} def.id          — identifiant unique
     * @param {string} def.label       — titre affiché
     * @param {string} [def.description] — description courte
     * @param {string} [def.icon]      — emoji ou caractère
     * @param {Array}  [def.badges]    — badges ['Technical', 'MD']
     * @param {string} def.context     — 'canvas' | 'node' | 'selection'
     * @param {Function} def.generate  — (graph, target) => string (le contenu du rapport)
     */
    register(def) {
        this.reports.push(def);
    }

    /**
     * Retourne les contextActions pour le radial menu.
     * Un seul item "Report" qui ouvre le picker filtré par contexte.
     *
     * @param {object} target — le target du radial { type, nodeId?, nodeIds? }
     * @returns {Array} — actions pour le radial
     */
    getContextActions(target) {
        const available = this.reports.filter(r => r.context === target.type);
        if (available.length === 0) return [];

        return [{
            id: 'report',
            label: 'Report',
            icon: '📊',
            callback: () => this._openPicker(available, target),
        }];
    }

    async _openPicker(reports, target) {
        const selected = await picker.show({
            title: 'Generate Report',
            subtitle: 'Choose a report to generate.',
            actionLabel: 'Generate',
            items: reports.map(r => ({
                id: r.id,
                label: r.label,
                description: r.description || '',
                icon: r.icon || '',
                badges: r.badges || [],
            })),
        });

        if (!selected) return;

        const report = this.reports.find(r => r.id === selected.id);
        if (!report) return;

        const content = report.generate(this.graph, target);
        this._download(content, report);
    }

    _download(content, report) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.id}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
