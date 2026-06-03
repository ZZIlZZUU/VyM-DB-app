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
├── src/
│   ├── lib/
│   │   ├── supabase.js              — cliente Supabase
│   │   ├── epubParser.js            — parser EPUB mwb → semanas/partes
│   │   ├── asignacionesSugeridas.js — motor de sugerencias por rotación
│   │   └── generarS140.js           — generador S-140.docx para navegador
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
pnpm add jszip          # parser EPUB (importación dinámica en epubParser.js)
pnpm add docx           # generación S-140.docx en el navegador
```

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
tipo          VARCHAR(5)    -- ver tabla de tipos abajo
peso          SMALLINT      -- T=2, todos los demás=1
observaciones TEXT
```

### Tipos de participación (`tipo`)

| Tipo | Descripción | Lista | Quién |
|---|---|---|---|
| T | Titular (estudiante SMT) | Mat | Damas Mat |
| A | Asistente (ayudante SMT) | Mat | Damas Mat |
| X | Participación general | Mat/Anc | Varones Mat, SM |
| P | Presidente | Anc/SM | Ancianos y SM |
| TB | Tesoros de la Biblia | Anc/SM | Ancianos y SM |
| PE | Perlas escondidas | Anc/SM | Ancianos y SM |
| EBC | Estudio Bíblico Congregación | Anc/SM | Ancianos pref., SM |
| VC | Vida Cristiana | Anc/SM | Ancianos y SM |
| NC | Necesidades de la congregación | Anc/SM | Solo Ancianos |

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
| P | APERTURA | Anc/SM — también cubre oración apertura, introducción y conclusión |
| ORACION_C | CIERRE | Anc/SM distinto al Presidente — también ocasionalmente varón Mat bautizado |
| TB | TB | Anc/SM |
| PE | TB | Anc/SM |
| LB | TB | Varones Mat (bautizados o no) |
| SMT_EST | SMT | Damas Mat (requiere_ayudante=true) |
| SMT_DSC | SMT | Varones Mat (bautizados o no) |
| VC | VC | Anc/SM |
| NC | VC | Solo Ancianos |
| EBC_CON | VC | Ancianos preferente, SM si no hay Anciano disponible |
| EBC_LEC | VC | Varones Mat bautizados |

> **Regla importante:** El Presidente (`P`) es UNA sola persona que cubre: oración de apertura + palabras de introducción + palabras de conclusión. La oración de cierre es OTRA persona distinta (`ORACION_C`).

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
   Clasifica partes por clases CSS: teal=TB, gold=SMT, maroon=VC
   Extrae: fechas, capítulo bíblico, 3 canciones, partes con títulos y duraciones
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
      ↓
6. Al confirmar → crea registro automático en tabla participaciones
      ↓
7. Botón "Generar S-140" → generarS140.js produce el .docx y lo descarga
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

### generarS140.js
- Usa `Packer.toBlob()` para el navegador — **NUNCA** `Packer.toBuffer()` (es solo Node.js)
- Layout: landscape carta (15840 × 12240 DXA), márgenes 720 DXA
- 4 columnas: hora (650) | descripción (7500) | rol (1800) | nombre (4450)
- 2 semanas por página

---

## Pendientes

- [ ] **Despliegue en Vercel** — conectar repo GitHub, agregar variables de entorno
- [ ] **Nombre de congregación configurable** — tabla `configuracion` en Supabase
- [ ] **Gestión de usuarios** — pantalla para invitar desde la app sin entrar a Supabase
- [ ] **Botón "Generar S-140"** en Programa.jsx — ya existe `generarS140.js`, falta integrarlo:
  ```js
  import { generarYDescargarS140, buildAsignaciones } from '../lib/generarS140'
  ```
- [ ] **Pulido de UI** — detalles visuales menores

---

## Bugs conocidos / ya corregidos

- `App.jsx` línea del sidebar: `overflow-y-autoflex-shrink-0` → `overflow-y-auto flex-shrink-0`
- `FilaParte` en Programa.jsx: grid duplicado para APERTURA/CIERRE — corregido a grid único de 4 columnas
- Contador de progreso en `TarjetaSemana` contaba asignaciones totales, ahora cuenta partes únicas con principal confirmado
- `handleConfirmarTodo` filtra explícitamente `rol === 'principal'` para evitar procesar ayudantes por separado
- Fechas en modal Matriculados: usar `useRef` para el campo nombre para evitar pérdida de tildes
