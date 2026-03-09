import { ModelNode } from "./common/vortex-model-node.js";

// Charge les ModelNodes depuis l'API backend
export async function loadModelsFromApi(baseUrl = "http://localhost:8080") {
  try {
    const response = await fetch(`${baseUrl}/api/vortex/models`);
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return 0;
    }

    const models = await response.json();
    let count = 0;

    for (const model of models) {
      const node = apiModelToNode(model);
      node.register();
      count++;
    }

    console.log(`Loaded ${count} models from API`);
    return count;
  } catch (err) {
    console.error("Failed to load models from API:", err);
    return 0;
  }
}

// Convertit un model API en ModelNode
function apiModelToNode(model) {
  const node = new ModelNode(
    model.title,
    model.identity.domain,
    model.identity.category,
  );

  // Le header affiche le name, pas le title complet
  node.properties.type = model.identity.name;

  for (const field of model.fields) {
    // Nettoyer le vortexType (retirer model_output si encore présent)
    let type = field.vortexType;
    if (type && type.includes(",")) {
      type = type.split(",")[0];
    }

    const port = node.addPort(
      field.name,
      field.hasIn,
      field.hasOut,
      type || "object",
    );

    // Enum → widget dropdown inline sur le port
    if (field.enumValues && field.enumValues.length > 0) {
      port.widget = {
        type: 'dropdown',
        options: field.enumValues,
        value: field.enumValues[0],
      };
    }
  }

  return node;
}
