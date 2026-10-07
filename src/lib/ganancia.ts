export type Rango = { desde: number; ganancia: number };

// Devuelve la ganancia en Bs. que corresponde a un costo.
// Toma el rango más alto cuyo "desde" sea menor o igual al costo.
export function gananciaPara(costo: number, rangos: Rango[]): number {
  if (!Number.isFinite(costo) || costo < 0) return 0;
  const ordenados = [...rangos].sort((a, b) => a.desde - b.desde);
  let g = 0;
  for (const r of ordenados) {
    if (costo >= r.desde) g = r.ganancia;
  }
  return g;
}
