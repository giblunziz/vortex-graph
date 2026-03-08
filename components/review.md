# review 


## problèmes
- revoir la cohérence pan/zoom/drag&drop qui ne sont pas cohérent

## A étudier
- AutoWire => fonctionne parfaitement entre GoodsInformation, ProcessControl mais pas TotalPart à cause des types (Float vs Double)
```json
    {
        "title": "invoice/TotalPart",
        "identity": {
            "name": "TotalPart",
            "domain": "invoice",
            "category": "model"
        },
        "javaType": "com.adeo.cashfit.ledger.business.domain.invoice.TotalPart",
        "fields": [
            {
                "name": "_Self",
                "javaType": "com.adeo.cashfit.ledger.business.domain.invoice.TotalPart",
                "vortexType": "invoice/TotalPart,model_output",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "netAmountOfInvoiceLines",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "discounts",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "chargesOrFees",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "amountExcludingVat",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "vatAmount",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "vatAmountCurrency",
                "javaType": "java.lang.String",
                "vortexType": "string",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "vatAmountInAccountingCurrency",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "vatAmountInAccountingCurrencyCurrency",
                "javaType": "java.lang.String",
                "vortexType": "string",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "amountIncludingVat",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "prepaidAmount",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "payableRoundingAmount",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "payableAmount",
                "javaType": "java.lang.Float",
                "vortexType": "float",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            }
        ]
    }
```

```json
    {
        "title": "invoiceRequest/TotalPart",
        "identity": {
            "name": "TotalPart",
            "domain": "invoiceRequest",
            "category": "model"
        },
        "javaType": "com.adeo.cashfit.ledger.business.domain.invoicerequest.TotalPart",
        "fields": [
            {
                "name": "_Self",
                "javaType": "com.adeo.cashfit.ledger.business.domain.invoicerequest.TotalPart",
                "vortexType": "invoiceRequest/TotalPart,model_output",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "netAmountOfInvoiceLines",
                "javaType": "java.lang.Double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "discounts",
                "javaType": "java.lang.Double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "chargesOrFees",
                "javaType": "java.lang.Double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "amountExcludingVat",
                "javaType": "double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "vatAmount",
                "javaType": "java.lang.Double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "vatAmountInAccountingCurrency",
                "javaType": "java.lang.Double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "amountIncludingVat",
                "javaType": "double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "prepaidAmount",
                "javaType": "java.lang.Double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "payableRoundingAmount",
                "javaType": "java.lang.Double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            },
            {
                "name": "payableAmount",
                "javaType": "double",
                "vortexType": "double",
                "hasIn": true,
                "hasOut": true,
                "enumValues": null
            }
        ]
    }
```