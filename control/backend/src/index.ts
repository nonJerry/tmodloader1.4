
import express from 'express'
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser"
import { config, IS_PRODUCTION } from './config/constants.js'
import { doubleCsrfProtection, generateCsrfToken } from "./config/csrf.js"
import helmetConfig from "./config/helmet.js"
import corsConfig from "./config/cors.js"
import errorHandler from "./middleware/error-handler.js"
import commandsRouter from './api/routes/commands.routes.js'
import statusRouter from './api/routes/status.routes.js'
import userRouter from './api/routes/users.route.js'
import authRouter from './api/routes/auth.routes.js'
import session from './config/session.js'
import { startStatusPolling } from './services/status.service.js'
import testRouter from './api/routes/test.routes.js'

declare module 'express-session' {
  interface SessionData {
    createdAt?: number
  }
}

console.log(`Running in production: ${IS_PRODUCTION}`)
export const app = express()

const limiter = rateLimit({
  limit: IS_PRODUCTION ? 100 : 1000
});

app.use(limiter)
app.use(helmetConfig)
app.use(corsConfig)
app.use(cookieParser(config.sessionSecret))
app.use(express.json())
app.use(session)
app.set('trust proxy', 'loopback, uniquelocal')

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})


app.get("/csrf-token", (req, res) => {
  req.session.createdAt ??= Date.now()
  const csrfToken = generateCsrfToken(req, res)
  res.status(200).json({ csrfToken })
})



if (!IS_PRODUCTION) {
  console.log('!!!USING TEST ROUTES!!!')
  app.use('/test', testRouter)
}

app.use(doubleCsrfProtection)
app.use('/', authRouter)
app.use('/api', statusRouter)
app.use('/api', commandsRouter)
app.use('/users', userRouter)
app.use(errorHandler)

startStatusPolling()


if (process.env.NODE_ENV !== 'unittest') {
  app.listen(8000, () => {
    console.log('Listening on port 8000')
  })
}
