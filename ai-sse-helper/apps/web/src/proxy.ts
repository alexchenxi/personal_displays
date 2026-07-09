import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  // Only apply i18n middleware to the root and locale-prefixed routes.
  // All other paths (demos, APIs, static assets) pass through untouched.
  matcher: ["/", "/(en|zh|ar)/:path*"],
}
