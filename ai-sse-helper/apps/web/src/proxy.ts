import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  // Catch all page routes except API / _next / static files.
  // All pages live under [locale]; default locale "zh" is hidden via localePrefix: "as-needed".
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
