import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Lista pública de tiendas (solo nombres) para la pantalla de login
export async function GET() {
  const tiendas = await prisma.tienda.findMany({
    where: { id: { in: [1, 2] } },
    orderBy: { id: "asc" },
    select: { id: true, nombre: true },
  });
  return NextResponse.json(tiendas);
}
