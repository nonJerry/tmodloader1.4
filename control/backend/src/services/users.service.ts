import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IS_PRODUCTION } from '../config/constants.js'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../..");
const DEFAULT_SECRET_PATHS = [
  process.env.USERS_FILE_PATH,
  '/run/secrets/users'
].filter((p): p is string => typeof p === 'string') // remove not set env vars

const secretFilePath = DEFAULT_SECRET_PATHS.find(filePath => fs.existsSync(filePath))

// The example users are public in the repo, so never fall back to them in production
if (!secretFilePath && IS_PRODUCTION) {
  throw new Error('No users file found. Provide one via USERS_FILE_PATH or /run/secrets/users.')
}

const usersFilePath = path.resolve(projectRoot, secretFilePath || 'example.users.json')

const users = JSON.parse(
  fs.readFileSync(usersFilePath, 'utf8')
) as Users
console.log('Loaded users:', Object.keys(users))

export type Users = Record<string, string>

export default users
