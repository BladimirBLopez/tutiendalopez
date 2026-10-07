import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const productos = await prisma.producto.findMany({
    where: {
      activo: true,
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { barcode: q },
            ],
          }
        : {}),
    },
    orderBy: { nombre: "asc" },
    take: 200,
  });

  return NextResponse.json(productos);
}

export async function POST(req: Request) {
  const body = await req.json();
  const nombre = String(body.nombre ?? "").trim();
  const precioVenta = Number(body.precioVenta);
  const precioCompra = Number(body.precioCompra ?? 0);
  const stock = Math.trunc(Number(body.stock ?? 0));
  const stockMinimo = Math.trunc(Number(body.stockMinimo ?? 5));
  const barcode = body.barcode ? String(body.barcode).trim() : null;
  const ganancia = Number(body.ganancia ?? 0);

  if (!nombre || !Number.isFinite(precioVenta) || precioVenta < 0) {
    return NextResponse.json(
      { error: "Nombre y precio de venta son obligatorios" },
      { status: 400 }
    );
  }

  try {
    const producto = await prisma.producto.create({
      data: {
        nombre,
        barcode,
        precioVenta,
        precioCompra: Number.isFinite(precioCompra) ? precioCompra : 0,
        ganancia: Number.isFinite(ganancia) ? ganancia : 0,
        stock: Number.isFinite(stock) ? stock : 0,
        stockMinimo: Number.isFinite(stockMinimo) ? stockMinimo : 5,
        vencimiento: body.vencimiento ? new Date(body.vencimiento) : null,
      },
    });
    return NextResponse.json(producto, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ese código de barras ya existe" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Error al crear el producto" }, { status: 500 });
  }
}
