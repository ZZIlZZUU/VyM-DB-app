# VyM-DB — Participantes App

Aplicación web para gestión de participaciones en reuniones de congregación (Testigos de Jehová). Registra quién participa cada mes, en qué rol, y genera el programa S-140 en `.docx`.

---

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Fuentes:** Inter (Google Fonts) / Monospace para claves y contadores
- **Package manager:** pnpm
- **Deploy:** Vercel (activo: [vy-m-db-app-flame.vercel.app](https://vy-m-db-app-flame.vercel.app/))
- **Directorio:** `participantes-app/`
- **Documentacion UI Rework:** Consulta `UI_REWORK.md` para la arquitectura detallada del sistema de diseno SaaS, componentes base y tokens de color.

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
│   │   ├── generarS140.js           — generador S-140.docx con docxtemplater
│   │   └── fechas.js                — formateo centralizado de fechas legibles y rangos de semana
│   ├── pages/
│   │   ├── Login.jsx                — login email/password
│   │   ├── Home.jsx                 — dashboard principal con KPIs, alertas, widget semanal y onboarding
│   │   ├── VistaSemanal.jsx         — vista semanal histórica con selectores de año/mes y exportación S-140
│   │   ├── VistaEditable.jsx        — tabla cruzada persona × mes (12 meses matrix) con modales
│   │   ├── VistaSql.jsx             — vista relacional con filtros
│   │   ├── Personas.jsx             — CRUD personas con Sheet lateral
│   │   ├── Registros.jsx            — CRUD participaciones con Sheet lateral y bulk actions
│   │   ├── Programa.jsx             — módulo S-140 completo con tarjetas Linear y selector inteligente
│   │   ├── Usuarios.jsx             — gestión de acceso y lista blanca de usuarios autorizados
│   │   ├── Exportar.jsx             — CSV / SQL / JSON + importador CSV con drag & drop
│   │   ├── SetPassword.jsx          — establecimiento de nueva contraseña
│   │   ├── HistorialCambios.jsx     — log de auditoría en tiempo real con inspector JSON
│   │   └── Estadisticas.jsx         — resumen por tipo/mes/persona y gráficos Recharts
│   ├── components/
│   │   ├── ui/                      — componentes base del Design System
│   │   │   ├── Button.jsx           — botones primarios, secundarios, acento (Verde Bosque), etc.
│   │   │   ├── Badge.jsx            — insignias y chips de estado
│   │   │   ├── Input.jsx            — campos de texto con soporte de iconos
│   │   │   ├── Select.jsx           — selector desplegable nativo estilizado
│   │   │   ├── Sheet.jsx            — slide-over panel lateral para formularios
│   │   │   ├── Dialog.jsx           — modales centrados con backdrop blur
│   │   │   └── Tooltip.jsx          — tooltips flotantes
│   │   ├── Header.jsx               — barra superior con perfil único y búsqueda
│   │   ├── Sidebar.jsx              — barra lateral colapsable con peek mode en hover
│   │   ├── CommandPalette.jsx       — paleta de comandos rápida (Cmd/Ctrl+K)
│   │   ├── ProtectedRoute.jsx       — verifica sesión + tabla usuarios_autorizados
│   │   ├── Toast.jsx                — notificaciones visuales (success/error/warning/info)
│   │   ├── Skeleton.jsx             — placeholders animados para estados de carga
│   │   ├── Breadcrumb.jsx           — navegación contextual interactiva
│   │   └── ConfirmDialog.jsx        — diálogo de confirmación (reemplaza window.confirm)
│   ├── hooks/
│   │   ├── useToast.js              — hook para manejo de toasts con tipos
│   │   └── useConfirm.js            — hook para diálogos de confirmación async
│   ├── App.jsx                      — app shell fluido de ancho completo + router de vistas
│   ├── main.jsx                     — BrowserRouter + rutas
│   └── index.css                    — Tailwind + variables CSS dark/light mode
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

### Identidad y Estilo Visual (Linear-inspired UI / Ambient Glow & Micro-Elevation)

La aplicación implementa un lenguaje visual moderno alineado con **Linear-inspired UI / Modern Dark Minimalist** y **Ambient Glow UI / Radiant Surface Design**:
- **Fondos oscuros profundos y superficies mate:** `bg-[#09090B]` de base con `bg-surface` (`#121215`) y texturas de cristal con `backdrop-blur-md` al 95% de opacidad.
- **Micro-elevaciones y bordes finos:** Bordes translúcidos de 1px (`border-zinc-200/80` en claro, `border-zinc-800/80` en oscuro) y ambient shadows tintadas con el color semántico del evento.
- **Resplandor degradado perimetral (Faded Glow):** Gradientes translúcidos suaves (`from-[color]-500/15 via-[color]-500/5 to-surface/95`) en tarjetas clave, banners de onboarding y toasts.

### Normas de UI para implementar nuevas funciones

Para que cualquier nueva pantalla, modal, tarjeta o componente conserve esta identidad coherente y pulida, seguir estrictamente las siguientes directrices:

1. **Iluminación y Glow (Regla del 5% al 15%):**
   - El color de acento o estado nunca debe usarse sólido como fondo de una tarjeta. Siempre se aplica un gradiente lateral desvanecido: `bg-gradient-to-r from-[color]-500/15 via-[color]-500/5 to-surface/95`.
   - **Sombras tintadas (Ambient Shadows):** En elementos destacados (toasts, banners, widgets clave, modales activos), la sombra perimetral debe llevar el tinte del color del evento (ej. `shadow-emerald-500/10`, `shadow-red-500/10`, `shadow-blue-500/10`).
   - **Propósito funcional:** El glow solo se reserva para estados de atención (onboarding, éxito, error, alertas, confirmaciones al 100% o focos interactivos), manteniendo el resto de la interfaz en fondos sobrios (`bg-surface`, `bg-zinc-900/60`).

2. **Estructura de Superficies y Micro-Bordes:**
   - **Bordes translúcidos:** Separadores y tarjetas deben usar bordes de 1px con opacidades controladas (`border-zinc-200/80` en claro, `border-zinc-800/80` en oscuro, o `border-[color]-500/25` en estados semánticos).
   - **Superficies con Backdrop Blur:** Modales, sheets, headers fijos y toasts deben usar siempre `backdrop-blur-md` junto a fondos al 95% de opacidad para dar textura de cristal mate sin perder legibilidad.

3. **Icon Boxes Temáticas:**
   - Los íconos de estado no van flotando sueltos: se encierran en un contenedor cuadrado con esquinas redondeadas (`w-8 h-8 rounded-xl` o `w-7 h-7 rounded-lg`), fondo tonal suave (`bg-[color]/15`) y micro-borde del mismo color (`border border-[color]/25`).

4. **Tipografía y Jerarquía Visual (Escala tonal de 3 niveles):**
   - `text-text1`: Blanco (`#F4F4F5`) o casi negro (`#09090B`) para títulos y contenido principal.
   - `text-text2`: Gris intermedio (`zinc-400` / `zinc-600`) para subtítulos y descripciones.
   - `text-text3` / `font-mono`: Gris atenuado para metadatos, atajos de teclado, fechas secundarias o tags técnicos.

5. **Micro-animaciones y Barras de Progreso (GPU-friendly):**
   - Transiciones aceleradas por hardware usando `transform` y `opacity` (150ms–220ms).
   - **Barras de consumo temporal:** Líneas delgadas (`h-[2px]`) en el borde inferior con `transform-origin: left` y animación `@keyframes toast-progress` (`scaleX(1)` -> `scaleX(0)`) para indicar temporizadores o consumos de tiempo sin provocar repaints pesados en el navegador.

### Animaciones definidas en `index.css`

```css
/* Toast — animación de entrada y barra de progreso temporal */
@keyframes slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.animate-slide-up { animation: slide-up 200ms ease forwards; }

@keyframes toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
.animate-toast-progress { transform-origin: left; animation: toast-progress var(--toast-duration, 3000ms) linear forwards; }

/* ConfirmDialog / modales */
@keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes scale-in { from { opacity: 0; transform: scale(0.95) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.animate-fade-in  { animation: fade-in 150ms ease forwards; }
.animate-scale-in { animation: scale-in 150ms ease forwards; }
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
- [X] **Atajos de teclado globales** — Implementada la paleta de comandos flotante `Ctrl+K` / `Cmd+K` (`CommandPalette.jsx`) con búsqueda, navegación por teclado (`↑`/`↓`/`Enter`/`Escape`) y comandos agrupados, junto a secuencias directas de navegación estilo GitHub (`G` + tecla de destino) mediante el hook `useKeyboardShortcuts.js`.
- [X] **Vista Editable — Sticky headers** — Columna izquierda de personas y fila superior de meses fijadas con `sticky` (thead `sticky top-0`, primera columna `sticky left-0` con shadow de separación).
- [X] **Vista Editable — Múltiples asignaciones de Matriculados en la misma celda** — Celdas Mat ahora iteran todos los registros del mes con patrón día+badge apilado, homologando el comportamiento con la tabla de Anc/SM. `MatCellModal` actualizado para mostrar `recs[]` completos.
- [X] **Vista Editable — Rediseño del modal de Matriculados (solo lectura)** — `MatCellModal` convertido a vista puramente informativa con badge de tipo, fecha y observaciones, y botón "Ver en Programa →" de navegación directa vía prop `onNavigate`.
- [X] **Nueva Vista Semanal (widget en Home)** — Vista de solo lectura de la agenda de la semana actual. Vivirá como widget destacado en la Home Page en lugar de página separada, con opción de drill-down al programa completo en `Programa.jsx`.
- [X] **Programa S-140 — Botón flotante "Generar S-140"** — Colocado como un botón de acción flotante (FAB) fijo en la esquina inferior derecha (`fixed bottom-6 right-6 z-50 rounded-full`), accesible en todo momento sin depender de scroll.
- [X] **Programa S-140 — Modo lectura vs edición** — Añadido selector/toggle en la cabecera para alternar entre edición (con dropdowns y confirmación) y lectura limpia (programa finalizado en texto plano con badges sutiles, persistente en `localStorage`).
- [X] **Registros — Filtros persistentes** — Almacenar el último filtro de catálogo seleccionado en `localStorage` (`registros_filterMes`, `registros_filterLista`) y botón ✕ para limpiar filtros activos.
- [X] **Registros — Paginación y Selector de registros por página** — Eliminado el límite truncado de 100 registros en la consulta para cargar la totalidad de participaciones del año. Añadida barra inferior de paginación (estilo Supabase Table Editor) con botones de navegación (← / →), indicador de página actual y total, selector de tamaño de página (25, 50, 100, 250, 500) con persistencia en `localStorage` (`registros_pageSize`) y contador dinámico de registros visibles/filtrados.
- [X] **Registros — Acciones masivas (Bulk actions)** — Incorporado modo de selección múltiple en `Registros.jsx` con checkboxes por fila, selección masiva de todos los registros filtrados (`indeterminate`), y barra de acciones contextuales para eliminación en bloque y cambio de tipo masivo con validación de roles y confirmación única.
- [X] **Registros — Validación en tiempo real** — Estado derivado `validationErrors`/`hasErrors` en render; indicadores inline rojo bajo cada campo (persona, fecha, tipo); botón "Guardar" bloqueado con `disabled={saving || hasErrors}`.
- [X] **Exportar / Importar — Carga interactiva Drag & Drop** — Creado el hook `useDragDrop` para habilitar el arrastre y soltado de archivos `.csv` en las zonas de importación con validación de extensión y feedback visual (`border-dashed border-accent bg-accent-bg`).
- [X] **Exportar / Importar — Vista previa y validación previa** — Modal de previsualización que muestra las primeras 5 filas del archivo CSV antes de procesarlo en la base de datos, validando la presencia de columnas requeridas (`HeadersWarning`).
- [X] **Design System — Homogeneización de estados de UI** — Aplicar estilos uniformes de `disabled` (`opacity-50`, `cursor-not-allowed`), hover con token oficial (`accent-hover: #155236`), y foco (`focus:border-accent`) en inputs, selectores y botones de todas las vistas.
- [X] **Accesibilidad (a11y)** — Ajustado el token `text3` a `#807D75` para cumplir contraste WCAG AA en toda la app, añadidos atributos `aria-label` y `title` a botones de eliminación y campos de búsqueda, e incorporado `aria-hidden="true"` a todos los SVGs decorativos de empty states.

### 🔵 Prioridad Baja (Futuro y Optimizaciones)
- [X] **Gráficos en Estadísticas** — Integrados gráficos interactivos `BarChart` con `recharts`: barras horizontales por tipo (`TipoTooltip`) y barras verticales por mes (`MesTooltip`) con colores y tipografía del design system.
- [X] **Configuración de tema y persistencia** — Implementado modo oscuro integral (`darkMode: 'class'`) con CSS custom properties semánticas en `:root` y `html.dark`, hook `useTheme` con persistencia en `localStorage` y sincronización con `prefers-color-scheme`, toggle interactivo (`◑` / `☀`) en sidebar (expandido y colapsado) y reemplazo de colores hardcoded por tokens del design system.
- [X] **Onboarding integrado en Home** — Wizard de primer uso detectado desde `configuracion` (nombre por default → dispara onboarding). Pasos: (1) nombre de congregación + año, (2) importar participantes CSV, (3) subir primer EPUB mwb. Checklist visual de progreso que desaparece al completarse. Vive integrado en la Home Page.
- [ ] **Exportación a PDF** — Agregar un botón en la Vista Semanal del Home para exportar/imprimir el itinerario en PDF optimizado para impresión física.
- [X] **Migración SQL para `tipo_asignacion` VARCHAR(15)** — Ampliar la longitud del campo `tipo_asignacion` en `programa_partes` para asegurar espacio adicional holgado.
- [X] **SMT_AYU como tipo independiente** — Registrar de forma explícita el tipo de asignación para el ayudante principal, simplificando las consultas SQL en cascada.
- [ ] **Conversión a PWA (Progressive Web App)** — Configurar `vite-plugin-pwa` para permitir la instalación de la aplicación en el dispositivo móvil como si fuera nativa, permitiendo acceso offline a los datos locales.

---

## 🏠 Home Page (nueva sección — implementada)

*La Home es el dashboard de aterrizaje. Es la base sobre la que se integran el Onboarding, la Vista Semanal y las Alertas proactivas.*

### Componentes del Home (`src/pages/Home.jsx`)

- [X] **KPIs rápidos** — Tarjetas con: personas activas (+ inactivas), participaciones del mes actual, semanas del programa con progreso < 100%, próxima reunión.
- [X] **Widget Vista Semanal** — Agenda compacta de la semana más próxima con partes confirmadas/pendientes y acceso directo a `Programa.jsx`. Absorbe el pendiente "Nueva Vista Semanal".
- [X] **Alertas proactivas** — Panel tipo inbox que calcula al cargar: semanas sin confirmar, personas con > 2 meses sin participar, programa sin cargar para el mes próximo. Reutiliza lógica de `Estadísticas.jsx` y `Programa.jsx`.
- [X] **Accesos rápidos** — Botones/cards hacia las acciones más frecuentes: nuevo registro, abrir programa de la semana actual, exportar S-140, ir a personas.
- [X] **Onboarding integrado** — Detecta si `configuracion.nombre_congregacion` === `'Congregacion del Recreo'` (valor por default) para mostrar el wizard de primer uso. Ver sección 🔵 Prioridad Baja.

---

## 🤖 Automatización interna (nueva sección — pendientes)

### EPUB automático desde JW.org
- [ ] **Edge Function `fetch-epub`** — Consulta el endpoint interno de JW.org (`GETPUBMEDIALINKS?pub=mwb&fileformat=EPUB&langwritten=S&issue=YYYYMM`) para obtener el link de descarga del EPUB más reciente, lo descarga y lo sube a Supabase Storage (bucket `epubs`). Requiere habilitar Storage en el proyecto Supabase.
- [ ] **Verificación al cargar `Programa.jsx`** — Al montar la vista, comparar el `issue` disponible en JW.org con el más reciente guardado en Storage. Si hay versión nueva, mostrar un banner/toast con botón "Descargar nuevo EPUB mwb (Sep 2026)".
- [ ] **Selector de EPUB desde Storage** — En lugar de solo subir manualmente, mostrar un `<Select>` con los EPUBs disponibles en el bucket (máximo 4, los más recientes). Mantener el botón de subida manual como fallback.
- [ ] **Rotación automática del bucket** — Al guardar un nuevo EPUB, si ya hay 4 archivos, eliminar el más antiguo. Lógica en la misma Edge Function `fetch-epub`.
- [ ] **Tabla `epub_disponibles` en Supabase** — Registrar metadatos de cada EPUB guardado: `id`, `filename`, `issue` (YYYYMM), `url_storage`, `descargado_en`. Permite al selector mostrar etiquetas legibles ("Julio 2026") sin parsear nombres de archivo.

### Otras automatizaciones de calidad de vida
- [ ] **Auto-confirmación inteligente con revisión previa** — Botón "Revisar y aprobar semana" que muestra un resumen de todas las sugerencias del motor (`sugerido_por_app = true`) con semáforo de idoneidad (✓/↻/⚠) y permite aprobar todas o ajustar las que tienen warning antes del commit.
- [ ] **Detección de conflictos de rotación al asignar manualmente** — Warning inline al seleccionar una persona en `PersonaSelector` si viola reglas de rotación (participó hace < 2 semanas, ya tiene 3 asignaciones el mes, misma asignación el mes anterior). Complementa el sistema de scoring existente.
- [ ] **Toast de acción al completar semana al 100%** — Cuando `confirmadas === totalPartes` en una semana, mostrar toast persistente con acción directa: "Semana completa — Generar S-140 ahora →". Reutiliza `generarS140.js`.
- [ ] **Backup automático a Supabase Storage al exportar** — Al generar CSV/JSON desde `Exportar.jsx`, además de la descarga local, guardar una copia en un bucket `backups` con timestamp. El tab de importación mostraría los backups disponibles en nube para restaurar desde ahí.
- [ ] **Reporte mensual automático** — Al cambiar de mes o bajo demanda, generar un resumen PDF/CSV de participaciones del mes que acaba (quién participó, cuántas veces, qué tipos) y guardarlo en Storage. Útil para el anciano coordinador.
- [ ] **Timeline / historial por persona** — Desde `Personas.jsx`, al hacer click en una persona abrir `Sheet.jsx` lateral con su timeline personal: todas sus participaciones ordenadas cronológicamente con badges de tipo y mes. Datos ya disponibles en tabla `participaciones`.

---

## 🎨 Pendiente de prompt dedicado

- [ ] **Vista fiel al S-140 en `Programa.jsx`** — Rediseño visual de las tarjetas de semana para que la disposición en pantalla refleje fielmente la estructura del formulario oficial S-140 (secciones, columnas y jerarquía visual del documento). Requiere prompt dedicado por complejidad.

---

## Pulir y Expandir

*Regla de protocolo: En esta sección se concentran integraciones ya realizadas a las que se les pueden añadir más características para enriquecer la experiencia de usuario. Únicamente se incorporan elementos a esta sección cuando el usuario lo indique explícitamente con la instrucción **"Pasa a pulir"**, acompañada de las instrucciones o sugerencias para abordar en una ocasión posterior.*

- [ ] **Atajos y Paleta de Comandos (`CommandPalette` / `useKeyboardShortcuts`)**:
  - *Sugerencia / Directriz:* Agregar más atajos: toggle dark/light mode, `N` para nuevo registro, búsqueda de participantes por nombre con navegación directa a su historial en `VistaEditable`, exportación rápida del S-140 de la semana próxima.

- [ ] **Estadísticas — Gráficos adicionales**: 
  - *Sugerencia / Directriz:* Ampliar el dashboard con pastel Mat vs Anc/SM, línea de timeline de participaciones por mes del año y tabla de resumen mensual consolidada con peso acumulado por sección.

- [ ] **Perfil / Settings page (`PerfilDrawer.jsx`)**:
  - *Sugerencia / Directriz:* Expandir el drawer de perfil con una pestaña de preferencias de usuario (notificaciones, idioma de fechas, vista por defecto al entrar), visible desde el avatar del Header.

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
- **Brief 14 — Modo lectura vs edición en Programa S-140 (21/08/2026):**
  - Implementado toggle segmentado (`✏️ Edición` / `👁 Lectura`) en los controles superiores de `Programa.jsx` con persistencia en `localStorage` (`programa_modoLectura`).
  - En modo lectura:
    - Ocultado el botón de subida `↑ Subir EPUB mwb` del header.
    - Adaptadas las filas `FilaParte` a grilla limpia de 3 columnas (`grid-cols-[auto_1fr_1fr]`).
    - Nombres de asignados renderizados en texto plano (`text-sm font-medium text-text1`), ayudantes con `↳`, vacíos con `— Sin asignar` y badges sutiles de confirmación (`✓`/`↻`/`·`).
    - Ocultados los dropdowns interactivos `PersonaSelector`, botones de confirmación individuales y el botón footer "Confirmar todo →" en `TarjetaSemana`.
    - Mantenido el botón flotante (FAB) "Generar S-140", barra de progreso y tab Resumen disponibles en ambos modos.
- **Brief 15 — Bulk actions en Registros (21/08/2026):**
  - Añadido botón toggle `☐ Seleccionar` / `✕ Cancelar` en la cabecera de la lista de `Registros.jsx`.
  - Implementado checkbox maestro con soporte para estado indeterminado (`indeterminate`) que permite seleccionar o deseleccionar todos los registros filtrados (`filtered`).
  - Añadido checkbox interactivo por fila y alternancia de selección al hacer click en la fila completa (bloqueando la edición inline durante el modo selección).
  - Creada la barra contextual de acciones masivas (`bg-accent-bg border border-accent/30`):
    - **Eliminación masiva**: diálogo único `ConfirmDialog` y borrado en lote vía `.delete().in('id', ids)`.
    - **Cambio de tipo masivo**: diálogo único `ConfirmDialog`, filtrado de compatibilidad según el rol de cada persona vía `getTipos(persona)`, actualización en lote vía `.update().in('id', validosIds)` y notificación con detalle de registros modificados y omitidos.
  - Limpieza automática de la selección al cambiar filtros de búsqueda, mes o lista.
- **Brief 16 — Drag & Drop en Importar CSV (21/08/2026):**
  - Creado el hook reutilizable `useDragDrop` (`src/hooks/useDragDrop.js`) que maneja `dragEnter`, `dragLeave`, `dragOver`, `drop`, estado `isDragging` y validación de extensión (`.csv`).
  - Refactorizada la función `processFile` en `Exportar.jsx` para procesar archivos `File` provenientes tanto del `<input type="file">` nativo como del evento `drop`.
  - Enueltas las dos filas de importación (`participantes.csv` y `participaciones.csv`) en zonas reactivas de drop con feedback visual inmediato (`border-2 border-dashed border-accent bg-accent-bg` y etiqueta "Suelta aquí").
  - Mantenido el funcionamiento normal del botón tradicional "↑ Seleccionar archivo" y la validación de extensiones no permitidas.
- **Brief 17 — Atajos de teclado globales (21/08/2026):**
  - Creado el hook `useKeyboardShortcuts` (`src/hooks/useKeyboardShortcuts.js`) con detección segura de campos de escritura (`isTyping`), disparo de paleta (`Ctrl+K` / `Cmd+K`) y secuencias directas de navegación estilo GitHub (`G` + tecla).
  - Creado el componente flotante `CommandPalette` (`src/components/CommandPalette.jsx`) con auto-foco, filtrado reactivo de comandos (generados a partir del array `NAV` respetando permisos de rol y comandos de acción), navegación por flechas y selección sincronizada con mouse.
  - Integrado el botón de acceso rápido con badge `⌘K` en el topbar de `App.jsx` y ampliado el listener de `Escape` para cerrar la paleta prioritariamente.
- **Brief 18 — Accesibilidad (a11y) (21/08/2026):**
  - Ajustado el token de color `text3` de `#9B9890` a `#807D75` en `tailwind.config.js`, alcanzando un ratio de contraste ≥ 4.0:1 compatible con WCAG AA.
  - Añadido `aria-label` descriptivo y `title` a botones de eliminación de registros, semanas, celdas y participaciones en `Programa.jsx`, `Registros.jsx`, `VistaEditable.jsx` y `VistaSql.jsx`.
  - Añadido `aria-label` a inputs de búsqueda en `VistaSql.jsx`, `HistorialCambios.jsx`, `Personas.jsx`, `Registros.jsx` y `VistaEditable.jsx`.
  - Incorporado `aria-hidden="true"` en todos los SVGs decorativos de empty states en `Programa.jsx`, `Registros.jsx`, `HistorialCambios.jsx`, `Estadisticas.jsx` y `Personas.jsx`.
- **Brief 19 — Tema oscuro (dark mode) (21/08/2026):**
  - Habilitada la estrategia `darkMode: 'class'` en `tailwind.config.js` y convertidos todos los tokens de color a variables CSS `var(--color-*)`.
  - Definida la paleta completa en `src/index.css` con variables CSS para `:root` (claro) y `html.dark` (oscuro), `color-scheme` y scrollbars adaptables.
  - Creado el hook `useTheme` (`src/hooks/useTheme.js`) con soporte para sincronización con preferencias del sistema (`prefers-color-scheme`) y persistencia en `localStorage`.
  - Integrado botón toggle (`◑` / `☀`) en el footer del sidebar de `App.jsx` tanto en estado expandido como colapsado.
  - Reemplazados todos los colores hardcoded por tokens en `Registros.jsx`, `VistaSql.jsx`, `Estadisticas.jsx`, `Programa.jsx`, `VistaEditable.jsx`, `Personas.jsx` y `ConfirmDialog.jsx`.
  - Calibrada la paleta de modo oscuro con tonos más sobrios y orgánicos (`--color-accent: #247A53`, `--color-accent-hover: #1D6444`) eliminando brillos excesivos/neón en botones y componentes activos.
- **Brief 20 — Home Page (Home.jsx) (29/08/2026):**
  - Creada la página `src/pages/Home.jsx` como dashboard principal y ruta índice de la aplicación.
  - Integrados 5 bloques funcionales en estricto orden visual:
    1. **Onboarding condicional**: Wizard de 3 pasos (nombre congregación/año editable mediante modal en Supabase, importación de participantes y subida de primer EPUB) visible cuando la configuración está por defecto.
    2. **KPIs rápidos**: 4 tarjetas métricas con datos en tiempo real (personas activas vs total, participaciones del mes en curso, semanas del programa con progreso < 100% en el mes actual y fecha de la próxima reunión calculada con badge de proximidad).
    3. **Alertas proactivas**: Panel tipo inbox con motor de reglas reactivo para detectar semanas incompletas del mes, participantes con > 2 meses sin asignación y falta de EPUB para el mes próximo, con botones y enlaces directos a sus respectivas vistas.
    4. **Widget — Semana actual**: Agenda compacta de solo lectura de la semana en curso con lectura bíblica, canciones, barra de progreso calculada por partes únicas y lista de asignaciones con badges de estado y enlace al programa completo.
    5. **Accesos rápidos**: Grid 2×2 para nuevo registro (con apertura automática del Sheet en `Registros.jsx`), generación directa del documento Word S-140 con `generarS140.js` y feedback por toast, y navegación directa a Personas y Estadísticas.
  - Registrada la ruta `home` en `App.jsx` como vista por defecto inicial, en `Sidebar.jsx` (atajo `0`), `Header.jsx` (breadcrumb interactivo), `CommandPalette.jsx` y `useKeyboardShortcuts.js` (atajo `G` + `I`).
- **Brief 13 — Vista Semanal Histórica (VistaSemanal.jsx) (30/08/2026):**
  - Creada la página `src/pages/VistaSemanal.jsx` para consulta histórica y navegación semana por semana de las asignaciones de reuniones.
  - **Barra de navegación temporal**:
    - Selector de año (`<Select>`) con años disponibles en BD.
    - Selector de mes (`<Select>`) filtrado por el año seleccionado que tengan semanas registradas.
    - Navegación secuencial de semanas (`← Anterior` / `Siguiente →`) con indicador de rango de fechas y badge de estado (`Completa` / `Parcial` / `Sin datos`).
  - **Cuerpo de asignaciones**:
    - Partes agrupadas por sección oficial (`Apertura`, `Tesoros de la Biblia`, `Seamos Mejores Maestros`, `Nuestra Vida Cristiana`, `Cierre`).
    - Badges de tipo respetando los colores del design system, participantes asignados, ayudantes indentados (`↳`) e indicadores de confirmación.
    - Estado vacío amigable cuando la semana no cuenta con registros cargados.
  - **Pie de vista**:
    - Contador de asignaciones y partes confirmadas.
    - Botón "Exportar S-140 de esta semana" que genera el `.docx` oficial de la semana activa vía `generarYDescargarS140.js`.
  - **Integración de navegación**:
    - Registrada en `App.jsx` (`case 'semanal'`), `Sidebar.jsx` (atajo `W`), `Header.jsx`, `CommandPalette.jsx` y `useKeyboardShortcuts.js` (`G` + `W`).
    - Enlace *"Ver histórico completo →"* en el widget de la semana actual en `Home.jsx` conectado a la vista con herencia de la semana seleccionada.
- **Side Question — Fechas Legibles Centralizadas (`fechas.js`) (30/08/2026):**
  - Creado el módulo `src/lib/fechas.js` con parseo manual sin desfase de zona horaria UTC (`formatFechaLegible`, `formatRangoSemanaLegible`, `formatRangoSemanaPrograma`, `formatFechaSinAnio`, `formatFechaCorta`, `MESES`, `MESES_ABBR`).
  - **Formato natural para Programa S-140 sin año (`formatRangoSemanaPrograma`)**:
    - Semanas del mismo mes: `"7 - 13 de Septiembre"`
    - Semanas entre dos meses: `"28 de Septiembre - 4 de Octubre"`
    - Integrado en cabecera de `TarjetaSemana`, vista previa en tabla, widget de `Home.jsx` y navegación de `VistaSemanal.jsx`.
  - Estandarizado el formateo de fechas de formato técnico (`2026-10-26 al 2026-11-01`) a formato abreviado natural (**"26 oct 2026 al 1 nov 2026"**, **"26 oct 2026"**) en el resto de vistas:
    1. **`Programa.jsx`**: Formato natural sin año en cabeceras de tarjeta y vista previa.
    2. **`Home.jsx`**: Badge de fechas en widget de semana actual.
    3. **`VistaSemanal.jsx`**: Control central de navegación y encabezado de la agenda semanal.
    4. **`Registros.jsx`**: Columna de fecha con formato legible y preview en tiempo real en formulario de creación/edición.
    5. **`VistaEditable.jsx`**: Modales de detalle de celda (`MatCellModal` y `AncCellModal`).
    6. **`PerfilDrawer.jsx`**: Rango de fechas de semanas programadas.
    7. **`HistorialCambios.jsx`**: Formato de fecha en detalles de auditoría.
- **Brief 22 — Timeline por persona en Personas.jsx (30/08/2026):**
  - Añadida estructura de dos pestañas (`Perfil` e `Historial`) dentro del `Sheet` lateral de `Personas.jsx`.
  - **Pestaña Perfil**: Conserva exactamente la funcionalidad de edición y registro de atributos existente.
  - **Pestaña Historial (Timeline)**:
    - **Carga Lazy**: Los datos de próximas asignaciones y participaciones se consultan bajo demanda en paralelo (`Promise.all`) solo al abrir la pestaña Historial, con soporte de caché por clave y animación de skeleton durante la carga.
    - **Bloque 1 — Próximas Asignaciones**: Se muestra únicamente si existen asignaciones con fecha mayor o igual a hoy en `programa_asignaciones` / `programa_partes`, ordenadas cronológicamente de más próxima a lejana, con fecha completa (`formatFechaConDia`), badge de estado de confirmación, badge de tipo con colores oficiales, indicador de ayudante e indicación de escuela.
    - **Bloque 2 — Historial de Participaciones**: Listado completo de participaciones históricas (`participaciones`) ordenadas de más reciente a más antigua con contador en la cabecera, fecha abreviada (`formatFechaLegible`), badge de tipo respetando el design system, observaciones y estado vacío ilustrado cuando no hay registros.
  - Actualizado `src/lib/fechas.js` y suite `src/lib/fechas.test.js` con soporte para `formatFechaConDia`.
- **Brief 23 — Toast al completar el Programa al 100% en Programa.jsx (31/08/2026):**
  - Implementada detección reactiva de transición a **programa completo** (100% de las semanas cargadas con todas sus partes contables confirmadas) en sesión activa dentro de `Programa.jsx`.
  - **Toast rico persistente de Programa Completado**:
    - Aparece exclusivamente cuando el total de semanas del programa ($N$ semanas) pasa de incompleto a 100% confirmado tras confirmar asignaciones en la sesión.
    - No se dispara en la carga inicial si el programa ya venía completado.
    - Se cierra automáticamente si el usuario desconfirma alguna parte de cualquier semana y el programa deja de estar al 100%.
    - **Contenido**: Ícono de celebración (`Sparkles`), badge `100%`, título *"Programa completado"*, subtítulo con el conteo de semanas (*"N semanas programadas al 100%"*), badge de asignaciones confirmadas (*"[✓] N asignaciones confirmadas en total"*), botón primario de acción directa *"Generar S-140"* (invoca la exportación completa del S-140 con todas las semanas) y botón secundario *"Cerrar"*.
    - Las confirmaciones semanales intermedias mantienen sus notificaciones toast estándar independientes (`"N asignaciones confirmadas en la semana"`) sin solapamientos ni llamadas prematuras a S-140.
- **Rework Visual de Toasts — Glow Desvanecido y Barra de Tiempo (31/08/2026):**
  - Rediseñado completamente el componente `<Toast />` (`src/components/Toast.jsx`) y el hook `useToast` (`src/hooks/useToast.js`):
    - **Glow Desvanecido por Tipo de Evento**: Gradientes laterales translúcidos (`from-[color]/15 via-[color]/5 to-surface/95`), bordes sutiles y ambient shadow glow acordes a cada estado:
      - `success` (Verde esmeralda)
      - `error` (Rojo)
      - `warning` (Ámbar)
      - `info` (Azul)
    - **Barra de Tiempo Inferior (Progress Bar)**: Línea delgada (`h-[2px]`) en el borde inferior que se consume suavemente a lo largo de la duración activa del toast mediante animación GPU (`@keyframes toast-progress` con `scaleX(1)` a `scaleX(0)`).
    - **Control Manual de Cierre**: Botón (✕) para descarte inmediato.
    - Gestión precisa de temporizadores en `useToast.js` con soporte de `duration` personalizada y método `dismiss()`.
- **Brief 24 — PWA (vite-plugin-pwa) (31/08/2026):**
  - Configurada la aplicación como Progressive Web App (PWA) instalable en escritorio, Android e iOS:
    - **Plugin y Caché (`vite.config.js`)**: Integrado `vite-plugin-pwa` con `generateSW` y `registerType: 'autoUpdate'`. Precacheo de todo el App Shell (`.html`, `.js`, `.css`, `.png`, `.svg`, `.docx`, fuentes).
    - **Estrategia Supabase (Sin caché obsoleto)**: Peticiones a `*.supabase.co` configuradas con `NetworkFirst` (con timeout estricto de 5s) garantizando que los datos en tiempo real de reuniones, asignaciones y personas provengan siempre de la red primero.
    - **Manifest (`manifest.webmanifest`)**: Configurado con `display: standalone`, `theme_color: '#09090B'`, `background_color: '#09090B'` (coherente con el dark mode para splash screen nativa) e iconos en todos los formatos requeridos (`192x192`, `512x512`, `maskable`).
    - **Iconos Generados (`public/`)**: `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, `pwa-maskable-*.png` y `favicon.svg` basados en la identidad visual del proyecto (`Sparkles` + fondo `#09090B` y acento esmeralda).
    - **Meta tags en `index.html`**: `<meta name="theme-color" content="#09090B" />`, `<meta name="mobile-web-app-capable" content="yes" />`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />` y `<link rel="apple-touch-icon" />`.
- **Brief 25 — Gráficos adicionales en Estadisticas.jsx (01/09/2026):**
  - Incorporados dos nuevos gráficos complementarios basados en Recharts al dashboard de `src/pages/Estadisticas.jsx` derivados de las consultas existentes en memoria (cero queries adicionales a Supabase):
    1. **Gráfico de Pastel (PieChart) — Distribución Mat vs Anc/SM**:
       - Muestra la proporción exacta entre participaciones de Matriculados (`#10B981` / Verde Esmeralda) y Ancianos/SM (`#3B82F6` / Azul).
       - Donut chart con `innerRadius` y `outerRadius` limpios, `PieTooltip` personalizado con conteo y porcentaje exacto, y leyenda inferior interactiva.
    2. **Gráfico de Líneas (LineChart) — Evolución mensual por tipo**:
       - Gráfica timeline a lo largo de los 12 meses del año (`Ene`–`Dic`) con 4 series diferenciadas con los colores del design system: **Matriculados** (`#10B981`), **Ancianos** (`#3B82F6`), **Siervos Ministeriales** (`#8B5CF6`) y **Necesidades de la congregación** (`#EF4444`).
       - `LineTimelineTooltip` compartido que desglosa en tiempo real todas las series para el mes seleccionado al hacer hover.
  - Maquetados en una fila responsiva de 2 columnas (`grid grid-cols-1 lg:grid-cols-2 gap-5`) integrada con dark mode y soporte para apilado vertical en dispositivos móviles.
- **Brief 26 — PerfilDrawer: pestaña de preferencias (01/09/2026):**
  - Añadida la pestaña **Preferencias** dentro de `src/components/PerfilDrawer.jsx` (accesible desde el avatar de usuario en `Header.jsx`, `Sidebar.jsx` y `CommandPalette.jsx`):
    - **Vista inicial al cargar (`pref_vista_default`)**: Selector con opciones `Inicio (Home)`, `Programa S-140`, `Personas / Participantes`, `Histórico de Registros`, `Estadísticas` y `Vista Semanal`. Persiste en `localStorage` e inicializa reactivamente `view` en `App.jsx`.
    - **Formato de fecha preferido (`pref_formato_fecha`)**: Selector con opciones `dd/mm/yyyy` (estándar México) y `dd mmm yyyy` (legible natural). Centralizado en `src/lib/fechas.js` y `src/lib/formatFecha.js` con despacho de evento `preferences-updated` para actualización instantánea en toda la aplicación.
    - **Tema visual (Dark/Light Mode)**: Control interactivo integrado con `useTheme` para alternar la apariencia sin duplicar estado.
- **Brief 27 — CommandPalette: búsqueda de participantes y exportación rápida S-140 (05/09/2026):**
  - Extendida la paleta de comandos (`src/components/CommandPalette.jsx`) con búsqueda de personas en tiempo real y comandos de acción rápida:
    1. **Búsqueda de Participantes por Nombre y Clave**:
       - Al escribir en el buscador, filtra entre las personas activas de la BD y las presenta bajo el grupo **"Personas"**.
       - Cada resultado muestra avatar de iniciales con color según sexo (`M` azul / `F` púrpura), nombre completo, badge de lista (`Mat` / `Anc/SM`) y clave.
       - Al presionar Enter o hacer clic, navega directamente a `Personas.jsx` y abre su Sheet lateral en la pestaña **Historial**.
    2. **Exportación Rápida S-140 de la Semana Actual**:
       - Comando fijo en el grupo "Acciones" con atajo **`Ctrl+Shift+E` / `Cmd+Shift+E`** e ícono `FileDown`.
       - Detecta automáticamente la semana actual o más próxima (`getSemanaActualInfo` en `generarS140.js`) y descarga el `.docx`. Si no hay programa cargado para la semana, aparece deshabilitado (`opacity-50`) con la leyenda *"Sin programa para esta semana"*.
    3. **Alternancia de Tema Visual**:
       - Comando fijo con atajo **`Ctrl+Shift+T` / `Cmd+Shift+T`** que refleja el estado dinámico (*"Cambiar tema (dark → light)"*) e íconos `Sun`/`Moon`.
    4. **Atajos Globales (`useKeyboardShortcuts.js`)**:
       - Registrados los atajos globales `Ctrl+Shift+E` y `Ctrl+Shift+T` accesibles desde cualquier vista sin colisiones.










