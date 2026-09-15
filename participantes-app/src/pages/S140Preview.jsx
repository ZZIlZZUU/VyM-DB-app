// src/pages/S140Preview.jsx — Página de vista previa e impresión aislada del formulario S-140
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileDown, Loader2 } from 'lucide-react'
import S140Vista from '../components/S140Vista'
import { supabase } from '../lib/supabase'
import { buildDatosDesdeSupabase, generarYDescargarS140 } from '../lib/generarS140'
import { Button } from '../components/ui/Button'

export default function S140Preview() {
  const location = useLocation()
  const navigate = useNavigate()

  const [semanas, setSemanas] = useState(() => location.state?.semanas || [])
  const [congregacion, setCongregacion] = useState(
    () => location.state?.congregacion || ''
  )
  const [loading, setLoading] = useState(!location.state?.semanas?.length)
  const [generatingDocx, setGeneratingDocx] = useState(false)

  // Carga de respaldo si se entra directamente por URL o tras recargar la página
  useEffect(() => {
    if (semanas.length > 0) return

    async function cargarDatosDesdeSupabase() {
      try {
        setLoading(true)
        const [semRes, parRes, asigRes, perRes, cfgRes] = await Promise.all([
          supabase.from('programa_semanas').select('*').order('fecha_inicio', { ascending: true }),
          supabase.from('programa_partes').select('*').order('numero_parte', { ascending: true }),
          supabase.from('programa_asignaciones').select('*'),
          supabase.from('personas').select('*'),
          supabase.from('configuracion').select('*'),
        ])

        const semData = semRes.data || []
        const parData = parRes.data || []
        const asigData = asigRes.data || []
        const perData = perRes.data || []
        const cfgData = cfgRes.data || []

        const nombreCfg = cfgData.find(c => c.clave === 'nombre_congregacion')?.valor || 'Congregación del Recreo'
        setCongregacion(nombreCfg)

        if (semData.length > 0) {
          const semanasNorm = buildDatosDesdeSupabase(semData, parData, asigData, perData)
          setSemanas(semanasNorm)
        }
      } catch (err) {
        console.error('[S140Preview] Error cargando datos:', err)
      } finally {
        setLoading(false)
      }
    }

    cargarDatosDesdeSupabase()
  }, [semanas.length])

  function handlePrint() {
    const primerSemana = semanas[0]?.fecha ? `${semanas[0].fecha}` : ''
    const prevTitle = document.title
    document.title = `S-140 ${congregacion || ''} ${primerSemana}`.trim()

    // Evitar que el modo oscuro contamine el diálogo y lienzo de impresión de Windows/Chromium
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      document.documentElement.classList.remove('dark')
    }

    window.print()

    setTimeout(() => {
      document.title = prevTitle
      if (isDark) {
        document.documentElement.classList.add('dark')
      }
    }, 1000)
  }

  async function handleDescargarWord() {
    try {
      setGeneratingDocx(true)
      await generarYDescargarS140({
        congregacion,
        semanas,
      })
    } catch (err) {
      console.error('[S140Preview] Error al generar Word:', err)
    } finally {
      setGeneratingDocx(false)
    }
  }

  const totalPaginas = Math.ceil(semanas.length / 2)

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-emerald-500/20 print:bg-white print:text-black print:min-h-0">
      {/* ── BARRA SUPERIOR DE HERRAMIENTAS (Solo visible en pantalla) ── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 shadow-xs print:hidden">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/programa')}
            >
              Volver al Programa
            </Button>
            <div>
              <h1 className="text-sm font-semibold text-text1 leading-tight flex items-center gap-2">
                <span>Vista Previa S-140</span>
                <span className="text-xs font-normal text-text3 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  {semanas.length} {semanas.length === 1 ? 'semana' : 'semanas'} · {totalPaginas} {totalPaginas === 1 ? 'página' : 'páginas'}
                </span>
              </h1>
              <p className="text-[11px] text-text3">
                {congregacion || 'Congregación'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              icon={FileDown}
              loading={generatingDocx}
              onClick={handleDescargarWord}
              title="Descargar versión editable en Word"
            >
              Descargar Word (.docx)
            </Button>

            <Button
              variant="accent"
              size="sm"
              icon={Printer}
              disabled={loading || semanas.length === 0}
              onClick={handlePrint}
              title="Abrir diálogo de impresión o guardar como PDF"
            >
              Generar PDF / Imprimir
            </Button>
          </div>
        </div>
      </header>

      {/* ── CONTENEDOR DE PÁGINAS S-140 ── */}
      <main className="flex-1 s140-contenedor-pantalla print:p-0 print:bg-white">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-text3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-xs font-medium">Preparando vista previa del S-140...</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto print:max-w-none print:m-0 print:p-0">
            <S140Vista semanas={semanas} nombreCongregacion={congregacion} />
          </div>
        )}
      </main>
    </div>
  )
}
