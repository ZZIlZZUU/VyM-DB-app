# Sugerencias de Pulido UI/UX — VyM-DB Participantes App

---

## 📋 Checklist de Priorización

**🔴 Críticas — COMPLETADAS:**
- [x] Sidebar colapsable (#1)
- [x] Sistema de notificaciones / toast (#9)
- [x] Confirmaciones modales mejoradas (#10) — `ConfirmDialog` con ESC/Enter/animación
- [x] Gestión de usuarios desde la app (#21) — `Usuarios.jsx` + Edge Function `invite-user` + Realtime

**🟡 Altas — COMPLETADAS:**
- [x] Barra de progreso en Programa (#4) — con colores dinámico rojo/amber/verde
- [x] Loading states / skeletons (#13) — `Skeleton.jsx` con variantes por página
- [x] Nombre de congregación y año en curso configurables — tabla `configuracion` en Supabase
- [x] Búsqueda instantánea en Personas (#6) — input con debounce 300ms por nombre/clave
- [x] Badges de lista en Personas (#6) — “Mat” azul / “Anc” amber como etiqueta coloreada
- [x] Selectores con búsqueda en Programa (#4) — autocomplete + filtro por lista/sexo
- [x] Tooltips: pasar mouse sobre persona → últimas 3 participaciones (#4)

**🟢 Medias — COMPLETADAS:**
- [x] Breadcrumbs / navegación contextual (#2) — componente `Breadcrumb.jsx` interactivo
- [x] Transición suave de vistas al cambiar de página (#14) — con fundido (opacity fade) para evitar problemas de containing block en dropdowns fijos
- [x] Edición inline en Registros (#5) — formulario expandible `RowForm` directamente debajo de cada card de la lista
- [x] Indicador de conexión Realtime en topbar (#16) — dot pulsante + etiqueta conectados a Supabase v2
- [x] Historial de cambios visible en la app — tabla en sección Herramientas
- [x] Toast en VistaEditable al guardar/eliminar
- [x] Empty states con SVG en Programa, Personas, Registros y Estadísticas
- [x] Badge de semanas sin confirmar en sidebar

**🟢 Medias — PENDIENTES:**
- [x] Flujo de establecimiento de contraseña (#22) — vista `SetPassword.jsx` para procesar tokens `#access_token=...&type=invite` y `updateUser({ password })`
- [x] Confirmación de cierre de sesión en sidebar — `useConfirm` en `App.jsx`
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

### 2. **Breadcrumbs / Navegación contextual** ✅ IMPLEMENTADO

**Solución implementada:** Se integró el componente `Breadcrumb.jsx` en el cuerpo principal debajo del Topbar. Detecta automáticamente la vista activa y la sección (ej: `Inicio › Gestión › Programa (S-140)`) y provee un enlace navegable para retornar a la pantalla de inicio (`editable`).

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
- **Botón “Generar S-140” flotante** — sticky en esquina inferior derecha, no dentro del scroll
- **Confirmación visual al confirmar** — flash verde momentáneo en la fila (además del toast)
- **Modo lectura vs edición** — toggle que oculte selectores y muestre programa limpio
- **Indicador visual por sección** — APERTURA ✓ | TB ○ | SMT ✓✓○ | VC ✓ | CIERRE ✓

---

### 5. **Registros (CRUD participaciones)**

**Estado actual:** Formulario de creación limpio + lista con edición inline mediante panel desplegable (`RowForm`).

**Sugerencias:**
- **Edición inline** ✅ IMPLEMENTADA: Al hacer click en una fila de la lista de registros se expande un panel local para editar fecha, tipo y observaciones sin perder scroll ni recargar modal.
- **Filtros persistentes:** guardar último filtro aplicado en `localStorage`
- **Bulk actions:** checkbox en cada fila, acciones múltiples (eliminar, cambiar tipo)
- **Validación en tiempo real:** si tipo “NC” en persona Mat → rojo inmediato con tooltip

---

### 6. **Personas**

**Estado actual:** CRUD funcional, ConfirmDialog integrado.

**Pendientes:**
- **Búsqueda instantánea** — input que filtre por nombre/clave mientras escribes (debounce 300ms)
- **Badges de lista** — “Mat” azul / “Anc” amber como etiqueta coloreada en cada fila
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
- Aplicar en el botón “Cerrar sesión” del sidebar (`App.jsx` necesita su propio `ConfirmDialog` montado)

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

### 14. **Transiciones & animaciones** ✅ IMPLEMENTADO

**Solución implementada:** Se integró una animación suave de fundido de opacidad (`view-fade` de 150ms) en la envoltura de la vista seleccionada en `App.jsx`. Esta animación de opacidad evita la creación de un *containing block* de CSS (que causan los transforms), garantizando que los elementos con posicionamiento fijo como los dropdowns no sufran de desfases posicionales en el viewport.

---

### 15. **Responsiveness**

**Pendiente:**
- Tablas en mobile → card layout
- Modales full-screen en mobile
- Botones mínimo 44×44px en touch

---

## 🚀 Performance & Polish

### 16. **Indicadores de conexión** ✅ IMPLEMENTADO

**Solución implementada:** Se conectó al canal `__status__` de Supabase Realtime v2 para monitorizar el estado de conexión del cliente en tiempo real. Se renderiza un dot indicador de color + etiqueta a la derecha del topbar (`bg-accent` para Realtime, `bg-amber` para Conectando, y `bg-danger` para Sin Conexión o Error RT).

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
| --- | --- | --- |
| Selectores avanzados | `headlessui` + custom | Más flexible que `<select>` nativo |
| Gráficos | `recharts` | Más React-native |
| Command palette | `cmdk` | Ligero, accesible |
| Tooltips | `@floating-ui/react` | Posicionamiento preciso |
| Animaciones de página | Tailwind built-in | Cubre el 80% sin dependencias extra |

---

## Vista Editable — Rediseño y Nueva Vista Semanal

> Estado actual analizado del código (`Vistaeditable.jsx`).
Estas ideas están en estado **“Terminar de definir”** — requieren decisiones antes de implementar.
> 

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
| --- | --- |
| 1 | ¿Modal readonly muestra link navegable a Programa? |
| 1 | ¿Se puede editar solo `observaciones` en modo readonly? |
| 2 | ¿Celdas Matriculados: compacto (`T²`) o expandido (badges apilados)? |
| 3 | ¿Vista semanal como tab o ruta propia en sidebar? |
| 3 | ¿Vista semanal muestra asignaciones no confirmadas o solo confirmadas? |
| 3 | ¿Hay variante calendario o solo lista lineal? |
| 3 | ¿Desde la vista semanal se puede navegar a Programa para editar? |
---

## 📱 Navegación móvil — Rediseño (09/08/2026) ✅ IMPLEMENTADO

### Problema actual

En viewport de ~417px el sidebar colapsado (`w-14 = 56px`) consume el 13% del ancho horizontal permanentemente. El contenido queda cortado — los tabs de `VistaEditable` ("Ancianos y SM", "Mapa de calor") no caben en la pantalla. El espacio horizontal en portrait es el recurso más escaso en móvil.

### Solución: comportamiento adaptativo por breakpoint

**Desktop (≥ 768px):** comportamiento actual sin cambios — sidebar fijo, colapsable, sticky.

**Móvil (< 768px):** sidebar desaparece del layout y se convierte en drawer overlay desde la izquierda. El contenido siempre ocupa el 100% del ancho.

**Patrón recomendado — Drawer lateral (Opción A):**
- Botón hamburguesa (≡) en el topbar a la izquierda, visible solo en móvil
- Al presionar: sidebar aparece como `position: fixed`, `left: 0`, con backdrop semitransparente sobre el contenido
- Se cierra con: tap fuera del drawer, ESC, o cualquier navegación
- El sidebar mantiene exactamente el mismo JSX — solo cambia `position` y `z-index` en móvil
- Transición: `translate-x-[-100%]` → `translate-x-0` con `duration-300`

**Implementación en `App.jsx`:**
```js
const esMóvil = window.innerWidth < 768  // o useMediaQuery hook
// En móvil: aside con position fixed, z-50, translate-x según estado drawerOpen
// backdrop: div fixed inset-0 bg-black/30 z-40, onClick → setDrawerOpen(false)
// topbar: mostrar botón ≡ solo en móvil (md:hidden)
```

**No se recomienda bottom navbar** — la app tiene 8 items en el NAV, más de los 4–5 que caben en una bottom bar sin jerarquizar. El drawer lateral conserva toda la navegación sin decisiones adicionales de prioridad.

### Pulido adicional para móvil

- **Topbar:** en móvil ocultar subtítulo (`hidden md:block`) y reducir el indicador Realtime a solo el dot sin texto. Libera ~16px verticales.
- **Breadcrumbs:** en móvil simplificar a solo el nombre de la vista actual o `hidden md:block`.
- **VistaEditable:** en móvil mostrar solo el mes actual y el anterior por defecto; selector de mes para cambiar. La tabla completa de 12 meses es inutilizable en portrait.
- **Inputs:** todos los `<input>` y `<select>` deben tener `font-size: 16px` mínimo en móvil para evitar el zoom automático de iOS al enfocar. En Tailwind: `text-base md:text-sm`.
- **Modales:** en móvil los `ConfirmDialog` y modales de celda deberían ser full-width con `rounded-t-xl` (sheet desde abajo) en lugar de card centrada.

---

## 🙈 Auto-hide header (09/08/2026) ✅ IMPLEMENTADO

### Comportamiento

El topbar (`bg-surface border-b sticky top-0 z-10`) ocupa ~52px fijos en todas las vistas. En móvil portrait eso es ~7% del viewport vertical, siempre visible aunque no se use.

**Auto-hide:** el header se oculta al hacer scroll hacia abajo y reaparece al hacer scroll hacia arriba — exactamente como el header de la app de Claude en móvil, YouTube, o la mayoría de apps nativas modernas.

**Reglas de comportamiento:**
- Scroll hacia abajo > 10px → header se desliza hacia arriba (`translateY(-100%)`) con `transition-transform duration-300`
- Scroll hacia arriba (cualquier distancia) → header reaparece (`translateY(0)`)
- Siempre visible en desktop — el auto-hide aplica solo en móvil (`< 768px`) o puede dejarse global si se prefiere

**Implementación en `App.jsx`:**
```js
// Hook useScrollDirection — detecta dirección del scroll en el <main>
const [headerVisible, setHeaderVisible] = useState(true)
const lastScrollY = useRef(0)

// en el onScroll del <main>:
const current = main.scrollTop
const goingDown = current > lastScrollY.current && current > 10
setHeaderVisible(!goingDown)
lastScrollY.current = current

// En el JSX del topbar:
className={`... transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
```

**Consideración importante:** el topbar es `sticky top-0` dentro del `<main>`. El listener de scroll debe ir en el `<main>` (`overflow-auto`), no en `window`, porque el scroll ocurre dentro del contenedor flex, no en el documento. Antigravity debe tener esto claro para no poner el listener en el lugar equivocado.

**Variante — solo móvil:**
```js
// Aplicar la clase condicionalmente:
const isMobile = useMediaQuery('(max-width: 767px)')
// Solo modificar transform si isMobile === true
```

### Interacción con dropdowns y modales

Cuando el header está oculto y se abre un modal o dropdown, el header **no debe reaparecer** automáticamente. Solo el scroll hacia arriba lo reactiva. Sin embargo, si el modal/drawer se cierra y el usuario hace scroll hacia arriba, el header reaparece normalmente — no hay conflicto.

---

## 🗂 Historial de cambios — Vista en Herramientas (09/08/2026) ✅ IMPLEMENTADO

La tabla `historial_cambios` existe con triggers automáticos y acumula un log de auditoría completo. Se ha añadido:

- Nueva entrada en NAV sección "Herramientas": **Historial Cambios** (icono: `📜`)
- Vista simple: tabla y tarjetas responsive con columnas `fecha`, `usuario`, `tabla`, `operación` (INSERT/UPDATE/DELETE), `detalles` del cambio.
- Filtro por tipo de operación y búsqueda predictiva por usuario, tabla o detalles.
- Sincronización en tiempo real con Supabase.

---

## 📊 Estadísticas — mejoras pendientes (09/08/2026)

- **Tarjeta "Poca actividad"** — complementar "sin ningún registro" con personas que tienen 1–2 participaciones en el año. El dato ya está en el array `porPersona` — solo falta el componente de presentación.
- **Gráficos** (ya documentado, prioridad baja) — barras horizontales por tipo, pastel Mat vs Anc/SM, timeline últimos 6 meses con `recharts`.

---

## 📤 Exportar — mejoras pendientes (09/08/2026)

- **Resumen de errores post-importación** — el toast actual solo dice "N importados". Agregar detalle: "30 importados · 5 con error" + lista colapsable de filas fallidas con el motivo del error de Supabase.
- **Filtro por rango de meses** — selectores de mes inicio/fin antes de exportar. Reutilizar el patrón de filtro de `Estadisticas.jsx`.
- **Escapado de comillas en SQL** — aplicar `.replace(/'/g, "''")` a todos los campos string antes de construir los INSERT. Afecta `nombre`, `observaciones`, y cualquier campo texto.

---

## 🏠 Empty states (09/08/2026) ✅ IMPLEMENTADO

Páginas que muestran lista vacía sin guía visual cuando no hay datos:

| Vista | Trigger | Call to action |
|---|---|---|
| `Programa.jsx` | 0 semanas importadas | "Sube tu primer EPUB para comenzar" + botón directo de subida |
| `Personas.jsx` | 0 personas | "Agrega la primera persona al catálogo" |
| `Registros.jsx` | 0 registros con filtro activo | "No hay resultados — limpiar filtros" |
| `Estadisticas.jsx` | 0 participaciones | "Aún no hay registros para analizar" |

Cada empty state incorpora un SVG ilustrativo nativo (sin dependencias de red), textos amigables y llamadas a la acción (*CTA*).

---

## ⚙️ Configuración dinámica — pendientes (09/08/2026)

- **Año en curso configurable** ✅ IMPLEMENTADO — Se agregó la clave `anio_en_curso` a la tabla `configuracion`. Se lee dinámicamente en `App.jsx` y se almacena en el estado principal para su renderizado en el Sidebar.
- **Configuración de tema** — guardar preferencia claro/oscuro en `configuracion` por usuario (o en `localStorage` como fallback). El toggle se expone desde el panel de perfil.

---

## 🔔 Badge de pendientes en sidebar (09/08/2026) ✅ IMPLEMENTADO

- Muestra una píldora roja pulsante con el número de semanas con confirmación < 100% en el item de **Programa (S-140)**.
- Recalcula dinámicamente según la lógica de completado de partes.
- Escucha mediante Realtime cambios en semanas, partes y asignaciones para actualizarse al instante.