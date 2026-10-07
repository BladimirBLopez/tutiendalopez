import { NextResponse } from "next/server";
import { tiendaActual } from "@/lib/tienda";
import { tiendaPorId } from "@/lib/tiendas";

export const dynamic = "force-dynamic";

// Tienda de la sesión actual
export async function GET() {
  const id = await tiendaActual();
  return NextResponse.json({
    id,
    nombre: tiendaPorId(id)?.nombre ?? "Tienda " + id,
  });
}
