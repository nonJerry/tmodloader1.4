import path from 'node:path'
import fs from 'node:fs'
import { describe, expect, it, vi, afterAll, beforeAll } from 'vitest'
import mockFiles from 'mock-fs'

const envTestUsers = {
  alice: '$2b$10$hashvalue',
  bob: '$2b$10$hashvalue2',
}

const projectRoot = path.resolve(__dirname, "../../../../..");
const usersFile = path.resolve(__dirname, 'tmp/users.json')

describe('Users service', () => {
  beforeAll(() => {
    fs.mkdirSync(path.dirname(usersFile), { recursive: true })
    fs.writeFileSync(usersFile, JSON.stringify(envTestUsers), 'utf8')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
    mockFiles.restore()
    fs.rmSync(usersFile);
    fs.rmdirSync(path.dirname(usersFile))
  })


  it('loads users from set JSON on startup', async () => {
    vi.stubEnv('USERS_FILE_PATH', usersFile)
    const { default: users } = await import('../users.service.js')
    expect(users).toEqual(envTestUsers)
  })

  it('exports a map of usernames to password hashes', async () => {
    const { default: users } = await import('../users.service.js')
    expect(Object.keys(users)).toEqual(['alice', 'bob'])
    expect(Object.values(users)).toEqual(expect.arrayContaining([expect.any(String)]))
  })

  it('loads users from example.users.json if no secret file is provided', async () => {
    const defaultTestUsers = {
      takagi: '$2b$10$hashvalue3'
    }
    vi.unstubAllEnvs()
    vi.resetModules()
    mockFiles({
      [path.resolve(projectRoot, 'example.users.json')]: JSON.stringify(defaultTestUsers)
    })
    const { default: users } = await import('../users.service.js')

    expect(users).toEqual(defaultTestUsers)
  })

  it('loads users from /run/secrets/users if a secret file is provided', async () => {
    vi.unstubAllEnvs()
    vi.resetModules()

    const secretTestUsers = {
      John: '$2b$absolutely$hashvalue',
      Smith: '$2b$hidden$hashvalue2',
    }

    mockFiles({
      '/run/secrets/users': JSON.stringify(secretTestUsers)
    })
    const { default: users } = await import('../users.service.js')

    expect(users).toEqual(secretTestUsers)
  })

  it('refuses to fall back to example users in production', async () => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')

    mockFiles({
      [path.resolve(projectRoot, 'example.users.json')]: JSON.stringify({ takagi: '$2b$10$hashvalue3' })
    })

    await expect(import('../users.service.js')).rejects.toThrow('No users file found')
  })
})
