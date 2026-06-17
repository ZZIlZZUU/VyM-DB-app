# VyM-DB — Participantes App

Aplicación web para gestión de participaciones en reuniones de congregación (Testigos de Jehová). Registra quién participa cada mes, en qué rol, y genera el programa S-140 en `.docx`.

---

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Fuentes:** IBM Plex Sans / IBM Plex Mono
- **Package manager:** pnpm
- **Deploy:** Vercel (pendiente)
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
│   │   ├── Exportar.jsx             — CSV / SQL / JSON + importar CSV
│   │   └── Estadisticas.jsx         — resumen por tipo/mes/persona
│   ├── components/
│   │   └── ProtectedRoute.jsx       — verifica sesión + tabla usuarios_autorizados
│   ├── App.jsx                      — sidebar nav + router de vistas
│   ├── main.jsx                     — BrowserRouter + rutas
│   └── index.css                    — Tailwind + estilos base
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

| Tipo | Descripción | Lista | Quién |
|---|---|---|---|
| T | Titular (estudiante SMT) | Mat | Damas Mat |
| A | Asistente (ayudante SMT) | Mat | Damas Mat |
| LB | Lectura bíblica (TB) | Mat | Varones Mat |
| SMT_DSC | Discurso SMT | Mat | Varones Mat |
| LEBC | Lector EBC | Mat | Varones Mat bautizados |
| ORACION_C | Oración de conclusión | Mat/Anc | Varones Mat bautizados u Anc/SM distinto al Presidente — peso=0, no entra al motor automático |
| P | Presidente | Anc/SM | Ancianos y SM |
| TB | Tesoros de la Biblia | Anc/SM | Ancianos y SM |
| PE | Perlas escondidas | Anc/SM | Ancianos y SM |
| EBC | Conductor EBC | Anc/SM | Ancianos pref., SM |
| VC | Vida Cristiana | Anc/SM | Ancianos y SM |
| NC | Necesidades de la congregación | Anc/SM | Solo Ancianos |

> **Nota:** El tipo genérico `'X'` (Participación general para varones Mat) está **deprecado**. Se reemplaza por `LB`, `SMT_DSC` según corresponda. Los registros históricos con `tipo='X'` se conservan pero no se crean nuevos.

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
  tipo_asignacion VARCHAR(10)  -- ver tabla abajo
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

### Tipos de asignación (`tipo_asignacion` en programa_partes)

| Tipo | Sección | Quién puede hacerlo |
|---|---|---|
| P | APERTURA | Anc/SM — cubre automáticamente ORACION (apertura), INTRO y CONCLU |
| ORACION | APERTURA | Read-only — se propaga automáticamente del Presidente |
| INTRO | APERTURA | Read-only — se propaga automáticamente del Presidente |
| CONCLU | CIERRE | Read-only — se propaga automáticamente del Presidente |
| ORACION_C | CIERRE | Anc/SM distinto al Presidente u ocasionalmente varón Mat bautizado |
| TB | TB | Anc/SM |
| PE | TB | Anc/SM |
| LB | TB | Varones Mat (bautizados o no) |
| SMT_EST | SMT | Damas Mat (requiere_ayudante=true) |
| SMT_DSC | SMT | Varones Mat (bautizados o no) |
| SMT_VACIO | SMT | Slot vacío — semanas con solo 3 partes SMT muestran "Sin cuarta asignación" |
| VC | VC | Anc/SM |
| NC | VC | Solo Ancianos |
| EBC_CON | VC | Ancianos preferente, SM si no hay Anciano disponible |
| LEBC | VC | Varones Mat bautizados únicamente |

> **Regla importante — Presidente:** Al asignar Presidente (`P`), se propaga automáticamente la misma persona a `ORACION`, `INTRO` y `CONCLU`. Estos tres campos son **read-only** en la UI — no se pueden cambiar independientemente.

> **Regla importante — SMT:** Las semanas con solo 3 partes SMT muestran el 4to slot como `SMT_VACIO` (texto "Sin cuarta asignación", no asignable). Clasificación por lista blanca de títulos canónicos:
> - `SMT_EST` (con ayudante, damas): "Empiece conversaciones", "Haga revisitas", "Haga discípulos", "Explique sus creencias"
> - `SMT_DSC` (sin ayudante, varones): todo lo demás, incluyendo "Seamos adaptables...", discursos especiales, etc.

---

## Reglas de negocio — Rotación de participantes

### Matriculados
- No participar **2 meses seguidos**
- Damas: alternar Titular (T) → Asistente (A) → T → A entre meses

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
     gold  → SMT (provisional SMT_EST, se corrige en push)
   Fallback por texto si no hay color.
   Lista blanca SMT_EST: "empiece conversaciones", "haga revisitas",
     "haga discípulos", "explique sus creencias" → todo lo demás = SMT_DSC
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
   ORACION, INTRO y CONCLU son read-only — reflejan al Presidente automáticamente
      ↓
6. Al confirmar → crea registro automático en tabla participaciones
      ↓
