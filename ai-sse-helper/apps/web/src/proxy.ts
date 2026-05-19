import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  // 匹配根路径和带语言前缀的路径，其他路径（如 /stripe-ui、/image-inference）自动绕过中间件
  matcher: ["/", "/(zh|en|ar)/:path*"],
}
