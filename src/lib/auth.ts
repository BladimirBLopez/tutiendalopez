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

export async function crearToken(): Promise<string> {
  const exp = String(Date.now() + DURACION_SEGUNDOS * 1000);
  return `${exp}.${await firmar(exp)}`;
}

export async function verificarToken(token?: string | null): Promise<boolean> {
  try {
    if (!token) return false;
    const [exp, firma] = token.split(".");
    if (!exp || !firma) return false;
    const n = Number(exp);
    if (!Number.isFinite(n) || n < Date.now()) return false;
    const esperada = await firmar(exp);
    if (esperada.length !== firma.length) return false;
    let diff = 0;
    for (let i = 0; i < esperada.length; i++) {
      diff |= esperada.charCodeAt(i) ^ firma.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
