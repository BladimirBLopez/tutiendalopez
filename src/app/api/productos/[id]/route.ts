import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const productoId = Number(id);
  if (!Number.isInteger(productoId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const producto = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!producto || !producto.activo) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const items = await prisma.itemVenta.findMany({
    where: { productoId },
    orderBy: { id: "desc" },
    take: 1000,
    select: {
      cantidad: true,
      precioUnit: true,
      costoUnit: true,
      venta: { select: { createdAt: true } },
    },
  });

  let unidadesVendidas = 0;
  let gananciaTotal = 0;
  for (const it of items) {
    unidadesVendidas += it.cantidad;
    gananciaTotal += (Number(it.precioUnit) - Number(it.costoUnit)) * it.cantidad;
  }

  return NextResponse.json({
    ...producto,
    unidadesVendidas,
    gananciaTotal: Math.round(gananciaTotal * 100) / 100,
    ultimaVenta: items[0]?.venta.createdAt ?? null,
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const productoId = Number(id);
  if (!Number.isInteger(productoId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Prisma.ProductoUpdateInput = {};

  if (body.nombre !== undefined) {
    const n = String(body.nombre).trim();
    if (!n) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    data.nombre = n;
  }

  if (body.barcode !== undefined) {
    const b = String(body.barcode).trim();
    data.barcode = b || null;
  }

  for (const k of ["precioCompra", "ganancia", "precioVenta"] as const) {
    if (body[k] !== undefined && body[k] !== "") {
      const v = Number(body[k]);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "Valor inválido en " + k }, { status: 400 });
      }
      data[k] = v;
    }
  }

  for (const k of ["stock", "stockMinimo"] as const) {
    if (body[k] !== undefined && body[k] !== "") {
      const v = Math.trunc(Number(body[k]));
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "Valor inválido en " + k }, { status: 400 });
      }
      data[k] = v;
    }
  }

  if (body.vencimiento !== undefined) {
    if (body.vencimiento) {
      const fecha = new Date(body.vencimiento);
      if (isNaN(fecha.getTime())) {
        return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
      }
      data.vencimiento = fecha;
    } else {
      data.vencimiento = null;
    }
  }

  try {
    const actualizado = await prisma.producto.update({
      where: { id: productoId },
      data,
    });
    return NextResponse.json(actualizado);
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Ese código de barras ya existe" }, { status: 409 });
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const productoId = Number(id);
  if (!Number.isInteger(productoId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const ventas = await prisma.itemVenta.count({ where: { productoId } });

    if (ventas === 0) {
      await prisma.producto.delete({ where: { id: productoId } });
      return NextResponse.json({ ok: true, archivado: false });
    }

    await prisma.producto.update({
      where: { id: productoId },
      data: { activo: false, barcode: null },
    });
    return NextResponse.json({ ok: true, archivado: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
}
