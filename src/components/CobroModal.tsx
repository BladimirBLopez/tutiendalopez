"use client";

import { useEffect, useRef, useState } from "react";

type PagoYape = {
  id: number;
  monto: number;
  remitente: string | null;
  createdAt: string;
};

type Props = {
  modo: "efectivo" | "qr";
  total: number;
  onConfirmar: (
    metodo: "efectivo" | "qr",
    pagoYapeId: number | null
  ) => Promise<string | null>;
  onCerrar: () => void;
};

const VENTANA_MS = 30 * 60 * 1000;
const BILLETES = [10, 20, 50, 100, 200];

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function CobroModal({ modo, total: totalInicial, onConfirmar, onCerrar }: Props) {
  const [total] = useState(totalInicial);
  const [estado, setEstado] = useState<"esperando" | "guardando" | "listo">("esperando");
  const [error, setError] = useState("");
  const [recibido, setRecibido] = useState("");
  const [pagos, setPagos] = useState<PagoYape[]>([]);
  const [detalle, setDetalle] = useState("");
  const [hayQr, setHayQr] = useState(true);

  const ocupado = useRef(false);
  const fallidos = useRef<Set<number>>(new Set());
  const confirmarRef = useRef(onConfirmar);
  const cerrarRef = useRef(onCerrar);
  useEffect(() => {
    confirmarRef.current = onConfirmar;
    cerrarRef.current = onCerrar;
  });

  async function confirmar(pagoId: number | null, quien: string) {
    if (ocupado.current) return;
    ocupado.current = true;
    setEstado("guardando");
    setError("");
    const err = await confirmarRef.current(modo, pagoId);
    if (err) {
      if (pagoId !== null) fallidos.current.add(pagoId);
      ocupado.current = false;
      setEstado("esperando");
      setError(err);
      return;
    }
    setDetalle(quien);
    setEstado("listo");
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
  }
  const confirmarFn = useRef(confirmar);
  useEffect(() => {
    confirmarFn.current = confirmar;
  });

  // Cierre automático tras el éxito
  useEffect(() => {
    if (estado !== "listo") return;
    const t = setTimeout(() => cerrarRef.current(), 1800);
    return () => clearTimeout(t);
  }, [estado]);

  // QR: busca el pago Yape que coincide con el total y confirma solo
  useEffect(() => {
    if (modo !== "qr" || estado !== "esperando") return;
    let vivo = true;
    async function revisar() {
      try {
        const res = await fetch("/api/yape", { cache: "no-store" });
        if (!res.ok || !vivo) return;
        const lista: PagoYape[] = await res.json();
        if (!vivo) return;
        const ahora = Date.now();
        const recientes = lista.filter(
          (p) =>
            !fallidos.current.has(p.id) &&
            ahora - new Date(p.createdAt).getTime() < VENTANA_MS
        );
        setPagos(recientes);
        const coincide = recientes
          .filter((p) => Math.abs(p.monto - total) < 0.005)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        if (coincide) confirmarFn.current(coincide.id, coincide.remitente ?? "Yape");
      } catch {
        // sin conexión: reintenta en el próximo ciclo
      }
    }
    revisar();
    const t = setInterval(revisar, 2000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [modo, estado, total]);

  const otros = pagos.filter((p) => Math.abs(p.monto - total) >= 0.005).slice(0, 3);

  const pago = recibido ? Number(recibido) : null;
  const diferencia = pago !== null ? r2(pago - total) : null;
  const puedeCobrar = estado === "esperando" && (pago === null || (diferencia ?? 0) >= 0);
  const rapidos = BILLETES.filter((b) => b > total).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl">
        {estado === "listo" ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-5xl text-green-600">
              ✓
            </div>
            <p className="mt-4 text-2xl font-bold">
              {modo === "qr" ? "¡Pago recibido!" : "¡Venta registrada!"}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-green-700">
              Bs. {total.toFixed(2)}
            </p>
            {detalle && <p className="mt-1 text-gray-500">{detalle}</p>}
            {modo === "efectivo" && diferencia !== null && diferencia > 0 && (
              <p className="mt-3 text-xl font-semibold">Vuelto: Bs. {diferencia.toFixed(2)}</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modo === "qr" ? "📱 Cobro con QR Yape" : "💵 Cobro en efectivo"}
              </h2>
              <button
                onClick={onCerrar}
                disabled={estado === "guardando"}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>

            <p className="text-center text-sm text-gray-500">Total a cobrar</p>
            <p className="mb-4 text-center text-5xl font-extrabold tabular-nums">
              Bs. {total.toFixed(2)}
            </p>

            {modo === "qr" ? (
              <div className="space-y-3">
                {hayQr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/qr-yape.png"
                    alt="QR Yape"
                    onError={() => setHayQr(false)}
                    className="mx-auto h-56 w-56 rounded-2xl border object-contain"
                  />
                )}
                <div className="flex items-center justify-center gap-3 rounded-xl bg-purple-50 p-3 text-purple-800">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-500 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-600" />
                  </span>
                  <span className="font-semibold">
                    {estado === "guardando" ? "Registrando venta..." : "Esperando pago Yape..."}
                  </span>
                </div>
                {otros.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    {otros.map((p) => (
                      <p key={p.id}>
                        Llegó Bs. {p.monto.toFixed(2)}
                        {p.remitente ? " de " + p.remitente : ""}: no coincide con el total
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  placeholder="¿Con cuánto paga?"
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && puedeCobrar) confirmar(null, "");
                  }}
                  className="w-full rounded-xl border border-gray-300 p-4 text-center text-2xl font-bold"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setRecibido(String(total))}
                    className="flex-1 rounded-xl bg-gray-100 p-3 font-semibold active:bg-gray-200"
                  >
                    Exacto
                  </button>
                  {rapidos.map((b) => (
                    <button
                      key={b}
                      onClick={() => setRecibido(String(b))}
                      className="flex-1 rounded-xl bg-gray-100 p-3 font-semibold active:bg-gray-200"
                    >
                      {b}
                    </button>
                  ))}
                </div>
                {diferencia !== null && (
                  <p
                    className={
                      "text-center text-2xl font-bold tabular-nums " +
                      (diferencia < 0 ? "text-red-600" : "text-green-700")
                    }
                  >
                    {diferencia < 0 ? "Falta" : "Vuelto"} Bs. {Math.abs(diferencia).toFixed(2)}
                  </p>
                )}
                <button
                  onClick={() => confirmar(null, "")}
                  disabled={!puedeCobrar}
                  className="w-full rounded-xl bg-emerald-600 p-4 text-xl font-bold text-white active:scale-95 disabled:opacity-40"
                >
                  {estado === "guardando" ? "Registrando..." : "Confirmar cobro"}
                </button>
              </div>
            )}

            {error && <p className="mt-3 text-center font-semibold text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
