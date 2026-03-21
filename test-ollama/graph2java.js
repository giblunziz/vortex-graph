import * as fs from 'fs';

const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'qwen2.5-coder:32b',
        stream: false,
        messages: [
            {
                role: 'system',
                content: fs.readFileSync('graph2java.md', 'utf8')  // ← manquait ça
            },
            {
                role: 'user',
                content: 'Génère le mapper Java pour le FoldNode InvoiceRequestSellerToPartyPart.\nCommence directement par "package com.adeo".\n\n'
                    + fs.readFileSync('fold.json', 'utf8')
            }
        ]
    })
});

const data = await response.json();
console.log(data);
console.log(data.message.content);
