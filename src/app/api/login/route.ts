import { NextResponse } from "next/server";
import { NOMBRE_COOKIE, DURACION_SEGUNDOS, crearToken } from "@/lib/auth";

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  const esperada = process.env.APP_PASSWORD;
  if (!esperada || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: "Falta configurar el acceso en el servidor" },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {}

  if (!iguales(password, esperada)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOMBRE_COOKIE, await crearToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOMBRE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
