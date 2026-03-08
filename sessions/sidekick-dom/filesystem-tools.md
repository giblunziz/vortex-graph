# Filesystem MCP Tools — Aide-mémoire SideKick-DOM

## Outils disponibles

### Navigation
| Commande | Description |
|---|---|
| `Filesystem:list_allowed_directories` | Liste les répertoires autorisés |
| `Filesystem:list_directory(path)` | Liste fichiers et dossiers (1 niveau) |
| `Filesystem:list_directory_with_sizes(path)` | Idem avec tailles |
| `Filesystem:directory_tree(path)` | Arbre récursif JSON |
| `Filesystem:search_files(path, pattern)` | Recherche récursive par nom |
| `Filesystem:get_file_info(path)` | Métadonnées (taille, dates, permissions) |

### Lecture
| Commande | Description |
|---|---|
| `Filesystem:read_text_file(path)` | Lire un fichier texte complet |
| `Filesystem:read_text_file(path, head=N)` | Lire les N premières lignes |
| `Filesystem:read_text_file(path, tail=N)` | Lire les N dernières lignes |
| `Filesystem:read_multiple_files(paths[])` | Lire plusieurs fichiers en une fois |

⚠️ `head` et `tail` ne peuvent PAS être combinés dans le même appel

### Écriture
| Commande | Description |
|---|---|
| `Filesystem:write_file(path, content)` | Créer ou ÉCRASER un fichier entier |
| `Filesystem:edit_file(path, edits[])` | Édition par remplacement de texte exact |

#### edit_file — format des edits :
```json
{
  "path": "C:\\dev\\testhtml\\fichier.js",
  "edits": [
    {
      "oldText": "texte exact à trouver",
      "newText": "texte de remplacement"
    }
  ]
}
```
⚠️ `oldText` doit matcher EXACTEMENT le contenu du fichier (whitespace, quotes, accents inclus)
⚠️ Si le fichier a été reformaté (Zed/Prettier), relire avant d'éditer

### Création de répertoires
| Commande | Description |
|---|---|
| `Filesystem:create_directory(path)` | Créer un dossier (le parent doit exister) |

⚠️ Pas de création récursive — créer les parents d'abord

### Déplacement / Renommage
| Commande | Description |
|---|---|
| `Filesystem:move_file(source, destination)` | Déplacer ou renommer |

⚠️ Échoue si la destination existe déjà

### Suppression
❌ **PAS D'OUTIL DE SUPPRESSION** — impossible de supprimer un fichier ou un dossier via le Filesystem MCP. Demander à l'utilisateur de le faire manuellement.

### Copie user → claude
| Commande | Description |
|---|---|
| `Filesystem:copy_file_user_to_claude(path)` | Copie un fichier du PC user vers l'environnement Claude |

---

## Pièges courants

1. **EPERM sur write_file** → le fichier est ouvert/locké (npx serve en cours, éditeur qui lock)
2. **edit_file ne trouve pas oldText** → le fichier a été reformaté (Zed double quotes), relire avant d'éditer
3. **create_directory échoue** → le parent n'existe pas, créer d'abord le parent
4. **head + tail ensemble** → interdit, utiliser l'un ou l'autre
5. **Pas de delete** → vider le fichier avec write_file("") et demander la suppression manuelle

## Répertoires autorisés (session courante)
- `C:\dev\testhtml` — projet VorteX Graph frontend
- `C:\git\vortex` — projet VorteX backend
