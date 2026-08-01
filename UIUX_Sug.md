# Sugerencias de Pulido UI/UX — VyM-DB Participantes App

---

## 🎯 Estructura General

### 1. **Sidebar colapsable** ⭐ Prioridad Alta
**Estado actual:** Sidebar fijo de 224px (`w-56`). En pantallas pequeñas ocupa mucho espacio.

**Sugerencias:**
- Botón toggle arriba a la izquierda (☰ / ✕) que colapse el sidebar a un ancho mínimo (~60px, solo iconos)
- En modo colapsado: mostrar solo iconos + tooltip al pasar mouse sobre cada opción
- Mantener el estado del collapse en `localStorage` para persistir entre sesiones
- En mobile (<768px), sidebar colapsado por defecto; expandible con toggle
- Transición suave: `transition-all duration-300 ease-in-out`

**Componente sugerido:**
```jsx
// App.jsx
const [sidebarOpen, setSidebarOpen] = useState(
  window.innerWidth >= 768 && localStorage.getItem('sidebarOpen') !== 'false'
)

// Guardar preferencia
useEffect(() => {
  localStorage.setItem('sidebarOpen', sidebarOpen)
}, [sidebarOpen])

// CSS dinámico
className={`${sidebarOpen ? 'w-56' : 'w-16'} transition-all duration-300`}
```

---

### 2. **Breadcrumbs / Navegación contextual** 
**Estado actual:** El título + descripción en topbar funciona, pero sin navegación inversa.

**Sugerencias:**
- Breadcrumb en topbar: `Home / Gestión / Personas` → clickeable para navegar
- Indicador visual del nivel actual (color de fondo en categoría del sidebar)
- En Programa.jsx: breadcrumb tipo `Programa > Semana 3 > Asignaciones` para navegar entre semanas

**Ejemplo:**
```jsx
<div className="flex items-center gap-2 text-xs text-text3">
  <button onClick={() => setView('editable')} className="hover:text-accent">Home</button>
  <span>›</span>
  <span className="text-text2">{currentSection}</span>
</div>
```

---

## 📊 Vistas — Mejoras Específicas

### 3. **Vista Editable (tabla cruzada)** 
**Estado actual:** Tabla grande y densa. Difícil navegar en pantallas pequeñas.

**Sugerencias:**
- **Scroll horizontal con scrollbar visible** — actualmente el overflow es invisible
- **Sticky headers:** fijar columna de personas (izq) + fila de meses (arriba)
- **Zoom/resize:** selector de nivel de detalle (Compacto / Normal / Detallado) que ajuste tamaño de celda
- **Colores de status:** célula vacía = `bg-bg`, participación pendiente = `bg-blue-bg`, confirmada = `bg-accent-bg`, penalizada = `bg-rose-bg`
- **Mini card al pasar mouse** — mostrar nombre + tipo de participación sin abrir modal

---

### 4. **Programa S-140** 
**Estado actual:** Interfaz funcional pero densa. Muchos botones y selectores.

**Sugerencias:**
- **Modo lectura vs Modo edición** — toggle que oculte selectores y muestre solo el programa finalizadoConfirmar botones de cada semana colapsados por defecto
- **Tarjeta de semana mejorada:**
  - Mostrar progreso de confirmación como **barra (%), no solo número**
  - Indicador visual por sección: APERTURA ✓ | TB ○ | SMT ✓✓✓○ | VC ✓ | CIERRE ✓
  - Color de fondo según estado: todo confirmado = verde suave, falta algo = amber, sin asignar = gris
- **Selector de personas con búsqueda** — input con autocomplete + filtro por lista/sexo
  - Actualmente los selects son largos; con búsqueda se vuelven navegables
  - Mostrar: `clave — nombre` con icono de gender (♀/♂) y lista (Mat/Anc)
- **Tooltips contextuales** — pasar mouse sobre persona → muestra últimos 3 meses de participaciones
- **Generar S-140:** botón flotante inferior derecho (sticky), no dentro de scroll
- **Confirmación visual:** al presionar "Confirmar", celda cambia color momentáneamente (flash verde)

---

