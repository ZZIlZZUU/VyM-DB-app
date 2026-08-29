# VyM-DB - Documentacion Tecnica del Rework Visual y Arquitectura UI

Este documento describe de manera exhaustiva las decisiones tecnicas, la arquitectura de componentes, las directrices de diseno y los cambios implementados durante el Rework Visual del sistema VyM-DB (`participantes-app`).

---

## 1. Fundamentos y Sistema de Diseno

### 1.1 Tipografia
- **Familia tipografica principal:** `Inter` (Google Fonts), configurada en `index.html` y `src/index.css`.
- **Familia monoespaciada:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` para claves de participantes, timestamps, IDs y contadores numericos.

### 1.2 Paleta de Colores y Tokens CSS (`src/index.css`)
Se configuraron variables CSS semanticas para soporte nativo de modo claro y oscuro (`html.dark`):

- **Modo Claro:**
  - Fondo base (`--color-bg`): `#F8FAFC` (Zinc / Slate 50)
  - Superficie (`--color-surface`): `#FFFFFF`
  - Bordes (`--color-border`): `#E2E8F0`
  - Texto principal (`--color-text1`): `#0F172A`
  - Texto secundario (`--color-text2`): `#475569`
  - Texto atenuado (`--color-text3`): `#94A3B8`
  - Acento: `#166534` (Emerald 800)

- **Modo Oscuro:**
  - Fondo base (`--color-bg`): `#09090B` (Zinc 950)
  - Superficie (`--color-surface`): `#18181B` (Zinc 900)
  - Superficie secundaria: `#27272A` (Zinc 800)
  - Bordes (`--color-border`): `#27272A`
  - Texto principal (`--color-text1`): `#F4F4F5` (Zinc 100)
  - Texto secundario (`--color-text2`): `#A1A1AA` (Zinc 400)
  - Texto atenuado (`--color-text3`): `#71717A` (Zinc 500)
  - Acento (`--color-accent`): `#15803D` (Verde Bosque / Forest Green). Se eliminaron tonos chillones o saturados en modo oscuro para evitar fatiga visual.

### 1.3 Regla Critica de Tailwind CSS v4
En Tailwind CSS v4 con `@tailwindcss/vite`, **no** existen clases no estandar como `zinc-850`. Se debe utilizar estrictamente la escala estandar (`zinc-800`, `zinc-900`, `zinc-950`) o modificadores de opacidad como `dark:bg-zinc-900/90` y `dark:hover:bg-zinc-800/50`.

---

## 2. Biblioteca de Componentes Base (`src/components/ui/`)

Todos los componentes base son modulares, reutilizables y tipados via props estandar de React.

### 2.1 `Button.jsx`
- **Variantes:**
  - `primary`: Boton principal solido.
  - `secondary`: Superficie secundaria neutra con borde sutil.
  - `accent`: Verde Bosque (`bg-emerald-700` claro / `bg-emerald-900/80` oscuro con borde `border-emerald-700/60`).
  - `outline`: Borde neutro con fondo transparente.
  - `ghost`: Sin borde ni fondo hasta el estado `:hover`.
  - `danger`: Fondo rojo para acciones destructivas directas.
  - `dangerGhost`: Texto rojo con hover sutil para acciones en tablas/filas.
- **Tamanos:** `xs`, `sm`, `md`, `lg`, `iconXs`, `iconSm`, `iconMd`.
- **Estados:** `loading` (muestra `Loader2` animado y deshabilita el click), `disabled`, `icon` (icono a la izquierda), `iconRight` (icono a la derecha).

### 2.2 `Badge.jsx`
- **Variantes:** `neutral`, `success`, `warning`, `danger`, `blue`, `purple`, `cyan`, `teal`.
- **Tamanos:** `xs`, `sm`, `md`.
- **Prop `dot`:** Renderiza un indicador circular de estado a la izquierda del texto.

### 2.3 `Input.jsx`
- Soporte para icono izquierdo (`icon`), tamanos (`xs`, `sm`, `md`), estados de error y compatibilidad con dark mode (`bg-white dark:bg-zinc-900/90 text-text1`).

### 2.4 `Select.jsx`
- Select nativo estilizado con flecha SVG personalizada integrada via absolute layout y espaciado consistente.

### 2.5 `Sheet.jsx` (Slide-Over Lateral)
- Panel lateral deslizable desde la derecha con backdrop blur (`backdrop-blur-xs`), soporte de cierre con tecla `Escape`, cabecera fija, cuerpo con scroll independiente y pie de acciones fijo.
- Utilizado para crear/editar participantes y registros sin interrumpir la vista principal.

### 2.6 `Dialog.jsx` (Modal Centrado)
- Modal centrado con fondo atenuado (`bg-black/50 backdrop-blur-xs`), tamanos (`sm`, `md`, `lg`, `xl`), animacion `animate-in fade-in zoom-in-95` y trampa de click exterior.

