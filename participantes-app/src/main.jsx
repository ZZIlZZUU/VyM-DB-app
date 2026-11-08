import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './core/queryClient'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

const Login       = lazy(() => import('./pages/Login'))
const SetPassword = lazy(() => import('./pages/SetPassword'))
const S140Preview = lazy(() => import('./pages/S140Preview'))
const App         = lazy(() => import('./App'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-bg text-text3 text-xs font-mono">
      Cargando...
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* Ruta dedicada para vista previa e impresión de S-140 (sin shell de app) */}
            <Route
              path="/s140-preview"
              element={
                <ProtectedRoute>
                  <S140Preview />
                </ProtectedRoute>
              }
            />

            {/* Rutas protegidas — requieren sesión activa */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            />

            {/* Cualquier ruta desconocida redirige al inicio */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
