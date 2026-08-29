import { useState } from 'react'
import {
  Download,
  Upload,
  Database,
  FileCode,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Copy,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  X,
  FileText,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useDragDrop } from '../hooks/useDragDrop'
import Toast from '../components/Toast'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Dialog } from '../components/ui/Dialog'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const PESO_MAP = {
  T: 2, A: 1, X: 1, LB: 1, SMT_DSC: 1, P: 1, TB: 1, PE: 1, EBC: 1, LEBC: 1, VC: 1, NC: 1, ORACION_C: 0,
}

// CSV con BOM UTF-8 para compatibilidad con Excel en español
function downloadCSV(content, filename) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

function copyToClipboard(text, cb) {
  navigator.clipboard.writeText(text).then(cb)
}

function parseCSVLine(line) {
  const parts = []
  let cur = '',
    inQ = false
  for (const ch of line) {
    if (ch === '"') {
      inQ = !inQ
    } else if (ch === ',' && !inQ) {
      parts.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  parts.push(cur.trim())
  return parts
}

function escapeSql(str) {
  if (str == null) return ''
  return String(str).replace(/'/g, "''")
}

const HEADERS_PART = ['clave', 'lista', 'nombre', 'sexo', 'estatus', 'activo']
const HEADERS_PARTIC = ['clave', 'tipo', 'fecha', 'mes', 'nombre', 'lista']

function HeadersWarning({ type, headers }) {
  const required = type === 'part' ? HEADERS_PART : HEADERS_PARTIC
  const missing = required.filter(h => !headers.includes(h))

  if (missing.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 p-2.5 rounded-lg">
        <Check className="w-4 h-4 shrink-0" />
        <span>Columnas requeridas detectadas correctamente</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/40 rounded-lg p-2.5">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        Faltan columnas requeridas:{' '}
        <span className="font-mono font-bold">{missing.join(', ')}</span>. La
        importación puede fallar o quedar incompleta.
      </span>
    </div>
  )
}

export default function Exportar() {
  const [loading, setLoading] = useState('')
  const [mesInicio, setMesInicio] = useState('')
  const [mesFin, setMesFin] = useState('')
  const [preview, setPreview] = useState(null)
  const { toast, success, warning, error: toastError } = useToast()

  const { isDragging: isDraggingPart, dropProps: dropPropsPart } = useDragDrop(
    file => processFile(file, 'part')
  )

  const { isDragging: isDraggingPartic, dropProps: dropPropsPartic } = useDragDrop(
    file => processFile(file, 'partic')
  )

  function filtrarPorMeses(rows) {
    if (!mesInicio && !mesFin) return rows
    const idxInicio = mesInicio ? MESES.indexOf(mesInicio) : 0
    const idxFin = mesFin ? MESES.indexOf(mesFin) : MESES.length - 1
    const min = Math.min(idxInicio, idxFin)
    const max = Math.max(idxInicio, idxFin)
    const mesesRango = new Set(MESES.slice(min, max + 1))
    return rows.filter(r => mesesRango.has(r.mes))
  }

  async function fetchPersonas(lista = '') {
    let q = supabase.from('personas').select('*').order('clave')
    if (lista) q = q.eq('lista', lista)
    const { data, error } = await q
    if (error) throw error
    return data || []
  }

  async function fetchParticipaciones(lista = '') {
    let q = supabase.from('participaciones').select('*').order('fecha')
    if (lista) q = q.eq('lista', lista)
    const { data, error } = await q
    if (error) throw error
    return filtrarPorMeses(data || [])
  }

  async function exportPartCSV(lista = '') {
    setLoading('part-' + (lista || 'all'))
    try {
      const rows = await fetchPersonas(lista)
      const header = 'clave,lista,nombre,sexo,estatus,activo'
      const body = rows
        .map(
          p =>
            `${p.clave},${p.lista},"${p.nombre}",${p.sexo},${p.estatus},${p.activo}`
        )
        .join('\n')
      downloadCSV(
        header + '\n' + body,
        lista ? `participantes_${lista}.csv` : 'participantes.csv'
      )
      success('CSV de participantes descargado')
    } catch (err) {
      console.error(err)
      toastError('Error al exportar: ' + (err?.message || 'Error de red'))
    } finally {
      setLoading('')
    }
  }

  async function exportParticCSV(lista = '') {
    setLoading('partic-' + (lista || 'all'))
    try {
      const rows = await fetchParticipaciones(lista)
      const header = 'id,clave,nombre,lista,fecha,mes,tipo,peso,observaciones'
      const body = rows
        .map(
          r =>
            `${r.id},${r.clave},"${r.nombre}",${r.lista},${r.fecha},${r.mes},${r.tipo},${r.peso},"${r.observaciones || ''}"`
        )
        .join('\n')
      downloadCSV(
        header + '\n' + body,
        lista ? `participaciones_${lista}.csv` : 'participaciones.csv'
      )
      success('CSV de participaciones descargado')
    } catch (err) {
      console.error(err)
      toastError('Error al exportar: ' + (err?.message || 'Error de red'))
    } finally {
      setLoading('')
    }
  }

  async function exportSQL() {
    setLoading('sql')
    try {
      const rows = await fetchParticipaciones()
      const sql = rows
        .map(
          r =>
            `INSERT INTO participaciones (clave, nombre, lista, fecha, mes, tipo, peso, observaciones) VALUES ('${escapeSql(r.clave)}', '${escapeSql(r.nombre)}', '${escapeSql(r.lista)}', '${escapeSql(r.fecha)}', '${escapeSql(r.mes)}', '${escapeSql(r.tipo)}', ${r.peso}, ${r.observaciones ? `'${escapeSql(r.observaciones)}'` : 'NULL'});`
        )
        .join('\n')
      copyToClipboard(sql, () => {
        setLoading('')
        success('Sentencias SQL copiadas al portapapeles')
      })
    } catch (err) {
      console.error(err)
      toastError('Error al generar SQL: ' + (err?.message || 'Error de red'))
      setLoading('')
    }
  }

  async function exportJSON() {
    setLoading('json')
    try {
      const [personas, participaciones] = await Promise.all([
        fetchPersonas(),
        fetchParticipaciones(),
      ])
      const json = JSON.stringify({ personas, participaciones }, null, 2)
      copyToClipboard(json, () => {
        setLoading('')
        success('JSON completo copiado al portapapeles')
      })
    } catch (err) {
      console.error(err)
      toastError('Error al generar JSON: ' + (err?.message || 'Error de red'))
      setLoading('')
    }
  }

  async function processFile(file, type) {
    const text = await file.text()
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean)
    const headers = parseCSVLine(lines[0])
    const rows = lines.slice(1, 6).map(line => {
      const vals = parseCSVLine(line)
      const obj = {}
      headers.forEach(
        (h, i) => (obj[h.trim()] = (vals[i] || '').replace(/^"|"$/g, '').trim())
      )
      return obj
    })

    setPreview({ type, headers, rows, file })
  }

  async function handleFileSelect(e, type) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    await processFile(file, type)
  }

  async function confirmImport() {
    if (!preview) return
    const { type, file } = preview
    setPreview(null)

    if (type === 'part') await importPartCSV(file)
    if (type === 'partic') await importParticCSV(file)
  }

  async function importPartCSV(file) {
    if (!file) return
    setLoading('import-part')
    const text = await file.text()
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean)
    const header = parseCSVLine(lines[0])
    const rows = lines
      .slice(1)
      .map(line => {
        const vals = parseCSVLine(line)
        const obj = {}
        header.forEach(
          (h, i) => (obj[h.trim()] = (vals[i] || '').replace(/^"|"$/g, '').trim())
        )
        return obj
      })
      .filter(r => r.clave && r.nombre)

    let inserted = 0
    let errorsCount = 0
    for (const row of rows) {
      const { error } = await supabase.from('personas').upsert(
        {
          clave: row.clave,
          lista: row.lista,
          nombre: row.nombre,
          sexo: row.sexo,
          estatus: row.estatus,
          activo: row.activo !== 'false',
        },
        { onConflict: 'clave' }
      )
      if (!error) inserted++
      else errorsCount++
    }

    setLoading('')
    if (errorsCount > 0) {
      warning(`${inserted} importados/actualizados · ${errorsCount} fallaron`)
    } else {
      success(`${inserted} personas importadas / actualizadas`)
    }
  }

  async function importParticCSV(file) {
    if (!file) return
    setLoading('import-partic')
    const text = await file.text()
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean)
    const header = parseCSVLine(lines[0])
    const rows = lines
      .slice(1)
      .map(line => {
        const vals = parseCSVLine(line)
        const obj = {}
        header.forEach(
          (h, i) => (obj[h.trim()] = (vals[i] || '').replace(/^"|"$/g, '').trim())
        )
        return obj
      })
      .filter(r => r.clave && r.tipo)

    let inserted = 0
    let errorsCount = 0
    for (const row of rows) {
      const { error } = await supabase.from('participaciones').insert({
        clave: row.clave,
        nombre: row.nombre,
        lista: row.lista,
        fecha: row.fecha,
        mes: row.mes,
        tipo: row.tipo,
        peso: parseInt(row.peso) || PESO_MAP[row.tipo] || 1,
        observaciones: row.observaciones || null,
      })
      if (!error) inserted++
      else errorsCount++
    }

    setLoading('')
    if (errorsCount > 0) {
      warning(`${inserted} importados · ${errorsCount} fallaron`)
    } else {
      success(`${inserted} registros de participaciones importados`)
    }
  }

  const isLoading = key => loading === key

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-text1">
            Exportar e Importar
          </h1>
          <Badge variant="neutral" size="sm">
            Copias y Respaldo
          </Badge>
        </div>
        <p className="text-xs text-text2 mt-0.5">
          Descarga catálogos en CSV, genera copias de seguridad en SQL o JSON e importa datos masivamente.
        </p>
      </div>

      {/* ── GRID PRINCIPAL: EXPORTAR VS IMPORTAR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* COLUMNA 1: EXPORTACIÓN Y BACKUPS */}
        <div className="space-y-5">
          {/* Card 1: Participantes CSV */}
          <div className="p-5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-text1">
                  Catálogo de Participantes
                </h3>
              </div>
              <Badge variant="neutral" size="xs">
                CSV UTF-8
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80">
                <div>
                  <strong className="text-text1 block">Padrón Completo</strong>
                  <span className="text-[11px] text-text3 font-mono">
                    clave, lista, nombre, sexo, estatus, activo
                  </span>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  icon={Download}
                  loading={isLoading('part-all')}
                  onClick={() => exportPartCSV()}
                >
                  Descargar todo
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  loading={isLoading('part-Mat')}
                  onClick={() => exportPartCSV('Mat')}
                >
                  Solo Matriculados
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  loading={isLoading('part-Anc/SM')}
                  onClick={() => exportPartCSV('Anc/SM')}
                >
                  Solo Ancianos / SM
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2: Participaciones CSV */}
          <div className="p-5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-text1">
                  Historial de Participaciones
                </h3>
              </div>
              {(mesInicio || mesFin) && (
                <Button
                  variant="ghost"
                  size="xs"
                  icon={X}
                  onClick={() => {
                    setMesInicio('')
                    setMesFin('')
                  }}
                >
                  Limpiar rango
                </Button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Filtro Rango de Meses */}
              <div className="p-3 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
                <span className="font-medium text-text2 block text-xs">
                  Filtrar rango de meses (opcional):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={mesInicio}
                    onChange={e => setMesInicio(e.target.value)}
                    size="sm"
                  >
                    <option value="">Mes inicial (todos)</option>
                    {MESES.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={mesFin}
                    onChange={e => setMesFin(e.target.value)}
                    size="sm"
                  >
                    <option value="">Mes final (todos)</option>
                    {MESES.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80">
                <div>
                  <strong className="text-text1 block">Todas las asignaciones</strong>
                  <span className="text-[11px] text-text3 font-mono">
                    id, clave, nombre, lista, fecha, mes, tipo, peso
                  </span>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  icon={Download}
                  loading={isLoading('partic-all')}
                  onClick={() => exportParticCSV()}
                >
                  Descargar todo
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  loading={isLoading('partic-Mat')}
                  onClick={() => exportParticCSV('Mat')}
                >
                  Solo Matriculados
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  loading={isLoading('partic-Anc/SM')}
                  onClick={() => exportParticCSV('Anc/SM')}
                >
                  Solo Ancianos / SM
                </Button>
              </div>
            </div>
          </div>

          {/* Card 3: Backups SQL / JSON */}
          <div className="p-5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-text1">
                  Copia de Seguridad Avanzada
                </h3>
              </div>
              <Badge variant="neutral" size="xs">
                PostgreSQL & JSON
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between gap-3">
                <div>
                  <strong className="text-text1 block">Sentencias SQL INSERT</strong>
                  <p className="text-[11px] text-text3 mt-0.5">
                    Script completo para restauración en Supabase.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Copy}
                  loading={isLoading('sql')}
                  onClick={exportSQL}
                >
                  Copiar SQL
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between gap-3">
                <div>
                  <strong className="text-text1 block">Respaldo JSON</strong>
                  <p className="text-[11px] text-text3 mt-0.5">
                    Array estructurado para scripts y migraciones.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Copy}
                  loading={isLoading('json')}
                  onClick={exportJSON}
                >
                  Copiar JSON
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: IMPORTACIÓN Y ESQUEMA */}
        <div className="space-y-5">
          {/* Card 4: Importador Drag & Drop */}
          <div className="p-5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-text1">
                  Importar Archivos CSV
                </h3>
              </div>
              <Badge variant="neutral" size="xs">
                Arrastrar y soltar
              </Badge>
            </div>

            <div className="space-y-3">
              {/* Dropzone 1: Participantes */}
              <div
                {...dropPropsPart}
                className={`p-4 rounded-xl border border-dashed transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDraggingPart
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                    : 'border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs text-text1">
                      participantes.csv
                    </strong>
                    <Badge variant="neutral" size="xs">
                      Upsert
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text3 mt-0.5">
                    {isDraggingPart
                      ? 'Suelta el archivo aquí para previsualizar'
                      : 'Arrastra el archivo o haz clic en seleccionar'}
                  </p>
                </div>
                <input
                  type="file"
                  id="importPart"
                  accept=".csv"
                  className="hidden"
                  onChange={e => handleFileSelect(e, 'part')}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Upload}
                  loading={isLoading('import-part')}
                  onClick={() => document.getElementById('importPart').click()}
                >
                  Seleccionar
                </Button>
              </div>

              {/* Dropzone 2: Participaciones */}
              <div
                {...dropPropsPartic}
                className={`p-4 rounded-xl border border-dashed transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDraggingPartic
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                    : 'border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs text-text1">
                      participaciones.csv
                    </strong>
                    <Badge variant="neutral" size="xs">
                      Insert
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text3 mt-0.5">
                    {isDraggingPartic
                      ? 'Suelta el archivo aquí para previsualizar'
                      : 'Arrastra el archivo o haz clic en seleccionar'}
                  </p>
                </div>
                <input
                  type="file"
                  id="importPartic"
                  accept=".csv"
                  className="hidden"
                  onChange={e => handleFileSelect(e, 'partic')}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Upload}
                  loading={isLoading('import-partic')}
                  onClick={() => document.getElementById('importPartic').click()}
                >
                  Seleccionar
                </Button>
              </div>
            </div>
          </div>

          {/* Card 5: Esquema SQL de Referencia */}
          <div className="p-5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-text3" />
                <h3 className="text-sm font-semibold text-text1">
                  Esquema SQL de la Base de Datos
                </h3>
              </div>
              <Badge variant="neutral" size="xs">
                Postgres Schema
              </Badge>
            </div>
            <pre className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 overflow-x-auto leading-relaxed">
{`CREATE TABLE personas (
  clave    VARCHAR(10)  PRIMARY KEY,
  lista    VARCHAR(10)  NOT NULL,
  nombre   VARCHAR(120) NOT NULL,
  sexo     CHAR(1)      NOT NULL,
  estatus  VARCHAR(30)  NOT NULL,
  activo   BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE participaciones (
  id            SERIAL       PRIMARY KEY,
  clave         VARCHAR(10)  REFERENCES personas(clave),
  nombre        VARCHAR(120),
  lista         VARCHAR(10),
  fecha         DATE         NOT NULL,
  mes           VARCHAR(20),
  tipo          VARCHAR(5),
  peso          SMALLINT     DEFAULT 1,
  observaciones TEXT
);`}
            </pre>
          </div>
        </div>
      </div>

      {/* ── MODAL DIALOG: PREVISUALIZACIÓN DE IMPORTACIÓN ── */}
      <Dialog
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title={`Vista previa — ${preview?.type === 'part' ? 'participantes.csv' : 'participaciones.csv'}`}
        description={`${preview?.rows?.length || 0} filas de muestra detectadas (${preview?.headers?.length || 0} columnas)`}
        width="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="accent"
              size="sm"
              loading={!!loading}
              onClick={confirmImport}
            >
              Confirmar importación
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-4 py-1">
            {/* Tabla de Preview */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    {preview.headers.map(h => (
                      <th key={h} className="px-3 py-2 text-[10px] uppercase font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                      {preview.headers.map(h => (
                        <td key={h} className="px-3 py-1.5 text-text1 whitespace-nowrap truncate max-w-[160px]">
                          {row[h] || <span className="text-text3 italic">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Alerta de cabeceras */}
            <HeadersWarning type={preview.type} headers={preview.headers} />
          </div>
        )}
      </Dialog>

      <Toast toast={toast} />
    </div>
  )
}