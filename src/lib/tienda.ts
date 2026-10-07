import { cookies } from "next/headers";
import { NOMBRE_COOKIE, leerSesion } from "@/lib/auth";

export async function tiendaActual(): Promise<number> {
  const c = await cookies();
  const id = await leerSesion(c.get(NOMBRE_COOKIE)?.value);
  if (!id) throw new Error("Sin sesión");
  return id;
}
