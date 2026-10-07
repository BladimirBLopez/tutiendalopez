import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function aNumero(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function leerMonto(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const texto = v.trim();
  const conBs = texto.match(/Bs\.?\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (conBs) return aNumero(conBs[1]);
  const cualquiera = texto.match(/(\d+(?:[.,]\d{1,2})?)/);
  return cualquiera ? aNumero(cualquiera[1]) : null;
}

export async function POST(req: Request) {
  const clave = process.env.YAPE_KEY;
  if (!clave) {
    return NextResponse.json({ error: "Falta configurar YAPE_KEY" }, { status: 500 });
  }

  const enviada = req.headers.get("x-yape-key") ?? "";
  if (!iguales(enviada, clave)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await req.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {}
  console.log("YAPE RAW:", raw.slice(0, 300));

  const monto = leerMonto(body.monto ?? body.texto ?? raw);
  if (monto === null || monto <= 0 || monto > 100000) {
    return NextResponse.json({ error: "No se pudo leer el monto" }, { status: 400 });
  }

  const textoAviso = typeof body.texto === "string" ? body.texto : raw;
  const deTexto = textoAviso.match(/^(.*?)\s+te\s+envi/i)?.[1]?.trim();
  const crudo =
    typeof body.remitente === "string" && body.remitente.trim()
      ? body.remitente.trim()
      : deTexto || "";
  const remitente = crudo ? crudo.slice(0, 80) : null;

  const repetido = await prisma.pagoYape.findFirst({
    where: {
      monto,
      remitente,
      createdAt: { gte: new Date(Date.now() - 20000) },
    },
  });
  if (repetido) {
    return NextResponse.json({ ok: true, repetido: true });
  }

  await prisma.pagoYape.create({ data: { monto, remitente } });
  return NextResponse.json({ ok: true });
}
