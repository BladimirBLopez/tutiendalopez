import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

class VentaError extends Error {}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const metodoPago = body.metodoPago === "qr" ? "qr" : "efectivo";
  const pagoYapeId =
    metodoPago === "qr" &&
    body.pagoYapeId != null &&
    Number.isInteger(Number(body.pagoYapeId))
      ? Number(body.pagoYapeId)
      : null;

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

      // Marca el pago Yape como usado (una sola venta por pago)
      if (pagoYapeId !== null) {
        const usado = await tx.pagoYape.updateMany({
          where: { id: pagoYapeId, estado: "pendiente" },
          data: { estado: "usado" },
        });
        if (usado.count === 0) {
          throw new VentaError("Ese pago Yape ya fue usado");
        }
      }

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  // Día completo en hora de Bolivia (UTC-4)
  const desde = new Date(fecha + "T00:00:00-04:00");
  if (isNaN(desde.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);

  const ventas = await prisma.venta.findMany({
    where: { createdAt: { gte: desde, lt: hasta } },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });

  const r2 = (n: number) => Math.round(n * 100) / 100;
  const resumen = { cantidad: ventas.length, total: 0, ganancia: 0, efectivo: 0, qr: 0 };

  const lista = ventas.map((v) => {
    const total = Number(v.total);
    const ganancia = v.items.reduce(
      (s, it) => s + (Number(it.precioUnit) - Number(it.costoUnit)) * it.cantidad,
      0
    );
    resumen.total += total;
    resumen.ganancia += ganancia;
    if (v.metodoPago === "qr") resumen.qr += total;
    else resumen.efectivo += total;

    return {
      id: v.id,
      total,
      metodoPago: v.metodoPago,
      createdAt: v.createdAt,
      ganancia: r2(ganancia),
      items: v.items.map((it) => ({
        nombre: it.producto.nombre,
        cantidad: it.cantidad,
        precioUnit: Number(it.precioUnit),
      })),
    };
  });

  return NextResponse.json({
    resumen: {
      cantidad: resumen.cantidad,
      total: r2(resumen.total),
      ganancia: r2(resumen.ganancia),
      efectivo: r2(resumen.efectivo),
      qr: r2(resumen.qr),
    },
    ventas: lista,
  });
}
