import type { DoubleCsrfConfigOptions } from 'csrf-csrf'
import { describe, it, expect, beforeEach, vi } from 'vitest'


async function captureCsrf(captured: { options?: Record<string, unknown> }) {
  const actual = await vi.importActual<typeof import('csrf-csrf')>('csrf-csrf')
  vi.doMock('csrf-csrf', () => ({
    doubleCsrf: (options: DoubleCsrfConfigOptions) => {
      captured.options = options
      return actual.doubleCsrf(options)
    },
  }))
}

describe('CSRF config', () => {

  beforeEach(() => {
    vi.resetModules()
  })

  it('uses secure cookies in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CSRF_SECRET', 'prod-csrf')
    vi.stubEnv('XSRF_TOKEN_COOKIE', 'XSRF-TOKEN-PROD')

    const captured: { options?: Record<string, unknown> } = {}
    await captureCsrf(captured)

    const csrfConfig = (await import('../csrf.js'))
    const config = (await import('../constants.js')).config

    expect(typeof csrfConfig).toBe('object')
    expect(captured.options).toMatchObject({
      cookieName: config.xsrfTokenCookie,
      cookieOptions: {
        secure: true,
        sameSite: "lax",
        httpOnly: true
      }
    })
  })

  it('binds the session identifier to the access token cookie when present', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const captured: { options?: Record<string, unknown> } = {}
    await captureCsrf(captured)

    await import('../csrf.js')
    const config = (await import('../constants.js')).config
    const { createToken } = await import('../../services/jwt.service.js')

    const getSessionIdentifier = captured.options?.getSessionIdentifier as (req: unknown) => string
    const token = createToken('alice', 'jwt-session-id')

    const withToken = { cookies: { [config.accessTokenCookie]: token }, session: { id: 'express-session-id' } }
    expect(getSessionIdentifier(withToken)).toBe('jwt-session-id')

    const withoutToken = { cookies: {}, session: { id: 'express-session-id' } }
    expect(getSessionIdentifier(withoutToken)).toBe('express-session-id')

    const withInvalidToken = { cookies: { [config.accessTokenCookie]: 'garbage' }, session: { id: 'express-session-id' } }
    expect(getSessionIdentifier(withInvalidToken)).toBe('express-session-id')
  })

  it('does not enforce secure cookies in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CSRF_SECRET', 'dev-csrf')
    vi.stubEnv('XSRF_TOKEN_COOKIE', 'XSRF-TOKEN-DEV')

    const captured: { options?: Record<string, unknown> } = {}
    await captureCsrf(captured)

    const csrfConfig = (await import('../csrf.js'))
    const config = (await import('../constants.js')).config

    expect(typeof csrfConfig).toBe('object')
    expect(captured.options).toMatchObject({
      cookieName: config.xsrfTokenCookie,
      cookieOptions: {
        secure: false,
        sameSite: "lax",
        httpOnly: true
      }
    })
  })
})