7. Botón "Generar S-140" → generarS140.js llena la plantilla y descarga el .docx
```

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

**Estructura de datos por semana:**
```js
{
  fecha, presidente, can_ap, oracion_ap,  // oracion_ap = mismo que presidente
  tb_titulo, tb_cond, pe_cond, lb_est,
  smt: [{ titulo, est, ayu }],            // hasta 4 elementos (SMT_VACIO → título vacío)
  can_vc,
  vc:  [{ titulo, cond }],               // hasta 2 elementos
  ebc_cond, ebc_lect,                    // ebc_lect usa tipo LEBC
  can_ci, oracion_ci,
}
```

**Variables de la plantilla** (formato `{$s1_variable$}`):
- La plantilla tiene **5 slots** (s1..s5) — slots sin semana quedan en blanco
- Delimitadores: `{$` y `$}` (NO `{{` y `}}` — Word fragmenta el XML y docxtemplater falla con "duplicate open tag")
- Variables: `{$congregacion$}`, `{$s1_fecha$}`, `{$s1_presidente$}`, `{$s1_can_ap$}`, `{$s1_oracion_ap$}`, `{$s1_tb_titulo$}`, `{$s1_tb_cond$}`, `{$s1_pe_cond$}`, `{$s1_lb_est$}`, `{$s1_smt1_titulo$}`, `{$s1_smt1_est$}`, `{$s1_smt1_ayu$}` (smt1..4), `{$s1_can_vc$}`, `{$s1_vc1_titulo$}`, `{$s1_vc1_cond$}` (vc1..2), `{$s1_ebc_cond$}`, `{$s1_ebc_lect$}`, `{$s1_can_ci$}`, `{$s1_oracion_ci$}`

> **Pendiente:** Ampliar plantilla de 5 a 9 slots (s1..s9) para cubrir un mes completo sin sobreescribir secciones.

**Mapa tipo_asignacion → tipo en tabla participaciones (TIPO_PARTICIPACION en Programa.jsx):**
```js
P:'P', ORACION:'P', ORACION_C:'OC', INTRO:'P', CONCLU:'P',
TB:'TB', PE:'PE', LB:'LB', SMT_EST:'T', SMT_DSC:'DSC', SMT_AYU:'A',
VC:'VC', NC:'NC', EBC_CON:'EBC', LEBC:'LEC',
```

**Uso en Programa.jsx:**
```js
import { generarYDescargarS140, buildDatosDesdeSupabase } from '../lib/generarS140'

async function handleGenerarDocx() {
  const semanasConDatos = buildDatosDesdeSupabase(semanas, partes, asignaciones, personas)
  await generarYDescargarS140({
    congregacion: 'Congregacion del Recreo',
    semanas: semanasConDatos,
  })
}
```

---

## Design system (Tailwind)

Variables de color custom definidas en `tailwind.config.js`:

```
bg, surface, border, border2
text1, text2, text3
accent (#1C6B4A verde), accent-bg
blue, blue-bg
amber, amber-bg
purple, purple-bg
teal, teal-bg
rose, rose-bg
danger (#A32020), danger-bg
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

## Pendientes

- [ ] **Ampliar plantilla S-140 de 5 a 9 slots** — para cubrir un mes completo (hasta 9 semanas) y evitar sobreescritura de secciones. Requiere: (1) editar `S-140_plantilla.docx` duplicando filas con prefijos s6..s9, (2) actualizar `buildDatosPlantilla` en `generarS140.js` para iterar hasta i=9
- [ ] **Despliegue en Vercel** — conectar repo GitHub, agregar variables de entorno
- [ ] **Nombre de congregación configurable** — tabla `configuracion` en Supabase (actualmente hardcodeado como `'Congregacion del Recreo'` en `Programa.jsx`)
- [ ] **Gestión de usuarios** — pantalla para invitar desde la app sin entrar a Supabase
- [ ] **Pulido de UI** — detalles visuales menores


---

## Ideas guardadas para implementación futura

- `LB` — Lectura bíblica (sección Tesoros) — ya implementado en tipos de participación, pendiente revisar motor de sugerencias
- `DISC` / `SMT_DSC` — Discurso SMT — ya implementado
- `LEBC` — Lector EBC — ya implementado (reemplazó a `EBC_LEC`)
- Todos los anteriores con mismo patrón: visibles en Registros, VistaEditable, exportables en CSV, con peso en motor automático

---

## Bugs conocidos / ya corregidos

- `App.jsx` sidebar: `overflow-y-autoflex-shrink-0` → `overflow-y-auto flex-shrink-0`
- `FilaParte`: grid duplicado para APERTURA/CIERRE — corregido a grid único de 4 columnas
- Contador de progreso en `TarjetaSemana`: ahora excluye `SMT_VACIO` del total
- `handleConfirmarTodo`: filtra `rol === 'principal'` para no procesar ayudantes por separado
- Fechas en modal Matriculados: usar `useRef` para el campo nombre para evitar pérdida de tildes
- `generarS140.js`: migrado de `docx` a `docxtemplater + pizzip`
- `docxtemplater` "duplicate open tag": resuelto con delimitadores `{$` y `$}` en lugar de `{{` y `}}`
- **epubParser — "Seamos adaptables" en SMT:** Resuelto con prioridad de color CSS sobre texto en `inferirPartePorTexto` (maroon siempre gana sobre gold). Partes con clase `maroon` van a VC aunque el texto contenga palabras clave de SMT.
- **epubParser — SMT cap y lista blanca:** Máximo 4 partes SMT; clasificación por lista blanca de títulos canónicos en lugar de inferencia por texto. Slots vacíos se rellenan con `SMT_VACIO`.
- **Programa — Presidente propaga ORACION/INTRO/CONCLU:** Al asignar Presidente, `handleAsignar` propaga la misma clave a las partes `ORACION`, `INTRO` y `CONCLU` de la misma semana. `FilaParte` las renderiza como read-only.
- **`EBC_LEC` → `LEBC`:** Renombrado en epubParser, asignacionesSugeridas, generarS140, Programa, Registros, VistaEditable, VistaSql, Estadisticas, Exportar. Migración Supabase: `UPDATE programa_partes SET tipo_asignacion = 'LEBC' WHERE tipo_asignacion = 'EBC_LEC'`