# Instrucciones y Reglas del Asistente (Antigravity / Gemini)

Este documento define el nivel de autonomía y las directrices de interacción para el asistente en el proyecto **VyM-DB-app**.

---

## 1. Nivel de Autonomía y Permisos

### ✅ Acciones Autónomas (NO solicitar confirmación previa)
El asistente tiene plena autonomía para proceder directamente sin detenerse a pedir permiso en las siguientes situaciones:
1. **Lectura, búsqueda e inspección:** Explorar archivos, carpetas, código, dependencias y logs del proyecto. Comandos como `Get-ChildItem`, `Select-String`, `Select-Object` y similares deben ejecutarse de forma 100% autónoma.
2. **Revisión de cambios y diferencias:** Comandos de inspección de cambios como `git diff` y `git status` son completamente autónomos y no requieren confirmación previa.
3. **Edición y creación de código para tareas puntuales:** Realizar ajustes, correcciones de errores (bug fixes), adición de lógica de negocio, mejoras de estilo y modificaciones solicitadas por el usuario.
4. **Pruebas y verificación:** Ejecutar tests automáticos (`npm test`, `vitest`), chequeos de tipos, linters y compilaciones (`npm run build`) de forma proactiva para verificar la integridad del código.
5. **Documentación menor:** Actualizar comentarios, tipos o notas técnicas vinculadas a los cambios realizados.

---

### ⚠️ Acciones que REQUIEREN consulta y confirmación previa del usuario
El asistente **DEBE consultar y esperar confirmación explícita** antes de proceder si la acción implica:
1. **Cambios grandes y estructurales:**
   - Creación de nuevas secciones, páginas o módulos completos que alteren la arquitectura general.
   - Reescrituras integrales o rediseños completos de secciones existentes.
   - Modificación profunda o reemplazo de dependencias core / configuración base del build.
2. **Operaciones de Git y Control de Versiones de alto peso:**
   - Creación de commits (`git commit`).
   - Envío de cambios a repositorios remotos (`git push`).
   - Creación, borrado o cambio de ramas (`git branch`, `git checkout -b`, `git switch`).
   - Operaciones de fusión, rebase o reseteo destructivo (`git merge`, `git rebase`, `git reset`).
3. **Acciones destructivas o irreversibles:**
   - Eliminación masiva de archivos o carpetas.
   - Migraciones destructivas de base de datos (`DROP TABLE`, eliminación de columnas o alteración irreversible de datos en producción).

---

## 2. Contexto del Proyecto y Buenas Prácticas

- **Documentación central:** Consulta `CLAUDE.md` para la arquitectura completa, tablas de base de datos Supabase, reglas de negocio de rotación y tipos de asignación (`tipo_asignacion`).
- **Verificación obligatoria:** Antes de dar por completado un cambio en la lógica de negocio (como `asignacionesSugeridas.js`), ejecutar siempre la suite de pruebas unitarias (`npm test`).
- **Consistencia:** Respetar las convenciones de estilo existentes en Tailwind CSS v4 y los componentes del Design System en `participantes-app/src/components/ui/`.
