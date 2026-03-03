import { VortexMapperModule } from "./modules/mapper/vortex-mapper.js";

function buildContainer() {
  const canvas = document.getElementById("vortex");
  const world = document.createElement("div");
  world.id = "vortex-world";
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  svg.id = "vortex-links";
  world.appendChild(svg);
  canvas.appendChild(world);
  return { canvas, world, svg };
}

const { canvas, world, svg } = buildContainer();
const mapperModule = new VortexMapperModule(canvas, world, svg)

document
  .getElementById("add-node")
  .addEventListener("click", () => mapperModule.appendNode("invoice/Invoice"));

document
  .getElementById("add-total")
  .addEventListener("click", () =>
    mapperModule.appendNode("invoiceRequest/TotalPart"),
  );

document
  .getElementById("add-link")
  .addEventListener("click", () =>
    mapperModule.appendNode("invoiceRequest/InvoiceRequest"),
  );