### 2.7 `Tooltip.jsx`
- Tooltip flotante posicionado con `z-index` elevado, animaciones suaves y soporte de posiciones (`top`, `bottom`, `left`, `right`).

---

## 3. Arquitectura del App Shell

### 3.1 `Sidebar.jsx`
- **Estado colapsado (Peek Mode):**
  - Ancho de 64px (`w-16`).
  - Al pasar el cursor sobre la barra (`onMouseEnter`), se expande dinamicamente a 240px (`w-60`) sin recargar la vista ni forzar cierres al hacer clic en enlaces de navegacion.
  - Al salir el cursor (`onMouseLeave`), regresa a su ancho colapsado salvo que este fijada permanentemente.
- **Estado expandido fijo:**
  - Toggle mediante el boton de fijar / logo superior (`Sparkles`).
  - Persistencia del estado colapsado en `localStorage` (`sidebar_collapsed`).
- **Navegacion estructurada:**
  - Agrupacion por secciones: *Programa Semanal*, *Control de Participantes*, *Administracion*.
  - Enlace inferior con acceso directo a atajos de teclado (`Cmd/Ctrl+K`).

### 3.2 `Header.jsx`
- Eliminacion de perfiles duplicados. Unico punto de control de usuario en la esquina superior derecha:
  - Indicador de estado de conexion.
  - Selector de modo oscuro/claro.
  - Gatillo de menu de usuario / drawer de perfil.
- Buscador global contextual que dispara la `CommandPalette`.

### 3.3 `CommandPalette.jsx`
- Buscador global modal activado con `Cmd+K` / `Ctrl+K`.
- Búsqueda en tiempo real indexando participantes, semanas de programa, acciones rapidas y navegacion entre pantallas.

### 3.4 `App.jsx`
- **Layout fluido:** Se elimino la restriccion `max-w-7xl` que limitaba el espacio horizontal en monitores modernos. La aplicacion ahora utiliza `w-full` con padding horizontal controlado (`px-4 sm:px-6 lg:px-8`), aprovechando todo el ancho de pantalla para tablas y matrices densas.

---

## 4. Especificaciones Tecnicas por Pantalla

### 4.1 `Personas.jsx` (Gestion de Participantes)
- **Tabla Linear de Ancho Completo:**
  - Columnas: Clave (mono), Nombre con avatar de iniciales (color por sexo `F`/`M`), Lista (`Mat` vs `Anc/SM`), Estatus (`Anciano`, `Siervo Ministerial`, `Publicador`), Sexo, Estado (`Activo`/`Inactivo`) y Acciones.
- **Drawer Lateral (`Sheet.jsx`):**
  - Unificado para creacion y edicion (`startCreate` y `startEdit`).
  - Validacion reactiva de campos obligatorios (`clave`, `nombre`, `lista`, `sexo`, `estatus`).
- **Barra de Herramientas:**
  - Buscador reactivo por nombre o clave con boton de limpieza (`X`).
  - Controles segmentados para filtrar por lista (*Todas*, *Mat*, *Anc/SM*) y estado (*Activos*, *Inactivos*, *Todos*).

### 4.2 `VistaEditable.jsx` (Matriz 12 Meses)
- **Spreadsheet Matrix:**
  - Encabezados fijos de meses (`sticky top-0`) y columna izquierda de participantes fija (`sticky left-0`) con sombra sutil de separacion.
  - Distribucion proporcional de columnas mediante `table-fixed` (12 meses distribuidos equitativamente).
  - Celdas interactivas con badges de roles (`T`, `A`, `P`, `TB`, `PE`, `EBC`, `LEBC`, `VC`, `NC`, `SMT_DSC`, `ORACION_C`).
- **Mapa de Calor:**
  - Visualizacion de intensidad de actividad con tonos esmeralda translúcidos (`bg-emerald-500/10` a `bg-emerald-500/30`), evitando colores chillones.
- **Modales con `Dialog.jsx`:**
  - `MatCellModal`: Detalle de participaciones del mes con acceso directo al programa.
  - `AncCellModal`: Asignacion directa con selector de chips de rol, selector de fecha, campo de observaciones y boton de eliminacion con confirmacion.

### 4.3 `Programa.jsx` (Programa S-140)
- **Tarjetas de Semanas:**
  - Acordeones colapsables estilo Notion / Linear cards.
  - Secciones visuales delimitadas: *Apertura*, *Tesoros de la Biblia*, *Seamos Mejores Maestros*, *Nuestra Vida Cristiana*, *Cierre*.
  - Indicador de progreso de confirmacion por semana (`X/Y confirmadas`).
  - Accion rapida: *"Confirmar toda la semana"* con deteccion automatica de asignaciones modificadas que requieren reconfirmacion.
