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

> **`INTRO` fue eliminado.** El tipo existía para "Palabras de introducción" pero se removió — esa función cae dentro del rol del Presidente. Si el EPUB genera una parte con "introducción" en apertura, el parser la clasifica directamente como `P`.

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
  ebc_cond, ebc_lect,
  can_ci, oracion_ci,
}
```

**Variables de la plantilla** (formato `{$s1_variable$}`):
- La plantilla tiene **9 slots** (s1..s9) — slots sin semana quedan en blanco
- Delimitadores: `{$` y `$}` (NO `{{` y `}}` — Word fragmenta el XML y docxtemplater falla con "duplicate open tag")
- Variables: `{$congregacion$}`, `{$s1_fecha$}`, `{$s1_presidente$}`, `{$s1_can_ap$}`, `{$s1_oracion_ap$}`, `{$s1_tb_titulo$}`, `{$s1_tb_cond$}`, `{$s1_pe_cond$}`, `{$s1_lb_est$}`, `{$s1_smt1_titulo$}`, `{$s1_smt1_est$}`, `{$s1_smt1_ayu$}` (smt1..4), `{$s1_can_vc$}`, `{$s1_vc1_titulo$}`, `{$s1_vc1_cond$}` (vc1..2), `{$s1_ebc_cond$}`, `{$s1_ebc_lect$}`, `{$s1_can_ci$}`, `{$s1_oracion_ci$}`

**Mapa tipo_asignacion → tipo en tabla participaciones (`TIPO_PARTICIPACION` en Programa.jsx):**
```js
P:'P', ORACION:'P', ORACION_C:'OC', CONCLU:'P',
TB:'TB', PE:'PE', LB:'LB',
SMT_EST:'T', SMT_EXP:'T', SMT_DSC:'DSC', SMT_AYU:'A',
VC:'VC', NC:'NC', EBC_CON:'EBC', LEBC:'LEBC',
// ORACION y CONCLU tienen entrada pero handleConfirmar retorna temprano — nunca se insertan
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

- [ ] **Despliegue en Vercel** — conectar repo GitHub, agregar variables de entorno (`.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`)
- [ ] **Nombre de congregación configurable** — actualmente hardcodeado como `'Congregacion del Recreo'` en `Programa.jsx` (línea ~566) y pasado como parámetro a `generarYDescargarS140`. Solución: crear tabla `configuracion` en Supabase con columna `clave/valor`, leerla al montar `Programa.jsx` y sustituir el literal.
- [ ] **Gestión de usuarios** — pantalla para invitar desde la app sin entrar a Supabase. Actualmente se requiere acceso manual a la tabla `usuarios_autorizados`.
- [ ] **Pulido de UI** — detalles visuales menores pendientes de definir.

---

## Sugerencias / mejoras propuestas

- [ ] **Eliminar dependencia de `S-140_plantilla.docx` en local** — actualmente el archivo vive en `public/` y se sirve con `fetch('/S-140_plantilla.docx')` desde `generarS140.js`. Si el archivo se pierde o se sobreescribe accidentalmente en el repo, la generación del S-140 falla silenciosamente. Opciones: (a) subirlo a Supabase Storage y hacer fetch desde la URL pública, (b) convertirlo a base64 embebido en el código como fallback.
- [ ] **Migración SQL para `tipo_asignacion` VARCHAR(10) → VARCHAR(15)** — el tipo `SMT_EXP` tiene 7 chars y cabe en VARCHAR(10), pero `SMT_EXP_M`/`SMT_EXP_F` son tipos internos de UI (no se guardan en BD) por lo que no hay problema inmediato. Aun así conviene revisar el DDL de `programa_partes.tipo_asignacion` para asegurar espacio suficiente.
- [ ] **Confirmación por semana con "re-confirmar"** — al cambiar participantes ya confirmados, los cambios se acumulan en slots de semanas siguientes. Propuesta: botón "Actualizar confirmación" por semana que borre los registros actuales de esa semana en `participaciones` y los regenere desde las asignaciones vigentes.
- [ ] **Tests del motor de sugerencias** — `asignacionesSugeridas.js` no tiene pruebas automatizadas. Con la acumulación de tipos (`SMT_EXP`, `SMT_EXP_M`, `SMT_EXP_F`, etc.) es fácil romper un case sin notarlo. Añadir tests unitarios con Vitest.
- [ ] **SMT_AYU como tipo independiente** — actualmente el ayudante SMT no tiene `tipo_asignacion` propio en `programa_partes`; se infiere del `rol === 'ayudante'`. Considerar materializarlo explícitamente para simplificar queries y el generador S-140.

---

## Bugs corregidos (histórico)

- `App.jsx` sidebar: `overflow-y-autoflex-shrink-0` → `overflow-y-auto flex-shrink-0`
- `FilaParte`: grid duplicado para APERTURA/CIERRE — corregido a grid único de 4 columnas
- Contador de progreso en `TarjetaSemana`: excluye `SMT_VACIO`, `ORACION` y `CONCLU` del total
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