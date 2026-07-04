import { doubleCsrf } from "csrf-csrf"
import { IS_PRODUCTION, config } from "./constants.js"
import { verifyToken } from "../services/jwt.service.js"


export const { doubleCsrfProtection, invalidCsrfTokenError, generateCsrfToken } = doubleCsrf({
  getSecret: () => config.csrfSecret,
  getSessionIdentifier: (req) => {
    const token = req.cookies?.[config.accessTokenCookie]

    if (!token) return req.session.id

    try {
      const payload = verifyToken(token)

      return payload.sessionId ?? payload.username
    } catch {
      return req.session.id
    }
  },
  cookieOptions: {
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    httpOnly: true
  },
  cookieName: config.xsrfTokenCookie
})