### 5. **Registros (CRUD participaciones)** 
**Estado actual:** Modal tradicional, pero interfaz de tabla podría ser más intuitiva.

**Sugerencias:**
- **Edición inline:** click en celda de tipo → dropdown en lugar de modal
- **Bulk actions:** checkbox en cada fila, botón de acciones múltiples (eliminar, cambiar tipo, etc.)
- **Filtros persistentes:** guardar último filtro aplicado en `localStorage`
- **Columna de acciones (•••):** más, editar, duplicar, eliminar en dropdown compacto
- **Indicador de persona nueva:** fila con fondo distinto si fue creada hoy
- **Validación en tiempo real:** si cambias tipo a "NC" en persona Mat, rojo inmediato con tooltip

---

### 6. **Personas** 
**Estado actual:** OK, pero tabla podría tener mejoras.

**Sugerencias:**
- **Avatar/badge de lista:** mostrar "Mat" / "Anc" como pequeña etiqueta coloreada (`bg-blue-bg` para Mat, `bg-amber-bg` para Anc)
- **Filtro rápido por estatus:** botones tipo tag (Activos | Bautizados | Todos) arriba de la tabla
- **Búsqueda instantánea:** input que filtre por nombre/clave mientras escribes (debounce 300ms)
- **Importar CSV:** botón + modal con preview de filas importadas antes de confirmar
- **Estadísticas mini:** tarjeta con total activos, bautizados, por lista, etc.

---

### 7. **Estadísticas** 
**Estado actual:** Probablemente resumen numérico. Podría ser visual.

**Sugerencias:**
- **Gráficos tipo card stack:**
  - Barras horizontales: participaciones por tipo (T, A, LB, etc.)
  - Pastel: distribución por lista (Mat vs Anc/SM)
  - Timeline: participaciones por mes (últimos 6 meses)
- **Filtros:** por mes, por lista, por rango de fechas
- **Tabla resumen:** personas + count de participaciones, peso total, último mes participó
- **Export a PNG/SVG** de gráficos para reportes

---

### 8. **Exportar / Importar** 
**Estado actual:** Funcional. Podría ser más visual.

**Sugerencias:**
- **Drag & drop** para subir CSV/XLSX (no solo botón "Seleccionar archivo")
- **Preview de datos** antes de importar: tabla pequeña con primeras 5 filas
- **Validación previa:** mostrar errores de schema antes de guardar
- **Historial de exportaciones:** lista de últimas descargas con timestamp
- **Opciones de formato:** CSV, XLSX, JSON, SQL — cada una con descripción breve

---

## 🎨 Design System & Componentes

### 9. **Sistema de notificaciones (Toast/Snackbar)** ⭐ Prioridad Media
**Estado actual:** ¿No hay? O muy básico.

**Sugerencias:**
- Implementar toast global con 4 tipos: `success` (verde), `error` (rojo), `warning` (amber), `info` (azul)
- Posición: esquina inferior derecha, apilable
- Auto-dismiss en 4s, con botón para cerrar manual
- Animación de entrada: slide-up + fade
- **Ejemplo de casos:**
  - "✓ Participación confirmada"
  - "✗ Error al guardar — intenta de nuevo"
  - "⚠ Se reemplazó a 3 participantes"
  - "ℹ Plantilla cargada desde Supabase"

**Librería sugerida:** `sonner` (liviano, headless) o `react-hot-toast` (minimalista)

---

### 10. **Confirmaciones modales mejoradas** 
**Estado actual:** Modales básicos con "Confirmar / Cancelar".

**Sugerencias:**
- **Confirmación destructiva:** button rojo + requiere typing de palabra clave (e.g., "ELIMINAR")
- **Confirmación de cambios grandes:** mostrar preview de qué va a cambiar
- **Animación de entrada:** scale + fade (vs pop abrupt)
- **ESC para cerrar** (excepto en confirmaciones críticas)
- **Acceso por keyboard:** Enter confirma, Escape cancela

---

### 11. **Paleta de colores extendida + states** 
**Estado actual:** Colores definidos en `tailwind.config.js`, pero faltan estados visuales.

