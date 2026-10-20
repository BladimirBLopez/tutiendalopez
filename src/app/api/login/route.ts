import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { NOMBRE_COOKIE, DURACION_SEGUNDOS, crearToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

const MAX_INTENTOS = 5;
const VENTANA_MS = 10 * 60 * 1000;

function huellaDe(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sin-ip";
  const ua = req.headers.get("user-agent") ?? "";
  return createHash("sha256")
    .update((process.env.AUTH_SECRET ?? "") + "|" + ip + "|" + ua)
    .digest("hex");
}

export async function POST(req: Request) {
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: "Falta configurar el acceso en el servidor" },
      { status: 500 }
    );
  }

  const huella = huellaDe(req);
  try {
    const recientes = await prisma.intentoLogin.count({
      where: { huella, createdAt: { gte: new Date(Date.now() - VENTANA_MS) } },
    });
    if (recientes >= MAX_INTENTOS) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera 10 minutos e intenta otra vez." },
        { status: 429 }
      );
    }
  } catch {}

  let password = "";
  let elegida = 0;
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
    elegida = Number(body?.tiendaId) || 0;
  } catch {}

  const tiendaId = TIENDAS.find((id) => {
    if (elegida && id !== elegida) return false;
    const esperada = claveDe(id);
    return esperada !== "" && iguales(password, esperada);
  });

  if (!tiendaId) {
    try {
      await prisma.intentoLogin.create({ data: { huella } });
      await prisma.intentoLogin.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
    } catch {}
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  try {
    await prisma.intentoLogin.deleteMany({ where: { huella } });
  } catch {}

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
