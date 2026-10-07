import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tiendaActual } from "@/lib/tienda";

export const dynamic = "force-dynamic";

// Tienda de la sesión actual
export async function GET() {
  const id = await tiendaActual();
  const t = await prisma.tienda.findUnique({
    where: { id },
    select: { id: true, nombre: true },
  });
  return NextResponse.json(t ?? { id, nombre: "Tienda " + id });
}
