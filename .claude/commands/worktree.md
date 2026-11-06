---
description: Crea un git worktree aislado en .trees/[nombre] y ejecuta ahí el requerimiento
argument-hint: <requerimiento a implementar>
---

Requerimiento: $ARGUMENTS

Sigue estos pasos:

1. **Nombre**: deriva un nombre corto en kebab-case (2-4 palabras, minúsculas, sin acentos ni espacios) a partir del requerimiento. Ej: "añadir pieza fantasma" -> `pieza-fantasma`.
2. **Crear worktree** desde la raíz del repo:
   `git worktree add .trees/[nombre]`
   - Si `.trees/[nombre]` o la rama ya existen, añade sufijo (`-2`) en vez de reutilizar.
   - Si `.trees/` no está en `.gitignore`, añádelo.
3. **Ejecutar de forma aislada**: lanza un subagente (Agent, `general-purpose`) con el requerimiento completo. Su prompt debe indicar:
   - Trabajar SOLO dentro de `.trees/[nombre]` (ruta absoluta); no leer ni modificar archivos del árbol principal.
   - Leer el `CLAUDE.md` del worktree y seguir sus convenciones.
   - Implementar el requerimiento y hacer commit en la rama del worktree.
4. **Reportar** (conciso): nombre del worktree, ruta, rama, resumen de cambios. Recordar cómo integrar/limpiar:
   - Integrar: `git merge [nombre]`
   - Limpiar: `git worktree remove .trees/[nombre]`

No toques el código del directorio principal.
