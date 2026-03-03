😂 Bien vu ! C'est `e.button` :

```javascript
canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;  // 0 = gauche, 1 = molette, 2 = droit
    
    const header = e.target.closest('.node-header');
    if (!header) return;
    // ...
});
```

Et tant qu'on y est, les événements souris utiles pour ton node editor :

| Événement | Quand |
|-----------|-------|
| `mousedown` | Bouton pressé |
| `mouseup` | Bouton relâché |
| `mousemove` | Souris bouge |
| `click` | Press + release (après mouseup) |
| `dblclick` | Double-clic |
| `contextmenu` | Clic droit (pour ton menu contextuel) |
| `wheel` | Molette (pour le zoom) |

Et les propriétés utiles sur l'événement `e` :

| Propriété | Contenu |
|-----------|---------|
| `e.button` | 0 gauche, 1 molette, 2 droit |
| `e.clientX/Y` | Position dans la fenêtre |
| `e.shiftKey` | Shift enfoncé (multi-select) |
| `e.ctrlKey` | Ctrl enfoncé |
| `e.target` | L'élément exact cliqué |

C'est ta liste universelle des 5-6 trucs à connaître, version DOM events 😄