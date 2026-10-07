import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE, verificarToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const esPublica =
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/api/yape/recibir";
  const valida = await verificarToken(req.cookies.get(NOMBRE_COOKIE)?.value);

  if (esPublica) return NextResponse.next();
  if (valida) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|sw.js).*)",
  ],
};
