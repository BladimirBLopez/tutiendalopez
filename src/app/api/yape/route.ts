import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tiendaActual } from "@/lib/tienda";

export const dynamic = "force-dynamic";

// Pagos Yape pendientes de las últimas 12 horas (protegido por la sesión del middleware)
export async function GET() {
  const tiendaId = await tiendaActual();
  const desde = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const pagos = await prisma.pagoYape.findMany({
    where: { tiendaId, estado: "pendiente", createdAt: { gte: desde } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(
    pagos.map((p) => ({
      id: p.id,
      monto: Number(p.monto),
      remitente: p.remitente,
      createdAt: p.createdAt,
    }))
  );
}
