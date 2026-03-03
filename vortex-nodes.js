import { vortexRegistry } from './vortex-registry.js'

class ModelNode{
    constructor(type, domain, category) {
        this.id = type
        this.properties = {
            type: type,
            domain: domain,
            category: category
        }
        this.ports = []
    }

    register() {
        vortexRegistry.registerNode(this.id, this)
    }

    addPort(name, hasIn, hasOut, type) {
        this.ports.push({
        name: name,
        hasIn: hasIn,
        hasOut: hasOut,
        type: type
    })
    }


}

export function registerModelNodes() {
    const invoiceNode = new ModelNode('invoice/Invoice','invoice','model');
    invoiceNode.addPort('_Self',true, true, invoiceNode.properties.type)
    invoiceNode.addPort('bu',true, true, 'string')
    invoiceNode.addPort('origin',true, true, 'string')
    invoiceNode.addPort('identifier',true, true, 'string')

    invoiceNode.register()

    const invoiceRequest = new ModelNode('invoiceRequest/InvoiceRequest','invoiceRequest','model');
    invoiceRequest.addPort('_Self',true, true, invoiceRequest.properties.type)
    invoiceRequest.addPort('bu',true, true, 'string')
    invoiceRequest.addPort('origin',true, true, 'string')
    invoiceRequest.addPort('identifier',true, true, 'string')
    invoiceRequest.addPort('buyer',true, true, 'string')
    invoiceRequest.addPort('seller',true, true, 'string')
    invoiceRequest.addPort('total',true, true, 'invoiceRequest/TotalPart')

    invoiceRequest.register()

    const totalPart = new ModelNode('invoiceRequest/TotalPart','invoiceRequest','model');
    totalPart.addPort('_Self',true, true, totalPart.properties.type)
    totalPart.addPort('netAmountOfInvoiceLines',true, true, 'number')
    totalPart.addPort('discounts',true, true, 'number')
    totalPart.addPort('chargesOrFees',true, true, 'number')
    totalPart.addPort('amountExcludingVat',true, true, 'number')
    totalPart.addPort('vatAmount',true, true, 'number')
    totalPart.addPort('vatAmountInAccountingCurrency',true, true, 'number')
    totalPart.addPort('amountIncludingVat',true, true, 'number')
    totalPart.addPort('prepaidAmount',true, true, 'number')
    totalPart.addPort('payableRoundingAmount',true, true, 'number')
    totalPart.addPort('payableAmount',true, true, 'number')

    totalPart.register()    

}

