// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  IDLE_TIMEOUT_STORAGE_KEY,
  evaluarFortalezaPassword,
  verificarPasswordFiltradaHIBP,
  calcularSaludSeguridad,
  loadIdleTimeoutMinutes,
  saveIdleTimeoutMinutes,
  limpiarDatosSensiblesLogout,
  createAttemptThrottle,
  getDeviceLabel,
} from './seguridad'

describe('seguridad', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('evaluarFortalezaPassword', () => {
    it('rechaza contraseñas cortas, comunes o que contienen datos personales', () => {
      const corta = evaluarFortalezaPassword('Ab1!')
      expect(corta.cumpleMinimo).toBe(false)
      expect(corta.score).toBeLessThanOrEqual(1)

      const comun = evaluarFortalezaPassword('Password123')
      expect(comun.cumpleMinimo).toBe(false)

      const comunExacta = evaluarFortalezaPassword('12345678')
      expect(comunExacta.cumpleMinimo).toBe(false)

      const conEmail = evaluarFortalezaPassword('MiCarlos#2026', {
        email: 'carlos@recreo.app',
        nombre: 'Juan Pérez',
      })
      expect(conEmail.cumpleMinimo).toBe(false)

      const conNombreSinTilde = evaluarFortalezaPassword('SeguraPerez9!', {
        email: 'usuario@recreo.app',
        nombre: 'María Pérez',
      })
      expect(conNombreSinTilde.cumpleMinimo).toBe(false)

      const igualActual = evaluarFortalezaPassword('ClaveFuerte9!', {
        currentPassword: 'ClaveFuerte9!',
      })
      expect(igualActual.cumpleMinimo).toBe(false)
    })

    it('aprueba contraseñas robustas y califica más alto las de >= 12 caracteres con símbolo', () => {
      const minima = evaluarFortalezaPassword('ValleSol9')
      expect(minima.cumpleMinimo).toBe(true)
      expect(minima.score).toBe(2)

      const robusta = evaluarFortalezaPassword('TierraVerde#2026!')
      expect(robusta.cumpleMinimo).toBe(true)
      expect(robusta.score).toBe(4)
      expect(robusta.label).toBe('Muy fuerte')
    })
  })

  describe('verificarPasswordFiltradaHIBP', () => {
    it('detecta coincidencia por k-Anonymity sin enviar la contraseña completa', async () => {
      const mockFetch = vi.fn(async () => ({
        ok: true,
        // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
        text: async () => '0018A45C4D1DEF81644B54AB7F969B88D65:12\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493',
      }))

      const hit = await verificarPasswordFiltradaHIBP('password', { fetchImpl: mockFetch })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pwnedpasswords.com/range/5BAA6',
        expect.objectContaining({ headers: { 'Add-Padding': 'true' } })
      )
      expect(hit).toEqual({ filtrada: true, conteo: 3861493, omitido: false })

      const clean = await verificarPasswordFiltradaHIBP('TierraVerde#2026!', {
        fetchImpl: mockFetch,
      })
      expect(clean).toEqual({ filtrada: false, conteo: 0, omitido: false })
    })

    it('hace fallback transparente si falla la red', async () => {
      const failingFetch = vi.fn(async () => {
        throw new Error('Network error')
      })
      const res = await verificarPasswordFiltradaHIBP('ClaveSegura2026!', {
        fetchImpl: failingFetch,
      })
      expect(res).toEqual({ filtrada: false, conteo: 0, omitido: true })
    })
  })

  describe('calcularSaludSeguridad', () => {
    it('recomienda 2FA con prioridad alta para administradores sin MFA', () => {
      const sin2fa = calcularSaludSeguridad({
        mfaEnabled: false,
        emailConfirmed: true,
        idleTimeoutMinutes: 0,
        rol: 'admin',
      })
      expect(sin2fa.score).toBe(45)
      expect(sin2fa.nivel).toBe('Básico')
      expect(sin2fa.pendientes[0].priority).toBe('alta')

      const conTodo = calcularSaludSeguridad({
        mfaEnabled: true,
        emailConfirmed: true,
        idleTimeoutMinutes: 30,
        rol: 'admin',
      })
      expect(conTodo.score).toBe(100)
      expect(conTodo.nivel).toBe('Robusto')
      expect(conTodo.pendientes).toHaveLength(0)
    })
  })

  describe('preferencias de inactividad, throttle y limpieza en logout', () => {
    it('persiste opciones válidas de auto-cierre por inactividad', () => {
      expect(loadIdleTimeoutMinutes()).toBe(0)
      saveIdleTimeoutMinutes(30)
      expect(localStorage.getItem(IDLE_TIMEOUT_STORAGE_KEY)).toBe('30')
      expect(loadIdleTimeoutMinutes()).toBe(30)
      expect(saveIdleTimeoutMinutes(999)).toBe(0)
    })

    it('bloquea tras exceder el límite de intentos y limpia con reset()', () => {
      const throttle = createAttemptThrottle('test_throttle_key', {
        maxAttempts: 5,
        windowMs: 60000,
        baseLockoutMs: 30000,
      })
      const t0 = 1_000_000
      for (let i = 0; i < 4; i++) {
        expect(throttle.recordFailure(t0 + i * 1000).locked).toBe(false)
      }
      const fifth = throttle.recordFailure(t0 + 4000)
      expect(fifth.locked).toBe(true)
      expect(fifth.remainingSeconds).toBe(30)
      expect(throttle.getStatus(t0 + 15000).locked).toBe(true)
      expect(throttle.getStatus(t0 + 35000).locked).toBe(false)

      throttle.reset()
      expect(throttle.getStatus(t0 + 15000).locked).toBe(false)
    })

    it('limpia QueryClient, caché local y runtime cache del SW en logout', async () => {
      localStorage.setItem('app_config_cache', '{"a":1}')
      localStorage.setItem('app_eventos_cache', '{"b":2}')
      localStorage.setItem('theme_id', 'dark-oled')
      const clearMock = vi.fn()
      const deleteCacheMock = vi.fn(async () => true)
      vi.stubGlobal('caches', { delete: deleteCacheMock })

      await limpiarDatosSensiblesLogout({ clear: clearMock })
      expect(clearMock).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem('app_config_cache')).toBeNull()
      expect(localStorage.getItem('app_eventos_cache')).toBeNull()
      expect(localStorage.getItem('theme_id')).toBe('dark-oled')
      expect(deleteCacheMock).toHaveBeenCalledWith('supabase-api-cache')
    })

    it('formatea dispositivo de forma segura', () => {
      expect(
        getDeviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
      ).toBe('Chrome en Windows')
      expect(
        getDeviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/120.0.0.0')
      ).toBe('Edge en Windows')
    })
  })
})