- **Selector Inteligente Flotante (`PersonaSelector`):**
  - Popover flotante con buscador integrado.
  - Evaluacion predictiva de idoneidad:
    - `Listo` (Icono Check): Mas de 4 semanas sin participar.
    - `Reciente` (Icono Reloj): Entre 2 y 4 semanas desde su ultima asignacion.
    - `Muy reciente` (Icono Alerta): Participo en las ultimas 2 semanas.
  - Tooltip flotante con detalle de las 3 ultimas participaciones del candidato y semanas transcurridas.
- **Exportacion Oficial:**
  - Generacion de documento Word oficial S-140 mediante `docxtemplater` y `pizzip`.

### 4.4 `Registros.jsx` (Historial de Participaciones)
- **Tabla Fluida de Ancho Completo:**
  - Eliminacion del layout dividido 50/50 anterior.
  - Modo de seleccion multiple en lote (*Bulk Actions*): permite seleccionar multiples filas para eliminarlas o cambiar su tipo en una sola operacion atomica en Supabase.
  - Paginacion estilo Supabase con selector de registros por pagina (25, 50, 100, 250).
- **Drawer Lateral (`Sheet.jsx`):**
  - Apertura al hacer clic en *"Nuevo registro"* o al seleccionar *"Editar"* / hacer clic en una fila de la tabla.
  - Selector de participante con optgroups, selector de fecha con calculo automatico de mes, `TipoChips` filtrados por rol permitido y previsualizacion del payload.

### 4.5 `Estadisticas.jsx` (Dashboard Analítico)
- **4 Tarjetas KPI Superiores:**
  - *Personas activas* (con total de inactivas).
  - *Total participaciones* (asignaciones computadas en el anio).
  - *Peso acumulado* (esfuerzo ponderado segun `PESO_MAP`).
  - *Promedio por persona activa*.
- **Graficos Recharts Integrados:**
  - *Participaciones por tipo:* BarChart vertical con labels monoespaciados y tooltips adaptados a Dark Mode.
  - *Participaciones por mes:* BarChart de columnas mensuales con deteccion de meses sin actividad.
  - *Top 10 Participantes:* Barras de progreso limpias con conteo y porcentaje relativo al maximo.
  - *Alertas de baja actividad:* Listados compactos de participantes con 0 asignaciones o baja actividad (1-2 participaciones).
  - *Resumen mensual consolidado:* Tabla desglosada por Matriculados, Ancianos/SM y peso acumulado.

### 4.6 `Exportar.jsx` (Copias de Seguridad e Importacion)
- **Layout de 2 Columnas:**
  - Columna 1: Exportador CSV de *Participantes* y *Participaciones* (con filtro de meses), generador de script SQL `INSERT` para PostgreSQL y generador de respaldo JSON.
  - Columna 2: Zonas Drag & Drop para subir archivos `.csv` de personas y participaciones, y visor del esquema DDL de la base de datos.
- **Validacion de Cabeceras e Importador:**
  - Deteccion automatica de columnas obligatorias (`HeadersWarning`).
  - Previsualizacion de las primeras filas en un `Dialog.jsx` antes de confirmar la insercion o upsert en Supabase.

### 4.7 `Usuarios.jsx` (Control de Acceso y Roles)
- **Formulario de Invitacion:**
  - Invita usuarios via Supabase Edge Function (`invite-user`) con asignacion de nombre visible y validacion de duplicados.
- **Gestion de Cuentas Autorizadas:**
  - Listado de usuarios con avatar de iniciales, edicion en linea de nombre, selector de rol (`admin` vs `editor`), toggle de activacion/desactivacion y borrado permanente (`delete-user` Edge Function) con validacion para no eliminar la cuenta propia activa.

### 4.8 `HistorialCambios.jsx` (Auditoría del Sistema)
- **Timeline de Auditoria en Tiempo Real:**
  - Subscripcion a cambios en la tabla `historial_cambios`.
  - Filtros segmentados por operacion (`ALL`, `INSERT`, `UPDATE`, `DELETE`).
  - Buscador reactivo por usuario, tabla o contenido del payload.
  - Inspector JSON modal (`Dialog.jsx`) para visualizar los objetos `datos_antes` y `datos_despues` formateados.

---

## 5. Mantenimiento y Buenas Practicas

1. **Subscripciones Realtime:**
   - Cada componente que escucha eventos de Postgres (`supabase.channel(...)`) debe eliminar el canal en la funcion de limpieza del `useEffect`:
     ```javascript
     useEffect(() => {
       const channel = supabase.channel('unique-name')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, handler)
         .subscribe()
       return () => {
         supabase.removeChannel(channel)
       }
     }, [handler])
     ```

2. **Dialogs y Sheets:**
   - No manipular manualmente el `document.body.style.overflow`. Los componentes `Sheet.jsx` y `Dialog.jsx` gestionan el estado y el backdrop de forma declarativa.

3. **Verificacion de Build y Tests:**
   - Antes de realizar cualquier merge o despliegue a produccion, ejecutar:
     ```bash
     pnpm test
     pnpm build
     ```
   - Todos los componentes deben compilar limpiamente bajo Vite y pasar la suite de pruebas unitarias (`vitest`).
