# VyM-DB — Participantes App

Aplicación web para gestión de participaciones en reuniones de congregación (Testigos de Jehová). Registra quién participa cada mes, en qué rol, y genera el programa S-140 en `.docx`.

---

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Fuentes:** IBM Plex Sans / IBM Plex Mono
- **Package manager:** pnpm
- **Deploy:** Vercel (activo: [vy-m-db-app-flame.vercel.app](https://vy-m-db-app-flame.vercel.app/))
- **Directorio:** `participantes-app/`

---

## Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=https://evqhdemvmnhwnsnrmdzk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_gJjDUrAu1wb_oD2CcOPtMg_aM7GnB6W
```

> Supabase usa `VITE_SUPABASE_PUBLISHABLE_KEY` (no `ANON_KEY`), cambio introducido en versiones recientes.

---

## Estructura del proyecto

```
participantes-app/
├── public/
│   └── S-140_plantilla.docx         — plantilla Word con marcadores {$variable$}
├── src/
│   ├── lib/
│   │   ├── supabase.js              — cliente Supabase
│   │   ├── epubParser.js            — parser EPUB mwb → semanas/partes
│   │   ├── asignacionesSugeridas.js — motor de sugerencias por rotación
│   │   └── generarS140.js           — generador S-140.docx con docxtemplater
│   ├── pages/
│   │   ├── Login.jsx                — login email/password
│   │   ├── VistaEditable.jsx        — tabla cruzada persona × mes con modales
│   │   ├── VistaSql.jsx             — vista relacional con filtros
│   │   ├── Personas.jsx             — CRUD personas
│   │   ├── Registros.jsx            — CRUD participaciones
│   │   ├── Programa.jsx             — módulo S-140 completo
│   │   ├── Usuarios.jsx             — gestión de acceso y lista blanca de usuarios autorizados
│   │   ├── Exportar.jsx             — CSV / SQL / JSON + importar CSV
│   │   ├── SetPassword.jsx          — establecimiento de nueva contraseña
│   │   ├── HistorialCambios.jsx     — log de auditoría en tiempo real
│   │   └── Estadisticas.jsx         — resumen por tipo/mes/persona
│   ├── components/
│   │   ├── ProtectedRoute.jsx       — verifica sesión + tabla usuarios_autorizados
│   │   ├── Toast.jsx                — notificaciones visuales (success/error/warning/info)
│   │   ├── Skeleton.jsx             — placeholders animados para estados de carga
│   │   ├── Breadcrumb.jsx           — navegación contextual interactiva
│   │   └── ConfirmDialog.jsx        — diálogo de confirmación (reemplaza window.confirm)
│   ├── hooks/
│   │   ├── useToast.js              — hook para manejo de toasts con tipos
│   │   └── useConfirm.js            — hook para diálogos de confirmación async
│   ├── App.jsx                      — sidebar nav colapsable + router de vistas
│   ├── main.jsx                     — BrowserRouter + rutas
│   └── index.css                    — Tailwind + estilos base + animaciones
├── tailwind.config.js               — colores custom del design system
├── vite.config.js
└── package.json
```

> **Nota de case-sensitivity:** Los archivos de páginas usan PascalCase en disco (`VistaEditable.jsx`, `VistaSql.jsx`, `Login.jsx`). En el `App.jsx` los imports deben coincidir exactamente porque en Linux (Vercel) el sistema de archivos es case-sensitive.

---

## Dependencias importantes

```bash
pnpm add jszip           # parser EPUB (importación dinámica en epubParser.js)
pnpm add docxtemplater   # generación S-140.docx con plantilla Word
pnpm add pizzip          # requerido por docxtemplater para leer/escribir .docx
```

> **Nota:** La librería `docx` (generación programática) fue **reemplazada** por `docxtemplater + pizzip` para respetar el diseño visual exacto del S-140 oficial. La plantilla vive en `public/S-140_plantilla.docx`.

---

## Base de datos Supabase

### Tablas principales

| Tabla | Descripción |
|---|---|
| `personas` | Catálogo maestro de participantes |
| `participaciones` | Historial de asignaciones confirmadas |
| `usuarios_autorizados` | Control de acceso por email |
| `historial_cambios` | Auditoría automática via triggers |
| `programa_semanas` | Semanas extraídas del EPUB mwb |
| `programa_partes` | Partes/asignaciones por semana |
| `programa_asignaciones` | Quién hace cada parte (con confirmación) |
| `configuracion` | Configuración general clave/valor (e.g. nombre_congregacion) |

### Esquema `configuracion`

```sql
clave  VARCHAR(50) PRIMARY KEY
valor  TEXT NOT NULL
```

**Registros actuales:**

| clave | valor |
|---|---|
| `nombre_congregacion` | `Congregacion del Recreo` |
| `anio_en_curso` | `2026` |

> RLS habilitado con policy de lectura pública. Para editar el nombre de congregación, actualizar directamente en Supabase Table Editor o via SQL: `UPDATE configuracion SET valor = 'Nuevo Nombre' WHERE clave = 'nombre_congregacion'`.

### Esquema `personas`

```sql
clave    VARCHAR(10) PRIMARY KEY  -- 'M-001' (Mat) o 'A-001' (Anc/SM)
lista    VARCHAR(10)              -- 'Mat' | 'Anc/SM'
nombre   VARCHAR(120)
sexo     CHAR(1)                  -- 'F' | 'M'
estatus  VARCHAR(30)              -- ver tabla abajo
activo   BOOLEAN DEFAULT TRUE
```

**Estatus válidos por lista/sexo:**

| Lista | Sexo | Estatus posibles |
|---|---|---|
| Mat | F | Matriculada, Matriculada bautizada |
| Mat | M | Matriculado, Matriculado bautizado |
| Anc/SM | M | Anciano, Siervo Ministerial |

### Esquema `participaciones`

```sql
id            SERIAL PRIMARY KEY
clave         VARCHAR(10) REFERENCES personas(clave)
nombre        VARCHAR(120)
lista         VARCHAR(10)
fecha         DATE
mes           VARCHAR(20)   -- 'Enero', 'Febrero', etc.
tipo          VARCHAR(10)   -- ver tabla de tipos abajo (ampliado a VARCHAR(10))
peso          SMALLINT      -- T=2, todos los demás=1, ORACION_C=0
observaciones TEXT
```

### Tipos de participación (`tipo`) — catálogo actualizado

| Tipo BD | tipo_asignacion | Descripción | Quién |
|---|---|---|---|
| `P` | `P` | Presidente | Anc/SM |
| `TB` | `TB` | Tesoros de la Biblia | Anc/SM |
| `PE` | `PE` | Perlas escondidas | Anc/SM |
| `VC` | `VC` | Vida Cristiana | Anc/SM |
| `NC` | `NC` | Necesidades de la congregación | Solo Ancianos |
| `EBC` | `EBC_CON` | Conductor EBC | Ancianos pref., SM |
| `LB` | `LB` | Lectura bíblica | Varones Mat |
| `DSC` | `SMT_DSC` | Discurso SMT | Varones Mat |
| `T` | `SMT_EST` | Estudiante SMT (damas) | Damas Mat |
| `T` | `SMT_EXP` | Explique sus creencias (ambos sexos) | Todos los Mat |
| `A` | `SMT_AYU` | Ayudante SMT | Mismo sexo que titular |
| `LEBC` | `LEBC` | Lector EBC | Varones Mat |
| `OC` | `ORACION_C` | Oración de cierre | Anc/SM o varón Mat — peso=0 |

> **Nota:** `ORACION` y `CONCLU` son **solo visuales** — no generan registro en `participaciones` ni en `programa_asignaciones`. Se propagan del Presidente en la UI únicamente.
> **Nota:** El tipo genérico `'X'` está deprecado. Los registros históricos se conservan.

### Tablas del módulo Programa

```sql
programa_semanas:
  id, fecha_inicio DATE, fecha_fin DATE, capitulo_biblico,
  cancion_apertura, cancion_vc, cancion_cierre,
  mes, anio, epub_filename
  UNIQUE(fecha_inicio, fecha_fin)

programa_partes:
  id, semana_id UUID→programa_semanas,
  seccion VARCHAR(10)      -- 'APERTURA'|'TB'|'SMT'|'VC'|'CIERRE'
  tipo_asignacion VARCHAR(15)  -- ver tabla abajo
  titulo, duracion_min, numero_parte,
  requiere_ayudante BOOLEAN,
  hora_inicio, hora_fin

programa_asignaciones:
  id, parte_id UUID→programa_partes,
  clave VARCHAR(10)→personas,
  rol VARCHAR(10)          -- 'principal'|'ayudante'
  sugerido_por_app BOOLEAN,
  confirmado BOOLEAN,
  participacion_id INT→participaciones
```

### Tipos de asignación (`tipo_asignacion` en programa_partes) — estado actual

| Tipo | Sección | Quién puede hacerlo | Guarda en BD |
|---|---|---|---|
| `P` | APERTURA | Anc/SM | ✅ tipo `P` |
| `ORACION` | APERTURA | Read-only — propagado del Presidente, solo visual | ❌ no se guarda |
| `CONCLU` | CIERRE | Read-only — propagado del Presidente, solo visual | ❌ no se guarda |
| `ORACION_C` | CIERRE | Anc/SM o varón Mat bautizado, distinto al Presidente | ✅ tipo `OC`, peso=0 |
| `TB` | TB | Anc/SM | ✅ tipo `TB` |
| `PE` | TB | Anc/SM | ✅ tipo `PE` |
| `LB` | TB | Varones Mat | ✅ tipo `LB` |
| `SMT_EST` | SMT | Damas Mat (requiere_ayudante=true) | ✅ tipo `T` |
| `SMT_EXP` | SMT | Todos los Mat (requiere_ayudante=true, ayudante mismo sexo) | ✅ tipo `T` |
| `SMT_DSC` | SMT | Varones Mat | ✅ tipo `DSC` |
| `SMT_VACIO` | SMT | Slot vacío — no asignable | ❌ no se guarda |
| `VC` | VC | Anc/SM | ✅ tipo `VC` |
| `NC` | VC | Solo Ancianos | ✅ tipo `NC` |
| `EBC_CON` | VC | Ancianos pref., SM | ✅ tipo `EBC` |
| `LEBC` | VC | Varones Mat | ✅ tipo `LEBC` |

> **`INTRO` fue eliminado.** El tipo existía para "Palabras de introducción" pero se removió — esa función cae dentro del rol del Presidente.

> **Regla `SMT_EXP` — ayudante mismo sexo:** Cuando el titular es varón, el selector de ayudante filtra solo varones Mat (`SMT_EXP_M`). Cuando es dama, solo damas Mat (`SMT_EXP_F`). Esto se resuelve en `FilaParte` leyendo el sexo del principal de `personas` antes de pasar `tipo` al `PersonaSelector` del ayudante.

> **Regla `handleConfirmarTodo`:** Solo itera sobre asignaciones con `rol === 'principal'` para evitar procesar el ayudante dos veces. `handleConfirmar` también tiene guard `if (principal.rol === 'ayudante') return`.

---

## Reglas de negocio — Rotación de participantes

### Matriculados
- No participar **2 meses seguidos**
- Damas: alternar Titular (T) → Asistente (A) → T → A entre meses
- En `SMT_EXP` la regla de alternancia T→A aplica igualmente para damas

### Siervos Ministeriales
- Intentar que participen **al menos 1 vez al mes**
- No repetir la **misma asignación 2 meses seguidos**

### Ancianos
- Máximo **3 asignaciones por mes**
- No repetir la **misma asignación 2 meses seguidos** (en la medida de lo posible)

---

## Módulo Programa S-140

### Flujo completo

```
1. Subir EPUB mwb (e.g. mwb_S_202607.epub)
      ↓
2. epubParser.js descomprime (JSZip), recorre archivos .xhtml del spine
   Detecta semanas por h1 con patrón de fechas (e.g. "6-12 DE JULIO")
   Clasifica partes por COLOR CSS primero (prioridad sobre texto):
     teal  → TB (PE si "perlas", LB si "lectura")
     maroon → VC (NC si "necesidades", EBC_CON si "estudio bíblico")
     gold  → SMT (provisional, se corrige en push)
   Fallback por texto si no hay color.
   Clasificación SMT por título (lista blanca):
     SMT_EXP: "explique sus creencias"
     SMT_EST: "empiece conversaciones", "haga revisitas", "haga discípulos"
     SMT_DSC: todo lo demás (discursos especiales, etc.)
   Cap de 4 partes SMT; si < 4 se rellena con SMT_VACIO
   Calcula horarios: TB fijos (19:00-19:24), SMT acumulado desde 19:25, VC desde 19:45
      ↓
3. Se insertan semanas y partes en Supabase
      ↓
4. Motor de sugerencias (asignacionesSugeridas.js) auto-asigna candidatos
   usando historial de participaciones y reglas de rotación
   → sugerido_por_app = true, confirmado = false
      ↓
5. Usuario revisa en Programa.jsx, puede cambiar selectores
   Los selectores muestran candidatos ordenados: ✓ libre | ↻ advertencia | ⚠ penalizado
   ORACION y CONCLU son read-only — reflejan al Presidente, NO se guardan en BD
      ↓
6. Al confirmar → crea registro automático en tabla participaciones
   (ORACION, CONCLU y SMT_VACIO nunca generan registro)
      ↓
7. Botón "Generar S-140" → generarS140.js llena la plantilla y descarga el .docx
```

### Progreso de confirmación en tarjetas

El cálculo de `confirmadas/totalPartes` y el porcentaje se hace **por partes únicas**, no por registros de asignación. Una parte SMT con principal + ayudante cuenta como 1 parte, no 2. La lógica:

```jsx
const partesContables = partes.filter(p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
const confirmadas = partesContables.filter(p =>
  asignaciones.some(a => a.parte_id === p.id && a.rol === 'principal' && a.confirmado)
).length
```

La barra de progreso cambia de color: rojo (0–49%), amber (50–99%), verde (100%).

### Horarios fijos de referencia

| Sección | Hora inicio |
|---|---|
| Canción apertura + oración | 19:00 |
| TB (discurso principal) | 19:00 |
| Perlas escondidas | 19:10 |
| Lectura de la Biblia | 19:20 |
| SMT (primera parte) | 19:25 |
| Canción VC | 19:45 |
| VC (primera parte) | 19:45 |
| Palabras de conclusión | 20:37 |
| Canción cierre + oración | 20:40 |

### generarS140.js — arquitectura actual

Usa `docxtemplater` + `pizzip` para llenar la plantilla `public/S-140_plantilla.docx`.

**Funciones exportadas:**
- `buildDatosDesdeSupabase(semanas, partes, asignaciones, personas)` → array de semanas normalizadas
- `buildDatosPlantilla(congregacion, semanas)` → objeto plano con todas las variables `{$s1_presidente$}`, etc.
- `generarYDescargarS140({ congregacion, semanas })` → fetch plantilla → render → descarga

El valor de `congregacion` se lee desde la tabla `configuracion` (clave `nombre_congregacion`) al montar `Programa.jsx`, con fallback al string `'Congregacion del Recreo'` si el fetch falla.

---

## Componentes y hooks de UI

### Toast (`src/components/Toast.jsx` + `src/hooks/useToast.js`)

Sistema de notificaciones con 4 tipos: `success` (verde), `error` (rojo), `warning` (amber), `info` (azul). Cada tipo muestra barra de color lateral + icono + mensaje. Auto-dismiss en 3s, animación slide-up.

### ConfirmDialog (`src/components/ConfirmDialog.jsx` + `src/hooks/useConfirm.js`)

Reemplaza `window.confirm()` en todas las páginas. Soporta ESC (cancelar) y Enter (confirmar) desde teclado. Botón cancelar: blanco normal → rojo hover. Botón confirmar: negro normal → verde hover (o rojo si `danger: true`). Animación scale+fade de entrada.

### Skeleton (`src/components/Skeleton.jsx`)

Placeholders animados para estados de carga. Componentes disponibles:
- `<SkeletonBlock className="..." />` — bloque genérico con pulso
- `<SkeletonRow cols={3} />` — fila tipo lista con avatar circular
- `<SkeletonList rows={6} cols={3} />` — lista de N filas skeleton
- `<SkeletonCard />` — tarjeta estilo Programa
- `<SkeletonPrograma cards={4} />` — pantalla completa para Programa

### Sidebar colapsable (`App.jsx`)

Estado `open` persiste en `localStorage`. En modo colapsado (`w-14`): solo iconos con tooltip. En modo expandido (`w-56`): iconos + labels + sección de stats. Toggle con botón ← / →. Transición CSS `duration-300`.

### Navegación móvil (comportamiento adaptativo < 768px)

- **Desktop (≥ 768px):** Sidebar fijo, colapsable, sticky.
- **Móvil (< 768px):** Sidebar se convierte en un drawer overlay desde la izquierda. Se abre mediante un botón de hamburguesa (☰) a la izquierda del topbar.
- **Pulido móvil:** Ocultación automática de subtítulos y dot Realtime en topbar. Breadcrumbs simplificados. Inputs adaptados con `text-base` para evitar zoom automático en iOS.

### Auto-hide header (móvil)

El topbar se oculta al hacer scroll hacia abajo (>10px) y reaparece al hacer scroll hacia arriba. Esto maximiza el espacio vertical en portrait móvil. La lógica se implementa leyendo `main.scrollTop` en `App.jsx`.

---

## Design system (Tailwind)

Variables de color custom definidas en `tailwind.config.js`:

```
bg, surface, border, border2
text1, text2, text3
accent (#1C6B4A verde), accent-hover (#155236), accent-bg
blue, blue-bg
amber, amber-bg
purple, purple-bg
teal, teal-bg
rose, rose-bg
danger (#A32020), danger-bg
```

### Convenciones y estados de UI (Estándar oficial — Brief 13)

- **Botón primario:** `bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed`
- **Botón secundario / outline:** `border border-border2 text-text2 hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed`
- **Inputs y selects:** `border border-border2 bg-surface text-text1 outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed`
- **Transiciones:** `index.css` define transiciones base de 100ms para `a, button, input, select, textarea`. No usar `transition-none` en botones interactivos de acción.

### Animaciones definidas en `index.css`

```css
/* Toast */
@keyframes slide-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
.animate-slide-up { animation: slide-up 200ms ease forwards }

/* ConfirmDialog / modales */
@keyframes fade-in  { from { opacity:0 } to { opacity:1 } }
@keyframes scale-in { from { opacity:0; transform:scale(0.95) translateY(4px) } to { opacity:1; transform:scale(1) translateY(0) } }
.animate-fade-in  { animation: fade-in  150ms ease forwards }
.animate-scale-in { animation: scale-in 150ms ease forwards }
```

---

## Patrones de código importantes

### Realtime Supabase
Siempre usar wrapper `() => fetchData()`, no pasar `fetchData` directamente:
```js
.on('postgres_changes', { event: '*', schema: 'public', table: 'X' }, () => fetchData())
```

### Fechas ISO
Las fechas de Supabase pueden venir como `2026-03-15T00:00:00` — siempre normalizar con:
```js
function toYyyyMmDd(fecha) {
  const m = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}
```

### Mes desde fecha
```js
new Date(fecha + 'T12:00:00').toLocaleString('es-MX', { month: 'long' })
  .replace(/^\w/, c => c.toUpperCase())
// Usar T12:00:00 para evitar problemas de zona horaria
```

---

## Pendientes y Sugerencias de Pulido (Unificado)

*Nota: Todas las sugerencias anteriormente contenidas en `UIUX_Sug.md` y las pendientes de `CLAUDE.md` han sido consolidadas y priorizadas en esta sección única.*

### 🔴 Prioridad Alta (Crítica)
- [X] **Tests del motor de sugerencias** — Añadidos tests unitarios exhaustivos con Vitest para `asignacionesSugeridas.js` cubriendo 5 grupos de pruebas (filtrado de pool por tipo, rotación y scoring, transición entre meses, sugerencia de ayudantes y casos borde). Configurados scripts de test en `package.json`.
- [X] **Eliminar usuario completamente** — Implementada la Edge Function `delete-user` (con `service_role`) para eliminar cuentas en `auth.users` y en `usuarios_autorizados`. Botón "Eliminar" en `Usuarios.jsx` condicionado a usuarios inactivos, rol admin y prevención de auto-eliminación.
- [X] **Manejo de errores de red en fetches** — Capturar fallas de conexión de red en todos los métodos de consulta `fetchData` para evitar páginas en blanco y mostrar un mensaje de error explícito (diferenciando "tabla vacía" de "error de conexión").

### 🟡 Prioridad Media (Experiencia de Usuario e Interfaz)
- [ ] **Atajos de teclado globales** — Implementar combinaciones básicas como `Ctrl+K` / `Cmd+K` para una paleta de comandos rápida, `?` para ver atajos disponibles, y la tecla `N` para crear un nuevo registro o persona de manera contextual.
- [ ] **Vista Editable — Sticky headers** — Fijar de forma permanente la columna izquierda de personas y la fila superior de meses para no perder la referencia al hacer scroll horizontal o vertical.
- [ ] **Vista Editable — Múltiples asignaciones de Matriculados en la misma celda** — Permitir visualizar de forma compacta (ej: `T²` o badges apilados pequeños) cuando una persona tiene más de una participación en el mismo mes.
- [ ] **Vista Editable — Rediseño del modal de Matriculados (solo lectura)** — Dado que las asignaciones se hacen en Programa S-140, modificar el modal de celda para que sea puramente informativo, incluyendo un enlace directo para navegar al programa semanal respectivo.
- [ ] **Nueva Vista Semanal (Lectura rápida del programa)** — Diseñar una vista/página de sólo lectura para mostrar la agenda de la semana actual. Definir si vive como pestaña de `VistaEditable` o sección en el sidebar, si muestra asignaciones pendientes, y el formato de visualización (lineal o calendario).
- [ ] **Programa S-140 — Botón flotante "Generar S-140"** — Colocar el botón como un elemento flotante fijado en la parte inferior derecha, facilitando su acceso rápido sin depender de hacer scroll.
- [ ] **Programa S-140 — Modo lectura vs edición** — Añadir un selector/toggle para alternar entre edición (con dropdowns y botones de acción) y lectura limpia (programa finalizado ideal para revisión visual rápida).
- [X] **Registros — Filtros persistentes** — Almacenar el último filtro de catálogo seleccionado en `localStorage` (`registros_filterMes`, `registros_filterLista`) y botón ✕ para limpiar filtros activos.
- [X] **Registros — Paginación y Selector de registros por página** — Eliminado el límite truncado de 100 registros en la consulta para cargar la totalidad de participaciones del año. Añadida barra inferior de paginación (estilo Supabase Table Editor) con botones de navegación (← / →), indicador de página actual y total, selector de tamaño de página (25, 50, 100, 250, 500) con persistencia en `localStorage` (`registros_pageSize`) y contador dinámico de registros visibles/filtrados.
- [ ] **Registros — Acciones masivas (Bulk actions)** — Incorporar checkboxes en la lista de registros para permitir eliminar o cambiar tipo a múltiples filas a la vez.
- [ ] **Registros — Validación en tiempo real** — Impedir guardar o alertar en color rojo si se asocia un tipo de rol restringido a una persona (ej: tipo "NC" asignado a una persona de lista "Mat").
- [X] **Personas — Filtros rápidos** — Reemplazados los selectores de lista (`Todas`, `Mat`, `Anc·SM`) y activo (`Activos`, `Inactivos`, `Todos`) por grupos de botones tag con selección visual activa (`bg-accent text-white`).
- [ ] **Exportar / Importar — Carga interactiva Drag & Drop** — Habilitar la subida del archivo CSV/XLSX arrastrándolo a la caja de carga.
- [ ] **Exportar / Importar — Vista previa y validación previa** — Mostrar una tabla con los primeros 5 renglones del CSV cargado antes de enviarlo a Supabase, validando la consistencia de tipos y columnas.
- [X] **Design System — Homogeneización de estados de UI** — Aplicar estilos uniformes de `disabled` (`opacity-50`, `cursor-not-allowed`), hover con token oficial (`accent-hover: #155236`), y foco (`focus:border-accent`) en inputs, selectores y botones de todas las vistas.
- [ ] **Accesibilidad (a11y)** — Asegurar contraste suficiente en textos pequeños (conforme a las directrices WCAG AA) e incorporar atributos `aria-label` en iconos y botones sin etiquetas textuales legibles.

### 🔵 Prioridad Baja (Futuro y Optimizaciones)
- [ ] **Gráficos en Estadísticas** — Integrar visualizaciones de barras horizontales (por tipo), pastel (Mat vs Anc/SM) y líneas (timeline) usando la librería `recharts`.
- [ ] **Configuración de tema y persistencia** — Crear un toggle de tema claro/oscuro que guarde la preferencia en `configuracion` de usuario o en el almacenamiento local.
- [ ] **Onboarding / Tour de primer uso** — Crear un tour interactivo para nuevos usuarios administradores y un panel lateral deslizable de ayuda rápida.
- [ ] **Exportación a PDF** — Agregar un botón en la futura Vista Semanal para exportar/imprimir el itinerario en PDF optimizado para impresión física.
- [X] **Migración SQL para `tipo_asignacion` VARCHAR(15)** — Ampliar la longitud del campo `tipo_asignacion` en `programa_partes` para asegurar espacio adicional holgado.
- [X] **SMT_AYU como tipo independiente** — Registrar de forma explícita el tipo de asignación para el ayudante principal, simplificando las consultas SQL en cascada.
- [ ] **Conversión a PWA (Progressive Web App)** — Configurar `vite-plugin-pwa` para permitir la instalación de la aplicación en el dispositivo móvil como si fuera nativa, permitiendo acceso offline a los datos locales.

---

## Bugs corregidos (histórico)

- `App.jsx` sidebar: `overflow-y-autoflex-shrink-0` → `overflow-y-auto flex-shrink-0`
- `FilaParte`: grid duplicado para APERTURA/CIERRE — corregido a grid único de 4 columnas
- Contador de progreso en `TarjetaSemana`: excluye `SMT_VACIO`, `ORACION` y `CONCLU` del total; cuenta partes únicas (no registros de asignación) para evitar que el ayudante SMT infle el conteo por encima del 100%
- `handleConfirmarTodo`: filtra `rol === 'principal'` para no procesar ayudantes por separado — eliminaba 3 registros duplicados del ayudante SMT
- `handleConfirmar`: guard `if (principal.rol === 'ayudante') return` como segunda capa de protección
- `handleConfirmar`: guard `if (tipo === 'ORACION' || tipo === 'CONCLU') return` — partes visuales no generan registro en BD
- Fechas en modal Matriculados: usar `useRef` para el campo nombre para evitar pérdida de tildes
- `generarS140.js`: migrado de `docx` a `docxtemplater + pizzip`
- `docxtemplater` "duplicate open tag": resuelto con delimitadores `{$` y `$}` en lugar de `{{` y `}}`
- **epubParser — "Seamos adaptables" en SMT:** Resuelto con prioridad de color CSS sobre texto. Partes con clase `maroon` van a VC aunque el texto contenga palabras clave de SMT.
- **epubParser — SMT cap y lista blanca:** Máximo 4 partes SMT; clasificación por lista blanca de títulos canónicos.
- **`INTRO` eliminado:** Tipo removido completamente — del parser, sugerencias, mapas de Programa.jsx. El EPUB puede mencionar "introducción" en apertura pero el parser lo mapea directo a `P`.
- **`LEBC` typo corregido:** En `TIPO_PARTICIPACION` de `Programa.jsx` era `LEBC: 'LBEC'` (invertido). Corregido a `LEBC: 'LEBC'` para consistencia con `Registros.jsx` y la BD.
- **`EBC_LEC` → `LEBC`:** Renombrado en todos los archivos. Migración Supabase: `UPDATE programa_partes SET tipo_asignacion = 'LEBC' WHERE tipo_asignacion = 'EBC_LEC'`
- **`SMT_EXP` — nuevo tipo:** "Explique sus creencias" separado de `SMT_EST`. Pool = todos los Mat. Ayudante sigue el sexo del titular: `SMT_EXP_M` (varones) o `SMT_EXP_F` (damas), resuelto en `FilaParte` dinámicamente.
- **Plantilla S-140 ampliada de 5 a 9 slots** — `buildDatosPlantilla` itera s1..s9, `S-140_plantilla.docx` tiene las filas correspondientes.
- **Indicador Realtime en App.jsx:** Suscripción al canal `__status__` de Supabase v2 para detectar estados de conexión e indicarlos en el topbar mediante un dot pulsante y etiqueta.
- **Breadcrumbs de navegación:** Creado el componente interactivo `Breadcrumb.jsx` montado en el área principal de la app para una navegación ágil y contextual de regreso a la pantalla de inicio (`editable`).
- **Edición inline en Registros.jsx:** Removido el modal y la acción `window.scrollTo`. Ahora al hacer clic en un registro se expande un panel inline (`RowForm`) con reinicio automático de estado mediante prop `key={r.id}`. El formulario principal se simplificó para enfocarse únicamente en agregar nuevos registros.
- **Bugs de linter `react-hooks/set-state-in-effect`:** Corregidos problemas en efectos síncronos de `RowForm` (Registros) y en el focus y limpieza del buscador de `PersonaSelector` (Programa).
- **Desfase de dropdowns fijos (Containing block en CSS):** Resuelto error donde el selector de personas aparecía desplazado a la derecha de forma incorrecta. Ocurría porque la animación de entrada de la vista principal (`fade-in-up`) usaba `transform` con `fill-mode: both`, lo cual establecía un bloque de contención alternativo en CSS para los descendientes fijos. Se migró a una transición basada puramente en opacidad (`view-fade`) y se añadió `{ preventScroll: true }` en el focus del input de búsqueda para evitar micro-scrolls accidentales del navegador que cerraban o movían el dropdown.
- **Gestión de usuarios y Edge Function `invite-user` (07/08/2026):**
  - Creada página `Usuarios.jsx` con formulario de invitación, lista de usuarios autorizados con badges (`Activo`/`Inactivo`), alternancia de estado con `useConfirm`, Realtime en canal `usuarios-mgmt` y `SkeletonList`.
  - Conectado a la Edge Function `https://evqhdemvmnhwnsnrmdzk.supabase.co/functions/v1/invite-user` enviando `Authorization: Bearer ${session.access_token}` y `apikey`. Crea la cuenta en Supabase Auth y la lista blanca de forma segura.
  - Registrada la vista en `NAV` (sección "Gestión"), `TOPBAR_SUB` y `renderView` en `App.jsx`.
- **Despliegue y Flujo de Invitación Completo (10/08/2026):**
  - Despliegue completado con éxito en Vercel.
  - Creada la página y ruta pública `/set-password` para procesar el restablecimiento seguro de contraseñas.
  - Actualizado `redirectTo` en el flujo de Supabase Auth para guiar a los usuarios invitados a `/set-password`.
  - Confirmación modal (`useConfirm`) en el botón de cerrar sesión en el Sidebar y popup personalizado en `App.jsx`.
- **Mejoras del módulo Exportar y Estadísticas (10/08/2026):**
  - Escape automático de comillas simples (`escapeSql`) al exportar en formato SQL para evitar errores de sintaxis en nombres con caracteres especiales (ej. `O'Brien`).
  - Agregado filtro por rango de meses (inicio y fin) al exportar participaciones en CSV o SQL.
  - Alerta detallada post-importación de CSV informando del número exacto de inserciones y fallos.
  - Removida la redundancia estilística `CHIP_CLASS` en favor de `BADGE_CLASS` en `VistaEditable.jsx`.
  - Añadido panel "Poca actividad" en la pantalla de estadísticas que lista personas activas con 1 o 2 asignaciones en el periodo para su correcta monitorización.
- **Manejo de errores de red en fetches (12/08/2026):**
  - Implementado `fetchError` / `fetchErrorP` / `fetchErrorR` en 8 páginas de la aplicación (`Estadisticas`, `Personas`, `Registros`, `VistaEditable`, `VistaSql`, `Exportar`, `Usuarios`, `Programa`).
  - Agregadas validaciones try/catch/finally con desestructuración individual de errores de Supabase, limpiando errores previos antes de cada fetch.
  - Implementado early return o renderizado condicional de error con botón de **Reintentar** para evitar skeletons congelados y páginas vacías silenciosas.
  - Modificadas las funciones de `Exportar.jsx` para reportar fallos de red por Toast y asegurar que `loading` se limpie en catch.
- **Brief 02 — Edge Function: eliminar usuario (13/08/2026):**
  - Creada la estructura y archivo `supabase/functions/delete-user/index.ts` que valida permisos de admin con service role key, comprueba el token Bearer del llamador, previene auto-eliminación y elimina el usuario tanto de `auth.users` como de `usuarios_autorizados`.
  - Actualizado `App.jsx` para pasar `currentUser` y `currentRol` a `<Usuarios />`.
  - Implementada la función `handleDeleteUsuario` con diálogo de confirmación de peligro (`useConfirm`) en `Usuarios.jsx`.
  - Añadido botón "Eliminar" en la UI condicionado a que el usuario esté inactivo (`!u.activo`), el usuario logueado sea admin y no sea la propia cuenta.
- **Brief 03 — Tests para asignacionesSugeridas.js (14/08/2026):**
  - Instalado Vitest en `participantes-app/` y configurados los scripts `"test": "vitest run"` y `"test:watch": "vitest"` en `package.json`.
  - Creada suite de pruebas unitarias en `src/lib/asignacionesSugeridas.test.js` con 25 tests estructurados en 5 grupos: filtrado de pool por tipo (`P`, `ORACION`, `TB`, `LB`, `SMT_EST`, `SMT_EXP`, `SMT_EXP_M`, `SMT_EXP_F`, `NC`, `EBC_CON`, `LEBC`), reglas de rotación y scoring, transición entre meses (Diciembre a Enero), asignación de ayudantes y manejo de casos borde / entradas inválidas.
  - 100% de tests pasando en verde manteniendo intacto el código fuente de `asignacionesSugeridas.js`.
- **Brief 04 — Feedback visual al confirmar asignación (14/08/2026):**
  - Añadido estado local `flashing` en `FilaParte` (`Programa.jsx`).
  - El botón de confirmación ejecuta la acción de forma asíncrona (`await onConfirmar(...)`) y activa un flash visual de 600ms con fondo verde sólido (`bg-accent text-white border-accent`), icono `✓` y protección contra doble click con `disabled={flashing}` (`disabled:opacity-60 disabled:cursor-not-allowed`).
- **Corrección de colapso de Sidebar en desktop y móvil (14/08/2026):**
  - Resuelto error donde el encabezado del sidebar no ocultaba el texto de título al colapsar en desktop (`md:w-14`), desbordando y empujando el botón de alternancia (`→`) fuera de pantalla.
  - Condicionados los encabezados de sección y las etiquetas de navegación con `${open ? 'block' : 'block md:hidden'}`, restaurando el centrado perfecto de los iconos (`md:justify-center md:px-0 md:gap-0`) y tooltips nativos en estado colapsado.
  - Ajustado el badge de `semanasPendientes` para mostrar un punto indicador (`dot`) en desktop colapsado y el contador completo en móvil o desktop expandido.
- **Sincronización en segundo plano y persistencia de estado en Programa y Vista Editable (14/08/2026):**
  - Eliminado el desmontaje involuntario de vistas provocado por `setLoading(true)` en llamadas subsiguientes de `fetchData()`.
  - Implementado parámetro `isInitial = false` en `fetchData` de `Programa.jsx` y `VistaEditable.jsx`, reservando los skeletons y loaders únicamente para la carga inicial o botón de reintento.
  - Elevada la persistencia de semanas desplegadas a `expandedWeeks` en `Programa.jsx`, permitiendo asignar, confirmar, reconfirmar y desconfirmar asignaciones manteniendo siempre las tarjetas de semana abiertas sin saltos de scroll ni parpadeos.
  - En `VistaEditable.jsx`, la tabla y modales (como `AncCellModal`) se mantienen montados durante guardados y actualizaciones en tiempo real.
- **Brief 05 — Filtros persistentes en Registros (14/08/2026):**
  - Implementada persistencia en `localStorage` para `filterMes` (`registros_filterMes`) y `filterLista` (`registros_filterLista`) en `Registros.jsx` con inicialización lazy (`useState(() => localStorage.getItem(...) ?? '')`) y sincronización automática vía `useEffect`.
  - Añadido botón condicional `✕` ("Limpiar filtros") que resetea ambos selectores a vacío y limpia las entradas en `localStorage`.
  - El campo de búsqueda `search` se mantiene no persistente por diseño para evitar confusión al regresar a la vista.
  - Integrada la sincronización en segundo plano con `fetchData(isInitial = false)` para prevenir parpadeos con `<SkeletonList>` durante mutaciones y eventos de Realtime.
- **Paginación y Selector de registros por página en Registros (14/08/2026):**
  - Eliminado el límite truncado `.limit(100)` en `Registros.jsx`, permitiendo el acceso completo a los más de 230 registros de participaciones a lo largo del año.
  - Ordenamiento determinista de registros por `id` descendente (`.order('id', { ascending: false })`) para mantener una secuencia limpia de mayor a menor sin mezclas en fechas duplicadas.
  - Implementada barra inferior de paginación inspirada en el Table Editor de Supabase: navegación entre páginas con botones `←` y `→`, indicador interactivo `Página X de Y`, selector de registros por página (`25`, `50`, `100`, `250`, `500`) con persistencia en `localStorage` (`registros_pageSize`) y rango estadístico en vivo (`Mostrando A–B de C registros`).
  - Reseteo automático de página a `1` al cambiar búsquedas o filtros de catálogo.
- **Brief 06 — Filtros rápidos en Personas (16/08/2026):**
  - Reemplazados los `<select>` de filtrado en `Personas.jsx` por grupos de botones tag segmentados con bordes redondeados (`overflow-hidden rounded-lg border border-border2`):
    - Grupo Lista: `Todas` (`''`), `Mat` (`'Mat'`), `Anc·SM` (`'Anc/SM'`).
    - Grupo Activo: `Activos` (`'true'`), `Inactivos` (`'false'`), `Todos` (`''`).
  - Preservados los valores exactos de strings y la lógica de filtrado de `filtered` sin alterar estados ni handlers.
  - Integrada la sincronización en segundo plano con `fetchPersonas(isInitial = false)` para evitar parpadeos con `<SkeletonList>` durante mutaciones o eventos de Realtime.
- **Brief 07 — Bugs motor de sugerencias (16/08/2026):**
  - Corregido el encabezado de archivo en `asignacionesSugeridas.js`.
  - Implementada la alternancia T→A de damas (`SMT_EST`, `SMT_EXP`, `SMT_EXP_F`) según rol del mes previo (`T` $\rightarrow -30$, `A` $\rightarrow +20$, `!ultTipo` $\rightarrow +10$).
  - Clarificada la regla de Lector EBC (`LEBC`): cualquier varón elegible (`Anc/SM` o `Mat`), limpiando comentarios obsoletos de bautismo.
  - Limpieza de código: unificación de casos `TB` y `PE`, simplificación de comentarios en `LB` y `EBC_CON`, remoción del helper `yaEstaEnSemana` para uso inline directo, y actualización de JSDoc de `sugerirAyudante`.
  - Actualización de suite de pruebas unitarias (`asignacionesSugeridas.test.js`): formalizado el test de `LEBC` y añadidos 3 tests para alternancia T→A, alcanzando 28 tests en verde al 100%.
- **Brief 08 — Modal Mat solo lectura + FAB "Generar S-140" (17/08/2026):**
  - Pasada prop `onNavigate={setView}` desde `App.jsx` a `<VistaEditable />`.
  - Convertido `MatCellModal` en `VistaEditable.jsx` a vista de solo lectura (tipo badge, fecha y observaciones) con mensaje "Sin participación registrada este mes" cuando aplica, y botón de navegación directa "Ver en Programa →".
  - Eliminada función `handleMatSave` no utilizada en `VistaEditable.jsx`, preservando `handleDelete` y `handleAncAdd` para `AncCellModal`.
  - Reubicado el botón "Generar S-140" en `Programa.jsx` a un botón de acción flotante (FAB) fijo en la esquina inferior derecha (`fixed bottom-6 right-6 z-50 rounded-full`), accesible en todo momento durante el scroll de semanas.
- **Brief 09 — Validación en tiempo real en Registros (17/08/2026):**
  - Implementado estado derivado de validación (`validationErrors` y `hasErrors`) en render en `Registros.jsx` sin estados adicionales `useState`.
  - Añadidos mensajes de feedback inline (`↑ Selecciona...`) con tipografía mono roja para Persona, Fecha (alternado dinámicamente con el preview `→ Mes`) y Tipo (visible tras seleccionar una persona).
  - Bloqueado el botón "Guardar →" con `disabled={saving || hasErrors}`.
  - Eliminada la guarda redundante con toast de error en `handleAddSave`.
- **Brief 10 — Vista previa CSV antes de importar (17/08/2026):**
  - Implementado modal de vista previa antes de ejecutar la importación de `participantes.csv` y `participaciones.csv` en `Exportar.jsx`.
  - Separado el flujo en dos fases: extracción/parseo de headers y primeras 5 filas (`handleFileSelect`) y ejecución con confirmación explícita (`confirmImport`).
  - Creado el componente auxiliar `HeadersWarning` para verificar columnas requeridas (`HEADERS_PART` y `HEADERS_PARTIC`) alertando si faltan campos obligatorios.
  - Reseteo automático de `e.target.value` al seleccionar archivos para permitir re-selección inmediata.
- **Brief 11 — Gráficos interactivos en Estadísticas (17/08/2026):**
  - Instalada la librería `recharts` en `participantes-app`.
  - Reemplazadas las barras estáticas en `Estadisticas.jsx` por gráficos interactivos `BarChart` (`ResponsiveContainer`) para "Participaciones por tipo" (orientación horizontal) y "Participaciones por mes" (orientación vertical).
  - Implementados los tooltips personalizados `TipoTooltip` (tipo, etiqueta descriptiva y conteo) y `MesTooltip` (mes, conteo y participantes únicos).
  - Mapeados los colores y tipografías del design system (`accent` `#1C6B4A`, `accent-bg` `#EAF5EE`, `text2` `#6B6860`, `IBM Plex Mono`).
  - Renombrado helper de barras para Top Personas a `CustomBar` y limpiadas variables no utilizadas.
- **Brief 12 — Múltiples asignaciones por celda en VistaEditable (tabla Mat) (17/08/2026):**
  - Adaptada la celda mensual de la tabla de Matriculados en `VistaEditable.jsx` al patrón apilado multi-registro `día + badge` (`registros.filter` ordenado por fecha) homologando el comportamiento con la tabla de Anc/SM.
  - Actualizado `MatCellModal` para iterar y mostrar todas las participaciones (`recs[]`) del mes seleccionado con su respectivo tipo, fecha y observaciones.
- **Brief 13 — Homogeneización de la UI (20/08/2026):**
  - Añadido el token `'accent-hover': '#155236'` en `tailwind.config.js` y reemplazadas todas las ocurrencias hardcodeadas de `hover:bg-green-800` por `hover:bg-accent-hover` en 9 componentes y vistas (`Usuarios`, `Registros`, `Personas`, `Programa`, `SetPassword`, `VistaEditable`, `Login`, `Exportar`, `PerfilDrawer`).
  - Homogeneizado el par `disabled:opacity-50 disabled:cursor-not-allowed` en todos los botones e inputs interactivos de la aplicación.
  - Añadido `focus:border-accent` a todos los `<select>` de la aplicación (`Estadisticas`, `VistaSql`, `Exportar`, `Usuarios`).
  - Retirado `transition-none` del botón de actualización en `Registros.jsx` y unificada la opacidad de paginación a `disabled:opacity-50`.
  - Establecidas las directrices de estados de UI como estándar oficial del proyecto para futuros desarrollos.









