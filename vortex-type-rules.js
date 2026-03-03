// vortex-type-rules.js
const typeRules = {
    // source → cibles autorisées
    'int':     { compatible: ['int', 'long', 'float', 'double', 'string'], warn: [] },
    'long':    { compatible: ['long', 'double', 'string'],                 warn: ['int', 'float'] },
    'float':   { compatible: ['float', 'double', 'string'],                warn: ['int'] },
    'double':  { compatible: ['double', 'string'],                         warn: ['int', 'long', 'float'] },
    'string':  { compatible: ['string'],                                   warn: [] },
    'boolean': { compatible: ['boolean', 'string'],                        warn: [] },
};

export function checkCompatibility(sourceType, targetType) {
    if (sourceType === targetType) return 'exact';
    
    const rules = typeRules[sourceType];
    if (!rules) return 'none';
    
    if (rules.compatible.includes(targetType)) return 'compatible';
    if (rules.warn.includes(targetType)) return 'warning';
    return 'none';
}