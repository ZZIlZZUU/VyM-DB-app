import { useState } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const PESO_MAP = { T:2, A:1, X:1, P:1, TB:1, PE:1, EBC:1, VC:1, NC:1 }

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
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { parts.push(cur.trim()); cur = '' }
    else cur += ch
  }
  parts.push(cur.trim())
  return parts
}

export default function Exportar() {
  const [loading, setLoading] = useState('')
  const [toast, setToast]     = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // ── Fetch helpers ──
  async function fetchPersonas(lista = '') {
    let q = supabase.from('personas').select('*').order('clave')
    if (lista) q = q.eq('lista', lista)
    const { data } = await q
    return data || []
  }

  async function fetchParticipaciones(lista = '') {
    let q = supabase.from('participaciones').select('*').order('fecha')
    if (lista) q = q.eq('lista', lista)
    const { data } = await q
    return data || []
  }

  // ── Exportar participantes.csv ──
  async function exportPartCSV(lista = '') {
    setLoading('part-' + (lista || 'all'))
    const rows = await fetchPersonas(lista)
    const header = 'clave,lista,nombre,sexo,estatus,activo'
    const body = rows.map(p =>
      `${p.clave},${p.lista},"${p.nombre}",${p.sexo},${p.estatus},${p.activo}`
    ).join('\n')
    downloadCSV(header + '\n' + body, lista ? `participantes_${lista}.csv` : 'participantes.csv')
    setLoading('')
    showToast('CSV descargado')
  }

  // ── Exportar participaciones.csv ──
  async function exportParticCSV(lista = '') {
    setLoading('partic-' + (lista || 'all'))
    const rows = await fetchParticipaciones(lista)
    const header = 'id,clave,nombre,lista,fecha,mes,tipo,peso,observaciones'
    const body = rows.map(r =>
      `${r.id},${r.clave},"${r.nombre}",${r.lista},${r.fecha},${r.mes},${r.tipo},${r.peso},"${r.observaciones || ''}"`
    ).join('\n')
    downloadCSV(header + '\n' + body, lista ? `participaciones_${lista}.csv` : 'participaciones.csv')
    setLoading('')
    showToast('CSV descargado')
  }

  // ── Exportar SQL ──
  async function exportSQL() {
    setLoading('sql')
    const rows = await fetchParticipaciones()
    const sql = rows.map(r =>
      `INSERT INTO participaciones (clave, nombre, lista, fecha, mes, tipo, peso, observaciones) VALUES ('${r.clave}', '${r.nombre}', '${r.lista}', '${r.fecha}', '${r.mes}', '${r.tipo}', ${r.peso}, ${r.observaciones ? `'${r.observaciones}'` : 'NULL'});`
    ).join('\n')
    copyToClipboard(sql, () => { setLoading(''); showToast('SQL copiado al portapapeles') })
  }

  // ── Exportar JSON ──
  async function exportJSON() {
    setLoading('json')
    const [personas, participaciones] = await Promise.all([fetchPersonas(), fetchParticipaciones()])
    const json = JSON.stringify({ personas, participaciones }, null, 2)
    copyToClipboard(json, () => { setLoading(''); showToast('JSON copiado al portapapeles') })
  }

  // ── Importar participantes.csv ──
  async function importPartCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading('import-part')
    const text = await file.text()
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean)
    const header = parseCSVLine(lines[0])
    const rows = lines.slice(1).map(line => {
      const vals = parseCSVLine(line)
      const obj = {}
      header.forEach((h, i) => obj[h.trim()] = (vals[i] || '').replace(/^"|"$/g, '').trim())
      return obj
    }).filter(r => r.clave && r.nombre)

    let inserted = 0
    for (const row of rows) {
      const { error } = await supabase.from('personas').upsert({
        clave:   row.clave,
        lista:   row.lista,
        nombre:  row.nombre,
        sexo:    row.sexo,
        estatus: row.estatus,
        activo:  row.activo !== 'false',
      }, { onConflict: 'clave' })
      if (!error) inserted++
    }

    setLoading('')
    showToast(`${inserted} personas importadas / actualizadas`)
    e.target.value = ''
  }

  // ── Importar participaciones.csv ──
  async function importParticCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading('import-partic')
    const text = await file.text()
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean)
    const header = parseCSVLine(lines[0])
    const rows = lines.slice(1).map(line => {
      const vals = parseCSVLine(line)
      const obj = {}
      header.forEach((h, i) => obj[h.trim()] = (vals[i] || '').replace(/^"|"$/g, '').trim())
      return obj
    }).filter(r => r.clave && r.tipo)

    let inserted = 0
    for (const row of rows) {
      const { error } = await supabase.from('participaciones').insert({
        clave:         row.clave,
        nombre:        row.nombre,
        lista:         row.lista,
        fecha:         row.fecha,
        mes:           row.mes,
        tipo:          row.tipo,
        peso:          parseInt(row.peso) || PESO_MAP[row.tipo] || 1,
        observaciones: row.observaciones || null,
      })
      if (!error) inserted++
    }

    setLoading('')
    showToast(`${inserted} registros importados`)
    e.target.value = ''
  }

  const isLoading = (key) => loading === key

  return (
    <div className="max-w-2xl flex flex-col gap-4">

      {/* Exportar participantes */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-sm font-medium text-text1 mb-4 pb-3 border-b border-border">
          Exportar participantes.csv
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-text1 font-medium">Todo el catálogo</div>
              <div className="text-xs text-text3 mt-0.5">
                Campos: <code className="font-mono bg-bg px-1 rounded">clave, lista, nombre, sexo, estatus, activo</code>
              </div>
            </div>
            <button onClick={() => exportPartCSV()} disabled={!!loading}
              className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-green-800 disabled:opacity-50 whitespace-nowrap">
              {isLoading('part-all') ? 'Descargando...' : '↓ Descargar todo'}
            </button>
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            <button onClick={() => exportPartCSV('Mat')} disabled={!!loading}
              className="flex-1 px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50">
              {isLoading('part-Mat') ? '...' : '↓ Solo Matriculados'}
            </button>
            <button onClick={() => exportPartCSV('Anc/SM')} disabled={!!loading}
              className="flex-1 px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50">
              {isLoading('part-Anc/SM') ? '...' : '↓ Solo Anc/SM'}
            </button>
          </div>
        </div>
      </div>

      {/* Exportar participaciones */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-sm font-medium text-text1 mb-4 pb-3 border-b border-border">
          Exportar participaciones.csv
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-text1 font-medium">Todos los registros</div>
              <div className="text-xs text-text3 mt-0.5">
                Campos: <code className="font-mono bg-bg px-1 rounded">id, clave, nombre, lista, fecha, mes, tipo, peso, observaciones</code>
              </div>
            </div>
            <button onClick={() => exportParticCSV()} disabled={!!loading}
              className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-green-800 disabled:opacity-50 whitespace-nowrap">
              {isLoading('partic-all') ? 'Descargando...' : '↓ Descargar todo'}
            </button>
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            <button onClick={() => exportParticCSV('Mat')} disabled={!!loading}
              className="flex-1 px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50">
              {isLoading('partic-Mat') ? '...' : '↓ Solo Matriculados'}
            </button>
            <button onClick={() => exportParticCSV('Anc/SM')} disabled={!!loading}
              className="flex-1 px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50">
              {isLoading('partic-Anc/SM') ? '...' : '↓ Solo Anc/SM'}
            </button>
          </div>
        </div>
      </div>

      {/* SQL + JSON */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-sm font-medium text-text1 mb-4 pb-3 border-b border-border">
          Otros formatos
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-text1 font-medium">SQL INSERT</div>
              <div className="text-xs text-text3 mt-0.5">Sentencias listas para PostgreSQL / Supabase</div>
            </div>
            <button onClick={exportSQL} disabled={!!loading}
              className="px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50">
              {isLoading('sql') ? 'Copiando...' : '⎘ Copiar SQL'}
            </button>
          </div>
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <div className="flex-1">
              <div className="text-sm text-text1 font-medium">JSON</div>
              <div className="text-xs text-text3 mt-0.5">Array completo para scripts de automatización</div>
            </div>
            <button onClick={exportJSON} disabled={!!loading}
              className="px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50">
              {isLoading('json') ? 'Copiando...' : '⎘ Copiar JSON'}
            </button>
          </div>
        </div>
      </div>

      {/* Importar */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-sm font-medium text-text1 mb-4 pb-3 border-b border-border">
          Importar CSV
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-text1 font-medium">participantes.csv</div>
              <div className="text-xs text-text3 mt-0.5">Si la clave ya existe, actualiza los datos (upsert)</div>
            </div>
            <input type="file" id="importPart" accept=".csv" className="hidden" onChange={importPartCSV} />
            <button onClick={() => document.getElementById('importPart').click()} disabled={!!loading}
              className="px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50 whitespace-nowrap">
              {isLoading('import-part') ? 'Importando...' : '↑ Seleccionar archivo'}
            </button>
          </div>
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <div className="flex-1">
              <div className="text-sm text-text1 font-medium">participaciones.csv</div>
              <div className="text-xs text-text3 mt-0.5">Agrega los registros del archivo a la base de datos</div>
            </div>
            <input type="file" id="importPartic" accept=".csv" className="hidden" onChange={importParticCSV} />
            <button onClick={() => document.getElementById('importPartic').click()} disabled={!!loading}
              className="px-3 py-1.5 text-xs border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50 whitespace-nowrap">
              {isLoading('import-partic') ? 'Importando...' : '↑ Seleccionar archivo'}
            </button>
          </div>
        </div>
      </div>

      {/* Esquema SQL */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-sm font-medium text-text1 mb-3 pb-3 border-b border-border">
          Esquema SQL de referencia
        </div>
        <pre className="font-mono text-xs text-text2 leading-relaxed overflow-auto bg-bg rounded-lg p-3">{`CREATE TABLE personas (
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
);`}</pre>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 bg-text1 text-white text-xs font-mono px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}