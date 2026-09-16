import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Ранний редирект неавторизованных с приватных страниц.
 *
 * Файл называется proxy.ts, а не middleware.ts: в Next 16 старое имя
 * объявлено устаревшим (runtime здесь всегда nodejs).
 *
 * Зачем понадобился: у /account, /specialist и /admin появился loading.tsx,
 * то есть граница Suspense. Next начинает стримить каркас сразу и статус
 * ответа фиксируется как 200 ещё до того, как серверный компонент дойдёт до
 * redirect(). Данные при этом не утекали — до рендера защищённой части дело
 * не доходило, — но неавторизованный запрос получал 200 вместо 307.
 *
 * Здесь проверяется только наличие сессионной куки: это оптимистичная
 * проверка, которую Better Auth и рекомендует для middleware. Настоящая
 * валидация сессии и проверка роли остаются на странице — кука сама по себе
 * ничего не доказывает.
 */
const PROTECTED = ["/account", "/specialist", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (getSessionCookie(request)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/account/:path*", "/specialist/:path*", "/admin/:path*"],
};
