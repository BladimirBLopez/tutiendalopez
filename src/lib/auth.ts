export const NOMBRE_COOKIE = "sesion";
export const DURACION_SEGUNDOS = 60 * 60 * 24 * 30; // 30 días

const enc = new TextEncoder();

async function firmar(datos: string): Promise<string> {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error("Falta AUTH_SECRET");
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(datos));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function crearToken(tiendaId: number): Promise<string> {
  const exp = String(Date.now() + DURACION_SEGUNDOS * 1000);
  const datos = `${tiendaId}.${exp}`;
  return `${datos}.${await firmar(datos)}`;
}

export async function leerSesion(token?: string | null): Promise<number | null> {
  try {
    if (!token) return null;
    const partes = token.split(".");
    if (partes.length !== 3) return null;
    const [t, exp, firma] = partes;
    const tiendaId = Number(t);
    const n = Number(exp);
    if (!Number.isInteger(tiendaId) || tiendaId <= 0) return null;
    if (!Number.isFinite(n) || n < Date.now()) return null;
    const esperada = await firmar(`${t}.${exp}`);
    if (esperada.length !== firma.length) return null;
    let diff = 0;
    for (let i = 0; i < esperada.length; i++) {
      diff |= esperada.charCodeAt(i) ^ firma.charCodeAt(i);
    }
    return diff === 0 ? tiendaId : null;
  } catch {
    return null;
  }
}

export async function verificarToken(token?: string | null): Promise<boolean> {
  return (await leerSesion(token)) !== null;
}
