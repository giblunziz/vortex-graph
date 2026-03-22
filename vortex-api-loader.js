import { ModelNode } from "./common/vortex-model-node.js";
import { MapperNode } from "./common/vortex-mapper-node.js";

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

// Charge les MapperNodes depuis l'API backend
export async function loadMappersFromApi(baseUrl = "http://localhost:8080") {
  try {
    const response = await fetch(`${baseUrl}/api/vortex/mappers`);
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return 0;
    }

    const mappers = await response.json();
    let count = 0;

    for (const mapper of mappers) {
      const node = apiMapperToNode(mapper);
      node.register();
      count++;
    }

    console.log(`Loaded ${count} mappers from API`);
    return count;
  } catch (err) {
    console.error("Failed to load mappers from API:", err);
    return 0;
  }
}

// Convertit un mapper API en MapperNode
function apiMapperToNode(mapper) {
  const node = new MapperNode(
    mapper.identity.name,
    mapper.identity.domain,
    mapper.identity.category,
    mapper.source,
    mapper.target,
    mapper.ready,
    mapper.javaType,
    mapper.identity,
  );

  for (const field of mapper.fields) {
    node.addPort(field.name, field.hasIn, field.hasOut, field.vortexType || 'raw');
  }

  return node;
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
    let collection = null;
    let type = field.vortexType;
    if( type && type.startsWith("list:") ) {
      collection = 'list';
      type = type.replace("list:", "");
    } else if (type && type.startsWith("map:")) {
      collection = 'map';
      type = type.replace("map:", "");
    }
    if (type && type.includes(",")) {
      type = type.split(",")[0];
    }

    const port = node.addPort(
      field.name,
      field.hasIn,
      field.hasOut,
      type || "object",
      field.bt?.name || "",
    );
    port.collection = collection;
    port.bt = field.bt;

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
