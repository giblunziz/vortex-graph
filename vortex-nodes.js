import { vortexRegistry } from "./vortex-registry.js";

class ModelNode {
  constructor(type, domain, category, businessTerm) {
    this.id = type;
    this.properties = {
      type: type,
      domain: domain,
      category: category,
      businessTerm: businessTerm || null,
    };
    this.ports = [];
  }

  register() {
    vortexRegistry.registerNode(this.id, this);
  }

  addPort(name, hasIn, hasOut, type, businessTerm) {
    this.ports.push({
      name: name,
      hasIn: hasIn,
      hasOut: hasOut,
      type: type,
      businessTerm: businessTerm || null,
    });
  }
}

export function registerModelNodes() {
  const invoiceNode = new ModelNode("invoice/Invoice", "invoice", "model");
  invoiceNode.addPort("_Self", true, true, invoiceNode.properties.type);
  invoiceNode.addPort("bu", true, true, "string");
  invoiceNode.addPort("origin", true, true, "string");
  invoiceNode.addPort("identifier", true, true, "string");

  invoiceNode.register();

  const invoiceRequest = new ModelNode(
    "invoiceRequest/InvoiceRequest",
    "invoiceRequest",
    "model",
  );
  invoiceRequest.addPort("_Self", true, true, invoiceRequest.properties.type);
  invoiceRequest.addPort("bu", true, true, "string");
  invoiceRequest.addPort("origin", true, true, "string");
  invoiceRequest.addPort("identifier", true, true, "string");
  invoiceRequest.addPort("buyer", true, true, "string");
  invoiceRequest.addPort("seller", true, true, "string");
  invoiceRequest.addPort("total", true, true, "invoiceRequest/TotalPart");

  invoiceRequest.register();

  const totalPart = new ModelNode(
    "invoiceRequest/TotalPart",
    "invoiceRequest",
    "model",
    "BG-22",
  );
  totalPart.addPort("_Self", true, true, totalPart.properties.type, "BG-22");
  totalPart.addPort("netAmountOfInvoiceLines", true, true, "number", "BT-106");
  totalPart.addPort("discounts", true, true, "number", "BT-107");
  totalPart.addPort("chargesOrFees", true, true, "number", "BT-108");
  totalPart.addPort("amountExcludingVat", true, true, "number", "BT-109");
  totalPart.addPort("vatAmount", true, true, "number", "BT-110");
  totalPart.addPort(
    "vatAmountInAccountingCurrency",
    true,
    true,
    "number",
    "BT-111",
  );
  totalPart.addPort("amountIncludingVat", true, true, "number", "BT-112");
  totalPart.addPort("prepaidAmount", true, true, "number", "BT-113");
  totalPart.addPort("payableRoundingAmount", true, true, "number", "BT-114");
  totalPart.addPort("payableAmount", true, true, "number", "BT-115");

  totalPart.register();
}
