import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rangos = await prisma.rangoGanancia.findMany({
    orderBy: { desde: "asc" },
    select: { desde: true, ganancia: true },
  });
  return NextResponse.json(rangos);
}

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const lista = (body as { rangos?: unknown })?.rangos;
  if (!Array.isArray(lista) || lista.length === 0) {
    return NextResponse.json({ error: "Falta la lista de rangos" }, { status: 400 });
  }

  const rangos = lista.map((r) => ({
    desde: Number((r as { desde?: unknown })?.desde),
    ganancia: Number((r as { ganancia?: unknown })?.ganancia),
  }));

  if (rangos.some((r) => !Number.isFinite(r.desde) || !Number.isFinite(r.ganancia) || r.desde < 0 || r.ganancia < 0)) {
    return NextResponse.json({ error: "Hay números inválidos" }, { status: 400 });
  }
  if (new Set(rangos.map((r) => r.desde)).size !== rangos.length) {
    return NextResponse.json({ error: "Hay dos rangos que empiezan igual" }, { status: 400 });
  }
  if (!rangos.some((r) => r.desde === 0)) {
    return NextResponse.json({ error: "Debe haber un rango que empiece en 0" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.rangoGanancia.deleteMany(),
    prisma.rangoGanancia.createMany({ data: rangos }),
  ]);

  return NextResponse.json({ ok: true });
}
