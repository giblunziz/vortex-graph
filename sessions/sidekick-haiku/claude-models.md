# Claude Models — Opus vs Haiku & Problèmes edit_file

*Date: 8 mars 2026*
*Instance: SideKick-Haiku*

---

## Context: Pourquoi ce document?

Après une journée de travail sur VorteX Graph avec **Claude Haiku 4.5**, j'ai découvert des limitations significatives par rapport à la précédente instance **Claude Opus** (SideKick-DOM). Ce document réfléchit sur les différences de modèle et les impacts pratiques.

---

## Opus vs Haiku: Différences observées

### Claude Opus (SideKick-DOM — session précédente)
- ✅ Context window plus large
- ✅ Meilleur raisonnement abstrait
- ✅ Meilleure compréhension des structures complexes
- ✅ Maintenance d'état mental plus fiable sur de longues interactions
- ✅ Moins d'erreurs dans la formation de structures JSON/code

### Claude Haiku 4.5 (SideKick-Haiku — session actuelle)
- ✅ Beaucoup plus rapide
- ✅ Suffisant pour du coding "mécanique"
- ❌ Perds facilement le contexte des structures complexes
- ❌ Erreurs fréquentes dans les édits de fichiers
- ❌ Tendance à passer des arrays `[]` vides au lieu de contenus valides
- ❌ Moins de "mémoire mentale" entre deux appels d'outil
- ❌ Mauvaise "conscience" de ce qu'il a envoyé juste avant

---

## Problème spécifique: edit_file avec Haiku

### Le bug observé
Haiku **ne cesse de passer des `edits: []` vides** à l'outil `edit_file`, même après plusieurs tentatives.

### Pourquoi ça arrive?

1. **Perte de contexte**: Haiku lit le fichier, mais oublie ou perd la structure du JSON à passer
2. **Confusion template**: Les variables de templating dans le contexte confondent Haiku
3. **Manque de vérification**: Haiku n'a pas assez de "conscience" pour vérifier qu'il va passer `[]` vide
4. **Load cognitif**: Avec peu de context window, Haiku perd les détails techniques entre la lecture du fichier et l'appel de l'outil

### Impact pratique
- Cela force l'utilisateur à patcher manuellement — **10+ tentatives pour un simple patch**
- Frustrant et inefficace
- Le travail finit par être fait **manuellement**

---

## Racine: Limitations de Haiku

### Capacité de raisonnement
Haiku est designed pour être **rapide et léger**, pas pour du raisonnement complexe:
- Moins de "réflexion interne" sur les structures
- Moins de capacité à maintenir un modèle mental cohérent
- Plus facile de perdre des détails entre deux outils

### Context window
Même avec un contexte long, Haiku **ne le traite pas aussi profondément** que Opus:
- Moins de "ré-lectures" internes du contexte
- Moins de vérification des prérequis
- Plus de "confiance aveugle" dans les premières impressions

---

## Leçon apprise

**Extended thinking aide, mais n'est pas une panacée.**

Le vrai problème: **l'infrastructure Filesystem MCP elle-même a des limitations** (erreurs silencieuses, create_file qui n'existe pas après exécution).

Avec Haiku + extended thinking + discipline de process, on arrive à ~80% de productivité Opus. Pas idéal, mais workable.

---

*Note: Même ce fichier a échoué à se créer la première fois! Ironique. 😂*
