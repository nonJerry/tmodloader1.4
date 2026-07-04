import request from 'supertest'
import { describe, it, expect } from 'vitest'
import { app } from '../../../index.js'

describe('Backend', () => {
  it('returns a CSRF token', async () => {
    await request(app)
      .get('/csrf-token')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body.csrfToken).toBeTypeOf('string')
      })
  })

  it('returns 404 for unknown routes', async () => {
    await request(app)
      .get('/does-not-exist')
      .expect(404)
  })
})

describe('Session persistence', () => {
  it('sets a session cookie on the first request', async () => {
    const res = await request(app).get('/csrf-token').expect(200)

    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.some(cookie => cookie.startsWith('connect.sid='))).toBe(true)
  })

  it('keeps the CSRF token valid across requests so login works', async () => {
    const agent = request.agent(app)

    const tokenRes = await agent.get('/csrf-token').expect(200)

    const res = await agent
      .post('/login')
      .set('x-csrf-token', tokenRes.body.csrfToken)
      .send({ username: 'alice', password: 'alicePassword' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ success: true })
  })
})

describe('Auth routes', () => {
  it('include the login route', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'invalid', password: 'invalid' })
      .set('Accept', 'application/json')

    expect(res.status).not.toBe(404)
  })

  it('do require csrf token', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'invalid', password: 'invalid' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(403)
  })
})

describe('API routes', () => {
  const commands = ['start', 'stop', 'dawn', 'noon', 'dusk', 'midnight', 'save', 'extend']
  it('include the status route', async () => {
    const res = await request(app).get('/api/status')
    expect(res.status).not.toBe(404)
  })
  it.each(commands)(`include the %s route`, async (route) => {
    const res = await request(app).post(`/api/${route}`)
    expect(res.status).not.toBe(404)
  })

  it.each(commands)(`require csrf token for the %s route`, async (route) => {
    const res = await request(app)
      .post(`/api/${route}`)
      .send({})
      .set('Accept', 'application/json')

    expect(res.status).toBe(403)
  })
})

describe('Users routes', () => {
  it('include the me route', async () => {
    const res = await request(app).get('/users/me')
    expect(res.status).not.toBe(404)
  })

  it('require csrf token', async () => {
    const res = await request(app)
      .post('/users/me')
      .send({})
      .set('Accept', 'application/json')

    expect(res.status).toBe(403)
  })
})

describe('Test routes', () => {

  const commands = ['reset', 'advance-time', 'set-timeout', 'force-inactivity-stop']

  it.each(commands)(`include the %s route`, async (route) => {
    const res = await request(app).post(`/test/${route}`)
      .send({ amount: 100, timeout: 60 })
    expect(res.status).not.toBe(404)
  })

  it.each(commands)(`do not require csrf token for the %s route`, async (route) => {
    const res = await request(app)
      .post(`/test/${route}`)
      .send({ amount: 100, timeout: 60 })
      .set('Accept', 'application/json')

    expect(res.status).not.toBe(403)
  })
})
