import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

class VentaError extends Error {}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const metodoPago = body.metodoPago === "qr" ? "qr" : "efectivo";

  // Unir líneas repetidas y validar
  const cantidades = new Map<number, number>();
  for (const it of Array.isArray(body.items) ? body.items : []) {
    const id = Number(it.productoId);
    const cant = Math.trunc(Number(it.cantidad));
    if (!Number.isInteger(id) || !Number.isFinite(cant) || cant <= 0) {
      return NextResponse.json({ error: "Items inválidos" }, { status: 400 });
    }
    cantidades.set(id, (cantidades.get(id) ?? 0) + cant);
  }
  if (cantidades.size === 0) {
    return NextResponse.json({ error: "La venta está vacía" }, { status: 400 });
  }

  try {
    const venta = await prisma.$transaction(async (tx) => {
      const ids = [...cantidades.keys()];
      const productos = await tx.producto.findMany({
        where: { id: { in: ids }, activo: true },
      });
      if (productos.length !== ids.length) {
        throw new VentaError("Algún producto ya no existe");
      }

      let total = 0;
      const items = productos.map((p) => {
        const cantidad = cantidades.get(p.id)!;
        total += Number(p.precioVenta) * cantidad;
        return {
          productoId: p.id,
          cantidad,
          precioUnit: p.precioVenta,
          costoUnit: p.precioCompra,
        };
      });

      const creada = await tx.venta.create({
        data: { total, metodoPago, items: { create: items } },
      });

      // Descuenta stock solo si alcanza (seguro ante ventas simultáneas)
      for (const p of productos) {
        const cantidad = cantidades.get(p.id)!;
        const r = await tx.producto.updateMany({
          where: { id: p.id, stock: { gte: cantidad } },
          data: { stock: { decrement: cantidad } },
        });
        if (r.count === 0) {
          throw new VentaError(`Stock insuficiente: ${p.nombre}`);
        }
      }

      return creada;
    });

    return NextResponse.json(venta, { status: 201 });
  } catch (e) {
    if (e instanceof VentaError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al registrar la venta" }, { status: 500 });
  }
}
