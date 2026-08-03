# Sugerencias de Pulido UI/UX — VyM-DB Participantes App

---

## 📋 Checklist de Priorización

**🔴 Críticas — COMPLETADAS:**
- [x] Sidebar colapsable (#1)
- [x] Sistema de notificaciones / toast (#9)
- [x] Confirmaciones modales mejoradas (#10) — `ConfirmDialog` con ESC/Enter/animación

**🟡 Altas — COMPLETADAS:**
- [x] Barra de progreso en Programa (#4) — con colores dinámico rojo/amber/verde
- [x] Loading states / skeletons (#13) — `Skeleton.jsx` con variantes por página
- [x] Nombre de congregación configurable — tabla `configuracion` en Supabase

**🟡 Altas — PENDIENTES:**
- [ ] Búsqueda instantánea en Personas (#6) — input con debounce 300ms por nombre/clave
- [ ] Badges de lista en Personas (#6) — "Mat" azul / "Anc" amber como etiqueta coloreada
- [ ] Selectores con búsqueda en Programa (#4) — autocomplete + filtro por lista/sexo
- [ ] Tooltips: pasar mouse sobre persona → últimas 3 participaciones (#4)

**🟢 Medias — PENDIENTES:**
- [ ] Breadcrumbs / navegación contextual (#2)
- [ ] Transición suave de vistas al cambiar de página (#14)
- [ ] Edición inline en Registros (#5) — click en celda → dropdown en lugar de modal
- [ ] Confirmación de cierre de sesión en sidebar — `useConfirm` en `App.jsx`
- [ ] Indicador de conexión Realtime en topbar (#16) — dot verde/amber/rojo
- [ ] Atajos de teclado globales (#17) — `Ctrl+K` command palette, `?` ayuda, `N` nuevo

**🔵 Bajas — FUTURO:**
- [ ] Gráficos en Estadísticas (#7) — barras, pastel, timeline
- [ ] Dark mode (#20)
- [ ] Onboarding / tour de primer uso (#19)
- [ ] Export de semana a PDF desde vista semanal
- [ ] Vista semanal nueva — lectura del programa confirmado (ver sección abajo)

---

## 🎯 Estructura General

### 1. **Sidebar colapsable** ✅ IMPLEMENTADO
**Solución implementada:** Toggle ← / → en el header del sidebar. Estado persiste en `localStorage`. En modo colapsado (`w-14`): solo iconos con tooltip `title`. En modo expandido (`w-56`): iconos + labels + stats + email + cerrar sesión. Transición `duration-300 ease-in-out`.

**Pendiente menor:**
- Confirmación antes de cerrar sesión (usar `useConfirm` desde `App.jsx`)
- Pulir transición de colapso en algunos elementos internos

---

### 2. **Breadcrumbs / Navegación contextual**
**Estado actual:** El título + descripción en topbar funciona, pero sin navegación inversa.

**Sugerencias:**
- Breadcrumb en topbar: `Home / Gestión / Personas` → clickeable para navegar
- En Programa.jsx: breadcrumb tipo `Programa > Semana 3 > Asignaciones`

---

## 📊 Vistas — Mejoras Específicas

### 3. **Vista Editable (tabla cruzada)**
**Estado actual:** Tabla grande y densa. Difícil navegar en pantallas pequeñas.

**Sugerencias:**
- **Sticky headers:** fijar columna de personas (izq) + fila de meses (arriba)
- **Mini card al pasar mouse** — nombre + tipo sin abrir modal
- **Colores de status en celda:** vacía = `bg-bg`, pendiente = `bg-blue-bg`, confirmada = `bg-accent-bg`

---

### 4. **Programa S-140**
**Estado actual:** Interfaz funcional. Barra de progreso y nombre de congregación ya implementados.

**Pendientes:**
- **Selector de personas con búsqueda** — input con autocomplete + filtro por lista/sexo (actualmente selects nativos largos)
- **Tooltips contextuales** — pasar mouse sobre persona → muestra últimos 3 meses de participaciones
- **Botón "Generar S-140" flotante** — sticky en esquina inferior derecha, no dentro del scroll
- **Confirmación visual al confirmar** — flash verde momentáneo en la fila (además del toast)
- **Modo lectura vs edición** — toggle que oculte selectores y muestre programa limpio
- **Indicador visual por sección** — APERTURA ✓ | TB ○ | SMT ✓✓○ | VC ✓ | CIERRE ✓

---

### 5. **Registros (CRUD participaciones)**
**Estado actual:** Modal + lista funcional.

**Sugerencias:**
- **Edición inline:** click en celda de tipo → dropdown en lugar de modal
- **Filtros persistentes:** guardar último filtro aplicado en `localStorage`
- **Bulk actions:** checkbox en cada fila, acciones múltiples (eliminar, cambiar tipo)
- **Validación en tiempo real:** si tipo "NC" en persona Mat → rojo inmediato con tooltip

---

### 6. **Personas**
**Estado actual:** CRUD funcional, ConfirmDialog integrado.

**Pendientes:**
- **Búsqueda instantánea** — input que filtre por nombre/clave mientras escribes (debounce 300ms)
- **Badges de lista** — "Mat" azul / "Anc" amber como etiqueta coloreada en cada fila
- **Filtro rápido por estatus** — botones tipo tag (Activos | Bautizados | Todos)

---

### 7. **Estadísticas**
**Sugerencias:**
- Barras horizontales: participaciones por tipo
- Pastel: distribución Mat vs Anc/SM
- Timeline: últimos 6 meses
- Tabla: personas + count, peso total, último mes participó

---

### 8. **Exportar / Importar**
**Sugerencias:**
- **Drag & drop** para subir CSV/XLSX
- **Preview de datos** antes de importar — primeras 5 filas
- **Validación previa** — errores de schema antes de guardar

---

## 🎨 Design System & Componentes

### 9. **Sistema de notificaciones (Toast)** ✅ IMPLEMENTADO
**Solución implementada:** `src/hooks/useToast.js` + `src/components/Toast.jsx`. 4 tipos: `success` (verde accent), `error` (danger rojo), `warning` (amber), `info` (azul). Barra de color lateral + icono + animación slide-up. Auto-dismiss 3s. Integrado en Programa, Personas, Registros, Exportar.

---

### 10. **Confirmaciones modales** ✅ IMPLEMENTADO
**Solución implementada:** `src/hooks/useConfirm.js` + `src/components/ConfirmDialog.jsx`. Reemplaza `window.confirm()` en Programa, Personas, Registros y VistaSql. Características:
- ESC → cancelar / Enter → confirmar (listeners de teclado)
- Botón cancelar: fondo blanco normal → `bg-danger-bg text-danger` en hover
- Botón confirmar: fondo `text1` (negro) → `bg-accent` verde en hover (o `bg-danger` rojo si `danger: true`)
- Icono de tecla `Enter ↵` en el botón de confirmar
- Animación de entrada: backdrop `fade-in` + card `scale-in`
- Click fuera del card → cancela

**Pendiente:**
- Aplicar en el botón "Cerrar sesión" del sidebar (`App.jsx` necesita su propio `ConfirmDialog` montado)

---

### 11. **Paleta de colores + states**
**Pendiente:**
- Estados `disabled` (opacity-50, cursor-not-allowed) consistentes en todos los botones
- Estados `focus` con ring de color accent en inputs y selects
- Revisar contraste WCAG AA en texto pequeño

---

### 12. **Tipografía**
**Pendiente:**
- Usar `font-mono` solo para datos numéricos/códigos
- Jerarquía más clara en subtítulos de sección

---

## 🎯 Interacciones & Feedback

### 13. **Loading states** ✅ IMPLEMENTADO
**Solución implementada:** `src/components/Skeleton.jsx` con componentes `SkeletonBlock`, `SkeletonRow`, `SkeletonList`, `SkeletonCard`, `SkeletonPrograma`. Integrado en Programa (tarjetas skeleton), Personas (lista 6 filas) y Registros (lista 8 filas). Animación `animate-pulse` de Tailwind.

---

### 14. **Transiciones & animaciones**
**Pendiente:**
- Transición suave al cambiar de página en el router (fade + slide-up)
- Hover effects en filas de tabla: `hover:bg-surface` con transición suave

---

### 15. **Responsiveness**
**Pendiente:**
- Tablas en mobile → card layout
- Modales full-screen en mobile
- Botones mínimo 44×44px en touch

---

## 🚀 Performance & Polish

### 16. **Indicadores de conexión**
**Pendiente:**
- Dot en topbar: verde (conectado), amber (reconectando), rojo (desconectado)
- Tooltip con estado de conexión

---

### 17. **Atajos de teclado**
**Implementado parcialmente:**
- ESC / Enter en `ConfirmDialog` ✅

**Pendiente:**
- `Ctrl+K` / `Cmd+K`: command palette
- `?`: mostrar atajos disponibles
- `N`: nueva persona/registro (contextual)

---

### 18. **Accesibilidad (a11y)**
**Pendiente:**
- ARIA labels en iconos y botones sin texto
- `focus:ring-2 focus:ring-accent` en todos los inputs
- Validar contraste WCAG AA

---

### 19. **Onboarding / Primer uso**
**Pendiente:**
- Tour interactivo al primer login
- Documentación integrada con panel lateral de ayuda

---

### 20. **Dark mode (futuro)**
**Pendiente:** Requiere refactor a CSS variables. Guardar preferencia + respetar `prefers-color-scheme`.

---

## 💡 Inspiración Visual

- **Vercel Dashboard** — sidebar colapsable, tema unificado
- **Linear** — selectores avanzados, confirmaciones elegantes
- **Notion** — navegación contextual, inline editing

---

## 🛠 Stack Sugerido para Mejoras Pendientes

| Feature | Librería | Notas |
|---------|----------|-------|
| Selectores avanzados | `headlessui` + custom | Más flexible que `<select>` nativo |
| Gráficos | `recharts` | Más React-native |
| Command palette | `cmdk` | Ligero, accesible |
| Tooltips | `@floating-ui/react` | Posicionamiento preciso |
| Animaciones de página | Tailwind built-in | Cubre el 80% sin dependencias extra |

---

## Vista Editable — Rediseño y Nueva Vista Semanal

> Estado actual analizado del código (`Vistaeditable.jsx`).
> Estas ideas están en estado **"Terminar de definir"** — requieren decisiones antes de implementar.

### Contexto: qué existe hoy

- **Tab Matriculados:** tabla persona × mes, 1 badge por celda, click abre modal para editar/crear ese registro
- **Tab Ancianos/SM:** tabla persona × mes, badges apilados (día + tipo) por celda
- **Modales:** `MatCellModal` (edición simple) y `AncCellModal` (lista + agregar)

### Cambio 1 — Matriculados: de editable a solo lectura con detalle al click

**Decisión tomada:** la vista deja de permitir crear/editar registros — eso ahora vive en Programa S-140.

**Pendiente de definir:**
- ¿El modal muestra link navegable a la semana en Programa?
- ¿Se puede editar solo `observaciones` aunque tipo/fecha sean read-only?

### Cambio 2 — Matriculados: múltiples asignaciones por mes visibles en celda

**Pendiente de definir:** ¿compacto (`T²`) o expandido (badges apilados como Anc/SM)?

### Cambio 3 — Nueva vista semanal

Vista de lectura del programa confirmado de una semana. Fuente de datos: `programa_semanas` + `programa_partes` + `programa_asignaciones` + join `personas`.

**Pendiente de definir:**
- ¿Tab dentro de VistaEditable o ruta propia en sidebar?
- ¿Muestra asignaciones no confirmadas o solo confirmadas?
- ¿Variante calendario o solo lista lineal?
- ¿Desde aquí se puede navegar a Programa para editar?

### Resumen de decisiones pendientes

| # | Decisión |
|---|----------|
| 1 | ¿Modal readonly muestra link navegable a Programa? |
| 1 | ¿Se puede editar solo `observaciones` en modo readonly? |
| 2 | ¿Celdas Matriculados: compacto (`T²`) o expandido (badges apilados)? |
| 3 | ¿Vista semanal como tab o ruta propia en sidebar? |
| 3 | ¿Vista semanal muestra asignaciones no confirmadas o solo confirmadas? |
| 3 | ¿Hay variante calendario o solo lista lineal? |
| 3 | ¿Desde la vista semanal se puede navegar a Programa para editar? |