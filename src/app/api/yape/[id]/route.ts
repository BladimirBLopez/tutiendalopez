import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Descartar un pago Yape (no corresponde a ninguna venta)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  const r = await prisma.pagoYape.updateMany({
    where: { id, estado: "pendiente" },
    data: { estado: "descartado" },
  });
  if (r.count === 0) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
