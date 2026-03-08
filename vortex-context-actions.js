// vortex-context-actions.js — Actions contextuelles pour le radial menu

// Actions sur le canvas (clic droit dans le vide)
export function getCanvasActions(graph, mapper) {
  return [
    {
      id: "run",
      label: "Run",
      icon: "▶",
      callback: () => graph.executePlan(),
    },
    {
      id: "save",
      label: "Save",
      icon: "💾",
      callback: () => mapper.save(),
    },
    {
      id: "load",
      label: "Load",
      icon: "📂",
      callback: () => mapper.load(),
    },
    {
      id: "new",
      label: "New Graph",
      icon: "➕",
      callback: () => mapper.newGraph(),
    },
  ];
}

// Actions sur un node unique (clic droit sur un node)
export function getNodeActions(graph, nodeId) {
  const actions = [
    {
      id: "delete",
      label: "Delete",
      icon: "✕",
      callback: () => {
        graph.selection.add(nodeId);
        graph.deleteSelectedNodes();
      },
    },
  ];

  // Capabilities spécifiques du node
  const descriptor = graph.nodes.get(nodeId);
  if (descriptor && descriptor.contextActions) {
    actions.push(...descriptor.contextActions(nodeId, graph));
  }

  return actions;
}

// Actions sur une sélection (clic droit avec sélection active)
export function getSelectionActions(graph, selectedIds) {
  return [
    {
      id: "delete",
      label: "Delete",
      icon: "✕",
      callback: () => graph.deleteSelectedNodes(),
    },
  ];
}

// Actions sur un lien (clic droit sur un lien)
export function getLinkActions(graph, link) {
  return [
    {
      id: "delete",
      label: "Delete",
      icon: "✕",
      callback: () => graph.removeLink(link),
    },
  ];
}
