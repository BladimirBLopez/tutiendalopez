import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productoId = Number(id);
  const body = await req.json().catch(() => ({}));

  const cantidad = Math.trunc(Number(body.cantidad));
  const costo = Number(body.costo);

  if (
    !Number.isInteger(productoId) ||
    !Number.isFinite(cantidad) ||
    cantidad <= 0 ||
    !Number.isFinite(costo) ||
    costo < 0
  ) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const p = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!p) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const precioPropio =
    body.precioVenta !== undefined && body.precioVenta !== ""
      ? Number(body.precioVenta)
      : null;
  if (precioPropio !== null && (!Number.isFinite(precioPropio) || precioPropio < 0)) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  const redondear = (n: number) => Math.round(n * 100) / 100;
  const precioVenta = redondear(precioPropio ?? costo + Number(p.ganancia));
  const ganancia = redondear(precioVenta - costo);

  const actualizado = await prisma.producto.update({
    where: { id: productoId },
    data: {
      stock: { increment: cantidad },
      precioCompra: costo,
      precioVenta,
      ganancia,
    },
  });

  return NextResponse.json(actualizado);
}
