import { NextResponse } from "next/server";
import { NOMBRE_COOKIE, DURACION_SEGUNDOS, crearToken } from "@/lib/auth";

const TIENDAS = [1, 2];

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function claveDe(id: number): string {
  const c = process.env["APP_PASSWORD_" + id];
  if (c) return c;
  return id === 1 ? process.env.APP_PASSWORD ?? "" : "";
}

export async function POST(req: Request) {
  if (!process.env.AUTH_SECRET) {
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

  const tiendaId = TIENDAS.find((id) => {
    const esperada = claveDe(id);
    return esperada !== "" && iguales(password, esperada);
  });

  if (!tiendaId) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOMBRE_COOKIE, await crearToken(tiendaId), {
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