**Sugerencias:**
- Agregar variantes por estado en cada componente:
  - `hover:` (fondo más oscuro)
  - `active:` (borde/shadow más pronunciado)
  - `disabled:` (opacity 50%, cursor not-allowed)
  - `focus:` (ring de color accent)
- **Semantic colors:**
  - `success`: verde actual (#2ecc71 o verde de Tailwind)
  - `pending`: amber (estado en proceso)
  - `canceled`: gris (estado anulado)
  - `archived`: gris más oscuro
- **Dark mode:** preparar selectores para modo oscuro (si es plan futuro)

---

### 12. **Typorafía mejorada** 
**Estado actual:** OK, pero muy monótona.

**Sugerencias:**
- Usar `font-mono` solo para datos numéricos/códigos, no para etiquetas
- **Jerarquía clara:**
  - Títulos: `text-lg font-semibold` (secciones mayores)
  - Subtítulos: `text-sm font-medium` (subsecciones)
  - Body: `text-sm text-text2` (descripción, ayuda)
  - Mono: `font-mono text-xs` (claves, fechas, números)
- **Line-height:** aumentar a 1.6 para readability
- **Letter-spacing:** agregar tracking a labels pequeños para respiración

---

## 🎯 Interacciones & Feedback

### 13. **Loading states** 
**Estado actual:** ¿Indefinido? Podría no haber feedback visual.

**Sugerencias:**
- **Skeleton screens:** en lugar de vacío mientras carga, mostrar placeholder gris animado
- **Spinner centrado:** para operaciones lentas (generar S-140, importar EPUB)
- **Indicador de "guardando"** en top-bar mientras hay requests pendientes
- **Delay artificial de 300ms:** para evitar flash de loading en operaciones rápidas

---

### 14. **Transiciones & animaciones** 
**Estado actual:** Probablemente muy rígido (vs aburrido).

**Sugerencias:**
- **Transición suave de vistas:** fade + slide-up al cambiar de página
- **Hover effects moderados:**
  - Botones: `hover:bg-accent-bg hover:text-accent transition-colors duration-200`
  - Filas de tabla: `hover:bg-surface-1` con shadow suave
- **Confirmación visual:** al confirmar, checkbox se anima (check mark con tick animation)
- **Evitar over-animation:** menos es más; usarlos para guiar la atención, no para decorar

---

### 15. **Responsiveness mejorada** 
**Estado actual:** ¿Se adapta a mobile? Probablemente con overflow issues.

**Sugerencias:**
- **Breakpoints claros:** md (768px), lg (1024px), xl (1280px)
- **Mobile first:** diseñar primero para mobile, luego expandir
- **Tablas en mobile:** convertir a card layout (1 fila = 1 card con label + valor verticales)
- **Sidebar collapse obligatorio en mobile** (ver sugerencia #1)
- **Modales full-screen en mobile** (vs centrado en desktop)
- **Botones grandes:** mínimo 44x44px para touch (vs 32px en desktop)

---

## 🚀 Performance & Polish

### 16. **Indicadores de conexión** 
**Estado actual:** Realtime Supabase funciona, pero sin feedback visual.

**Sugerencias:**
- **Dot en topbar:**
  - Verde: conexión activa
  - Amarillo: reconectando
  - Rojo: desconectado
  - Con tooltip: "Conectado" / "Reconectando..." / "Sin conexión"
- **Modo offline graceful:** si se cae la conexión, UI sigue responsive pero con warning subtle

---

### 17. **Atajos de teclado** 
**Estado actual:** Ninguno.

**Sugerencias:**
- `Ctrl+K` / `Cmd+K`: abrir comando palette (buscar vistas, acciones)
- `Ctrl+S`: guardar (si hay cambios pendientes)
- `Escape`: cerrar modal/sidebar
- `?`: ayuda (mostrar atajos disponibles)
- `N`: nueva persona/registro (contextual según vista)
- Mostrar atajos en tooltip de botones relevantes

---

### 18. **Accesibilidad (a11y)** 
**Estado actual:** HTML semántico, pero podría mejorar.

**Sugerencias:**
- **ARIA labels:** para iconos y botones sin texto
  - `<button aria-label="Cerrar sidebar">`
- **Focus visible:** `focus:ring-2 focus:ring-accent focus:outline-none`
- **Color contrast:** validar que texto y fondo cumplen WCAG AA (ratio 4.5:1 para body)
- **Orden tabular:** tabindex lógico en formularios
- **Alt text:** para tablas complejas, resumir en `<caption>`

---

### 19. **Onboarding / Primer uso** 
**Estado actual:** Probablemente el usuario entra y ve todo sin guía.

**Sugerencias:**
- **Tour interactivo:** al primer login, mostrar overlay con puntos clave:
  - "Aquí importas el EPUB"
  - "Aquí confirmas asignaciones"
  - "Aquí generas el S-140"
- **Tooltips contextuales:** aparecen al pasar mouse en elementos importantes
- **Documentación integrada:** ? icon → abre panel lateral con help de vista actual
- **Video/GIF de demo:** botón "Ver tutorial" con grabación corta de flujo principal

---

### 20. **Dark mode (futuro)** 
**Estado actual:** Solo light theme.

**Sugerencias (preparación):**
- Usar CSS variables para colores: `var(--bg)`, `var(--text)`, etc.
- En `tailwind.config.js` usar `theme` extendido con modo `class`:
  ```js
  darkMode: 'class',
  theme: {
    colors: {
      // light mode por defecto
      // dark mode se activa con .dark en <html>
    }
  }
  ```
- Toggle en sidebar: ☀️ / 🌙
- Guardar preferencia en `localStorage` + respetar `prefers-color-scheme`

---

## 📋 Checklist de Priorización

**🔴 Críticas (UI/UX bloqueante):**
- [ ] Sidebar colapsable (#1)
- [ ] Sistema de notificaciones / toast (#9)
- [ ] Validación visible de errores (#15 responsiveness)

**🟡 Altas (mejora significativa):**
- [ ] Selectores con búsqueda en Programa (#4)
- [ ] Barra de progreso en Programa (#4)
- [ ] Tooltips e indicadores de estado (#3, #4)
- [ ] Loading states / skeletons (#13)

**🟢 Medias (pulido):**
- [ ] Breadcrumbs (#2)
- [ ] Inline edición en Registros (#5)
- [ ] Confirmaciones destructivas (#10)
- [ ] Atajos de teclado (#17)

**🔵 Bajas (futuro):**
- [ ] Gráficos en Estadísticas (#7)
- [ ] Dark mode (#20)
- [ ] Onboarding / tour (#19)
- [ ] Atajos avanzados / command palette (#17)

---

## 💡 Inspiración Visual

**Proyectos con buen design que podrías revisar:**
- **Vercel Dashboard** — sidebar colapsable, tema unificado, feedback visual claro
- **Linear** — selectores avanzados, confirmaciones elegantes, animaciones sutiles
- **Notion** — navegación contextual, breadcrumbs, inline editing
- **Figma** — workspace con sidebar, modo lectura, colaboración real-time

---

## 🛠 Stack Sugerido para Mejoras

| Feature | Librería | Notas |
|---------|----------|-------|
| Toasts | `sonner` o `react-hot-toast` | Liviano, headless-friendly |
| Selectores avanzados | `headlessui` + custom o `react-select` | Más flexible que `<select>` nativo |
| Gráficos | `recharts` o `chart.js` | Recharts es más React-native |
| Animaciones | `framer-motion` o `tailwindcss` built-in | Tailwind cubre 80% |
| Atajos teclado | `cmdk` (command palette) | Ligero, accesible |
| Tooltips | `@floating-ui/react` + `@headlessui/react` | Posicionamiento preciso |

---

## 🎬 Próximos pasos

1. **Arrancar con #1 (sidebar colapsable):** impacto visual inmediato
2. **Agregar #9 (toast):** permite mejor feedback en todas las acciones
3. **Mejorar selectores en Programa (#4):** búsqueda + autocomplete
4. **Polish general:** transiciones, loading states, a11y
5. **Documentación integrada (#19):** onboarding + ayuda contextual

---

Cualquier feature que quieras explorar primero, me avisa y lo desarrollamos. 🚀

---

---

# Vista Editable — Rediseño y Nueva Vista Semanal

> Estado actual analizado del código (`Vistaeditable.jsx`, 743 líneas).
> Estas ideas están en estado **"Terminar de definir"** — requieren decisiones antes de implementar.

---

## Contexto: qué existe hoy

- **Tab Matriculados:** tabla persona × mes, 1 badge por celda, click abre modal para editar/crear ese registro
- **Tab Ancianos/SM:** tabla persona × mes, badges apilados (día + tipo) por celda, click abre modal para agregar más o eliminar — **ya soporta múltiples asignaciones**
- **Modales:** `MatCellModal` (edición simple) y `AncCellModal` (lista + agregar)

---

## Cambio 1 — Matriculados: de editable a solo lectura con detalle al click

**Decisión tomada:** la vista deja de permitir crear/editar registros — eso ahora vive en Programa S-140.

### Lo que cambia en `MatCellModal`
- Quitar campos de tipo, fecha, observaciones y botones Guardar/Eliminar
- Convertirlo en un panel de información: mostrar el registro confirmado, su fecha, tipo completo, semana correspondiente, y link/referencia a la semana en Programa
- Si la celda está vacía, modal puede mostrar "Sin participación registrada este mes"

### Propuesta de contenido del modal (readonly)
```
┌─────────────────────────────────────┐
│  Julissa Pérez — Septiembre 2026    │
├─────────────────────────────────────┤
│  Tipo        Titular (T)            │
│  Fecha       14 de septiembre       │
│  Semana      8–14 sep               │
│  Peso        2                      │
│  Observ.     —                      │
│                                     │
│  ← Mes ant.              Mes sig. → │
│                    [Cerrar]         │
└─────────────────────────────────────┘
```

### Pendiente de definir
- ¿El modal muestra también cuándo fue la participación anterior de esa persona?
- ¿El link a la semana en Programa es navegable (cambia la vista)?
- ¿Permitir al menos editar `observaciones` aunque el tipo/fecha sean read-only?

---

## Cambio 2 — Matriculados: múltiples asignaciones por mes visibles en celda

**Contexto:** Actualmente solo se muestra 1 badge por celda (el primero encontrado). En la práctica una matriculada puede tener T + A en el mismo mes (titular una semana, ayudante otra).

### Propuesta visual en celda
- Mostrar badges apilados igual que Ancianos/SM: `día + badge`
- Celda con alto variable según cantidad de registros
- Si hay 2+: mostrar todos; si hay 0: punto gris

### Propuesta visual alternativa (más compacta)
- Un solo badge del tipo más "pesado" (T > A), con número supraíndice si hay más de 1
- Ejemplo: `T²` → dos participaciones ese mes
- Click abre modal con la lista completa

### Impacto en código
- `MatCellModal` se convierte en algo similar a `AncCellModal` (lista readonly)
- Cambiar `registros.find(...)` por `registros.filter(...)` en el render de celda

### Pendiente de definir
- ¿Compacto (badge con número) o expandido (badges apilados como Anc/SM)?
- ¿Alinear el comportamiento completamente con Ancianos/SM?

---

## Cambio 3 — Nueva vista semanal

**Concepto:** una vista que muestra el programa de una semana concreta tal como quedó confirmado, tomando datos de `programa_semanas`, `programa_partes` y `programa_asignaciones` (no de `participaciones` directamente). Es la "versión de lectura" del Programa S-140.

### Estructura propuesta

```
┌────────────────────────────────────────────────────────┐
│  ◀  Semana anterior     6–12 de julio 2026     siguiente ▶  │
├────────────────────────────────────────────────────────┤
│  🎵 Canción 123 · Oración de apertura                  │
│  Presidente:  A-004 Jorge Segura                       │
├──────────── TESOROS DE LA BIBLIA ──────────────────────┤
│  Tesoros:     A-010 Felipe Gallardo   (10 min)         │
│  Perlas:      A-007 Nombre            (10 min)         │
│  Lectura:     M-019 Cesar Zintzun     (5 min)          │
├──────── SEAMOS MEJORES MAESTROS ───────────────────────┤
│  Empiece conversaciones                                │
│  ├ Titular:   M-048 Lourdes Gil De A.                  │
│  └ Ayudante:  M-032 Irma De Barrios                    │
│  Haga revisitas                                        │
│  ├ Titular:   M-041 Julissa Pérez                      │
│  └ Ayudante:  M-068 Rosa I. Lucas                      │
├──────────── VIDA CRISTIANA ────────────────────────────┤
│  🎵 Canción 88                                         │
│  VC parte 1:  A-004 Jorge Segura      (15 min)         │
│  EBC cond.:   A-010 Felipe Gallardo                    │
│  EBC lector:  M-019 Cesar Zintzun                      │
│  Oración:     A-007 Nombre                             │
└────────────────────────────────────────────────────────┘
```

### Fuente de datos
- `programa_semanas` → fechas, canciones, capítulo
- `programa_partes` → partes de cada sección con título y duración
- `programa_asignaciones` → quién está asignado (confirmado o no)
- Join con `personas` → nombre completo

### Filtros / navegación propuesta
- **Selector de semana:** dropdown con las semanas disponibles, o flechas ◀ ▶ para navegar
- **Filtro de mes:** para saltar al mes
- **Indicador de confirmación:** mostrar si la semana está completamente confirmada o tiene pendientes
- **Modo impresión:** botón para imprimir solo esa semana (CSS `@media print`)

### Variante alternativa — Vista calendario
En lugar de lista lineal, mostrar el mes como cuadrícula de semanas:
```
   Lun   Mar   Mié   Jue   Vie   Sáb   Dom
    —     —     1     2     3     4     5
    6     7     8     9    10    11    12   ← semana seleccionada (resaltada)
   13    14    15    ...
```
Click en una semana → expande el panel de detalle debajo del calendario.

### Pendiente de definir
- ¿La vista semanal reemplaza a algún tab existente o es un tercer tab en VistaEditable?
- ¿O vive en el sidebar como una ruta propia ("Vista Semanal")?
- ¿Muestra asignaciones no confirmadas (sugeridas) o solo las confirmadas?
- ¿El usuario puede navegar directo a Programa desde aquí para editar?
- ¿Necesita datos de semanas sin asignaciones (semanas subidas pero no asignadas)?

---

## Sugerencias adicionales para la vista

### 4 — Indicador de rotación en la tabla de Matriculados
En cada celda ocupada, mostrar una micro-indicación de si la persona debería participar ese mes según la regla de rotación:
- ✓ verde: participó en el ciclo correcto
- ↻ amber: repite respecto al mes anterior
- ⚠ rojo: participó el mes anterior (violación de regla)

Esto convierte la tabla en una herramienta de auditoría rápida sin necesidad de ir a Estadísticas.

### 5 — Comparación entre semanas
En la vista semanal, botón "Comparar con semana anterior" que muestra side-by-side las dos semanas para detectar si alguien participó consecutivo.

### 6 — Búsqueda global de persona
Input de búsqueda en la topbar que al escribir un nombre resalta todas sus celdas en la tabla (sin filtrar el resto), útil para revisar el historial de alguien sin perder el contexto de la tabla completa.

### 7 — Export de semana a PDF
Desde la vista semanal, botón "Descargar PDF" que genera una hoja con el programa de esa semana en formato limpio para imprimir o compartir por WhatsApp. (Alternativa más ligera a generar el S-140 completo.)

### 8 — Estado de confirmación visible en tabla mensual
En la tabla de Matriculados/Ancianos, mostrar si esa participación viene de una asignación confirmada en Programa o fue entrada manual (distinto color de badge o icono de check pequeño encima del badge).

---

## Resumen de decisiones pendientes

| # | Decisión |
|---|----------|
| 1 | ¿Modal readonly de Matriculados muestra link navegable a Programa? |
| 1 | ¿Se puede editar solo `observaciones` en modo readonly? |
| 2 | ¿Celdas Matriculados: compacto (`T²`) o expandido (badges apilados)? |
| 3 | ¿Vista semanal como tab dentro de VistaEditable o ruta propia en sidebar? |
| 3 | ¿Vista semanal muestra asignaciones no confirmadas o solo confirmadas? |
| 3 | ¿Hay variante calendario o solo lista lineal? |
| 3 | ¿Desde la vista semanal se puede navegar a Programa para editar? |