"use client";

import { useEffect, useRef, useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";

type Producto = {
  id: number;
  nombre: string;
  barcode: string | null;
  precioVenta: string;
  stock: number;
};

type Linea = { producto: Producto; cantidad: number };

type PagoYape = {
  id: number;
  monto: number;
  remitente: string | null;
  createdAt: string;
};

export default function VenderPage() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [metodo, setMetodo] = useState<"efectivo" | "qr">("efectivo");
  const [recibido, setRecibido] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [cobrando, setCobrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [camara, setCamara] = useState(false);
  const [yapes, setYapes] = useState<PagoYape[]>([]);
  const [yapeSel, setYapeSel] = useState<number | null>(null);

  async function cargarYapes() {
    const res = await fetch("/api/yape", { cache: "no-store" });
    if (res.ok) setYapes(await res.json());
  }

  useEffect(() => {
    if (metodo !== "qr") {
      setYapeSel(null);
      return;
    }
    cargarYapes();
    const t = setInterval(cargarYapes, 4000);
    return () => clearInterval(t);
  }, [metodo]);

  async function descartarYape(id: number) {
    await fetch(`/api/yape/${id}`, { method: "DELETE" });
    if (yapeSel === id) setYapeSel(null);
    cargarYapes();
  }

  useEffect(() => {
    if (!q.trim()) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/productos?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResultados(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function agregar(p: Producto) {
    setError("");
    setOk("");
    if (p.stock <= 0) {
      setError(`Sin stock: ${p.nombre}`);
      return;
    }
    setCarrito((prev) => {
      const existe = prev.find((l) => l.producto.id === p.id);
      if (existe) {
        if (existe.cantidad >= p.stock) {
          setError(`Solo hay ${p.stock} de ${p.nombre}`);
          return prev;
        }
        return prev.map((l) =>
          l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l
        );
      }
      return [...prev, { producto: p, cantidad: 1 }];
    });
    setQ("");
    setResultados([]);
    inputRef.current?.focus();
  }

  async function alEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = q.trim();
    if (!code) return;
    const res = await fetch(`/api/productos?q=${encodeURIComponent(code)}`);
    if (!res.ok) return;
    const data: Producto[] = await res.json();
    const exacto = data.find((p) => p.barcode === code) ?? (data.length === 1 ? data[0] : null);
    if (exacto) agregar(exacto);
    else setError("Producto no encontrado");
  }

  async function escanearCodigo(code: string) {
    const res = await fetch("/api/productos?q=" + encodeURIComponent(code));
    if (!res.ok) return;
    const data: Producto[] = await res.json();
    const p = data.find((x) => x.barcode === code);
    if (p) agregar(p);
    else setError("Código " + code + " no registrado");
  }

  function cambiarCantidad(id: number, delta: number) {
    setError("");
    setCarrito((prev) =>
      prev
        .map((l) => {
          if (l.producto.id !== id) return l;
          const nueva = l.cantidad + delta;
          if (nueva > l.producto.stock) {
            setError(`Solo hay ${l.producto.stock} de ${l.producto.nombre}`);
            return l;
          }
          return { ...l, cantidad: nueva };
        })
        .filter((l) => l.cantidad > 0)
    );
  }

  const total =
    Math.round(
      carrito.reduce((s, l) => s + Number(l.producto.precioVenta) * l.cantidad, 0) * 100
    ) / 100;
  const vuelto = recibido ? Math.round((Number(recibido) - total) * 100) / 100 : null;

  async function cobrar() {
    if (carrito.length === 0 || cobrando) return;
    setError("");
    setOk("");
    setCobrando(true);
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metodoPago: metodo,
        pagoYapeId: metodo === "qr" ? yapeSel : null,
        items: carrito.map((l) => ({
          productoId: l.producto.id,
          cantidad: l.cantidad,
        })),
      }),
    });
    setCobrando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo registrar la venta");
      return;
    }
    setOk(`Venta registrada: Bs. ${total.toFixed(2)}`);
    setCarrito([]);
    setRecibido("");
    setYapeSel(null);
    if (metodo === "qr") cargarYapes();
    inputRef.current?.focus();
  }

  const campo = "w-full rounded-lg border border-gray-300 p-3 text-base";

  return (
    <main className="mx-auto max-w-2xl p-4 pb-40">
      <h1 className="mb-4 text-2xl font-bold">Vender</h1>

      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={alEnter}
        placeholder="Escanea el código o escribe el nombre"
        className={campo}
        autoFocus
      />

      <button
        onClick={() => setCamara(true)}
        className="mt-2 w-full rounded-lg bg-gray-800 p-3 font-semibold text-white"
      >
        📷 Escanear con cámara
      </button>
      {camara && (
        <BarcodeScanner
          onScan={escanearCodigo}
          onClose={() => setCamara(false)}
        />
      )}

      {resultados.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg border p-2">
          {resultados.slice(0, 8).map((p) => (
            <li key={p.id}>
              <button
                onClick={() => agregar(p)}
                className="flex w-full items-center justify-between rounded p-2 text-left active:bg-gray-100"
              >
                <span>{p.nombre}</span>
                <span className="text-sm text-gray-500">
                  Bs. {Number(p.precioVenta).toFixed(2)} · {p.stock} u.
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-red-600">{error}</p>}
      {ok && <p className="mt-3 font-semibold text-green-700">{ok}</p>}

      <ul className="mt-4 space-y-2">
        {carrito.map((l) => (
          <li key={l.producto.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-semibold">{l.producto.nombre}</p>
              <p className="text-sm text-gray-500">
                Bs. {(Number(l.producto.precioVenta) * l.cantidad).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => cambiarCantidad(l.producto.id, -1)}
                className="h-10 w-10 rounded-full bg-gray-200 text-xl"
              >
                -
              </button>
              <span className="w-6 text-center text-lg">{l.cantidad}</span>
              <button
                onClick={() => cambiarCantidad(l.producto.id, 1)}
                className="h-10 w-10 rounded-full bg-gray-200 text-xl"
              >
                +
              </button>
            </div>
          </li>
        ))}
        {carrito.length === 0 && (
          <p className="py-6 text-center text-gray-500">Agrega productos a la venta</p>
        )}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t bg-white p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg">Total</span>
            <span className="text-3xl font-bold">Bs. {total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMetodo("efectivo")}
              className={`flex-1 rounded-lg p-2 font-semibold ${
                metodo === "efectivo" ? "bg-green-600 text-white" : "bg-gray-200"
              }`}
            >
              Efectivo
            </button>
            <button
              onClick={() => setMetodo("qr")}
              className={`flex-1 rounded-lg p-2 font-semibold ${
                metodo === "qr" ? "bg-green-600 text-white" : "bg-gray-200"
              }`}
            >
              QR
            </button>
          </div>

          {metodo === "efectivo" && (
            <div className="flex items-center gap-3">
              <input
                className={campo}
                type="number"
                inputMode="decimal"
                placeholder="Recibido"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
              />
              {vuelto !== null && (
                <span
                  className={`whitespace-nowrap font-semibold ${
                    vuelto < 0 ? "text-red-600" : "text-gray-800"
                  }`}
                >
                  {vuelto < 0 ? "Falta" : "Vuelto"} Bs. {Math.abs(vuelto).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {metodo === "qr" && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
              {yapes.length === 0 && (
                <p className="py-2 text-center text-sm text-gray-500">
                  Esperando pago Yape...
                </p>
              )}
              {yapes.map((y) => {
                const coincide = Math.abs(y.monto - total) < 0.005;
                const sel = yapeSel === y.id;
                return (
                  <div
                    key={y.id}
                    className={`flex items-center gap-2 rounded p-2 ${
                      sel ? "bg-green-100 ring-2 ring-green-600" : "bg-gray-50"
                    }`}
                  >
                    <button
                      onClick={() => setYapeSel(sel ? null : y.id)}
                      className="flex-1 text-left"
                    >
                      <span className="font-semibold">Bs. {y.monto.toFixed(2)}</span>
                      <span className="ml-2 text-sm text-gray-600">
                        {y.remitente ?? "Yape"} ·{" "}
                        {new Date(y.createdAt).toLocaleTimeString("es-BO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {total > 0 && (
                        <span
                          className={`ml-2 text-sm font-semibold ${
                            coincide ? "text-green-700" : "text-amber-600"
                          }`}
                        >
                          {coincide ? "✓ coincide" : "≠ total"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => descartarYape(y.id)}
                      className="h-8 w-8 rounded-full bg-gray-200 text-sm"
                      aria-label="Descartar"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={cobrar}
            disabled={carrito.length === 0 || cobrando || (metodo === "qr" && yapeSel === null)}
            className="w-full rounded-lg bg-blue-600 p-4 text-xl font-bold text-white disabled:opacity-40"
          >
            {cobrando ? "Registrando..." : metodo === "qr" && yapeSel === null ? "Selecciona el pago Yape" : "Cobrar"}
          </button>
        </div>
      </div>
    </main>
  );
}
