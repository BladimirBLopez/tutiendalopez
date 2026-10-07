"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CobroModal from "@/components/CobroModal";
import BarcodeScanner from "@/components/BarcodeScanner";
import DetalleProducto from "@/components/DetalleProducto";
import ListaVentas from "@/components/ListaVentas";
import BarraApp from "@/components/BarraApp";

type Producto = {
  id: number;
  nombre: string;
  barcode: string | null;
  precioCompra: string;
  precioVenta: string;
  ganancia: string;
  stock: number;
  stockMinimo: number;
};

type Linea = { producto: Producto; cantidad: number };

type Compra = {
  id: number;
  nombre: string;
  ganancia: number;
  cantidad: string;
  costo: string;
  precio: string;
};

const formVacio = {
  nombre: "",
  barcode: "",
  precioCompra: "",
  ganancia: "",
  precioVenta: "",
  stock: "",
  stockMinimo: "5",
};

const campo = "w-full rounded-lg border border-gray-300 p-3 text-base";
const redondear = (n: number) => Math.round(n * 100) / 100;
const num = (s: string) => (s.trim() === "" ? 0 : Number(s) || 0);

export default function Home() {
  const [tab, setTab] = useState<"vender" | "productos" | "ventas">("vender");
  const [q, setQ] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [cobro, setCobro] = useState<"efectivo" | "qr" | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [camara, setCamara] = useState<"venta" | "codigo" | null>(null);
  const [nuevo, setNuevo] = useState<typeof formVacio | null>(null);
  const [compra, setCompra] = useState<Compra | null>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/productos?q=" + encodeURIComponent(q.trim()));
    if (res.ok) setProductos(await res.json());
  }, [q]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  function cambiarTab(t: "vender" | "productos" | "ventas") {
    setTab(t);
    setQ("");
    setError("");
    setOk("");
    setNuevo(null);
    setCompra(null);
  }

  function agregar(p: Producto) {
    setError("");
    setOk("");
    const actual = carrito.find((l) => l.producto.id === p.id)?.cantidad ?? 0;
    if (actual + 1 > p.stock) {
      setError(
        p.stock <= 0
          ? "Sin stock: " + p.nombre
          : "Solo hay " + p.stock + " de " + p.nombre
      );
      return;
    }
    setCarrito((prev) =>
      prev.some((l) => l.producto.id === p.id)
        ? prev.map((l) =>
            l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l
          )
        : [...prev, { producto: p, cantidad: 1 }]
    );
    setQ("");
    inputRef.current?.focus();
  }

  async function escanear(code: string) {
    const res = await fetch("/api/productos?q=" + encodeURIComponent(code));
    if (!res.ok) return;
    const data: Producto[] = await res.json();
    const p = data.find((x) => x.barcode === code);
    if (p) {
      agregar(p);
      return;
    }
    setQ("");
    setNuevo({ ...formVacio, barcode: code });
  }

  async function alEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || tab !== "vender") return;
    e.preventDefault();
    const code = q.trim();
    if (!code) return;
    if (/^\d{6,}$/.test(code)) await escanear(code);
    else if (productos.length === 1) agregar(productos[0]);
  }

  function cambiarCantidad(id: number, delta: number) {
    setError("");
    setCarrito((prev) =>
      prev
        .map((l) => {
          if (l.producto.id !== id) return l;
          const nueva = l.cantidad + delta;
          if (nueva > l.producto.stock) return l;
          return { ...l, cantidad: nueva };
        })
        .filter((l) => l.cantidad > 0)
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo) return;
    setError("");
    setGuardando(true);
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    setGuardando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setNuevo(null);
    if (tab === "vender") agregar(data as Producto);
    cargar();
  }

  function abrirCompra(p: Producto) {
    setError("");
    setOk("");
    setNuevo(null);
    setCompra({
      id: p.id,
      nombre: p.nombre,
      ganancia: Number(p.ganancia),
      cantidad: "",
      costo: "",
      precio: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarCompra(e: React.FormEvent) {
    e.preventDefault();
    if (!compra) return;
    setError("");
    setGuardando(true);
    const res = await fetch("/api/productos/" + compra.id + "/compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cantidad: compra.cantidad,
        costo: compra.costo,
        precioVenta: compra.precio,
      }),
    });
    setGuardando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar la compra");
      return;
    }
    setOk("Compra registrada: " + compra.nombre);
    setCompra(null);
    cargar();
  }

  const total =
    Math.round(
      carrito.reduce((s, l) => s + Number(l.producto.precioVenta) * l.cantidad, 0) * 100
    ) / 100;

  async function confirmarVenta(
    metodoPago: "efectivo" | "qr",
    pagoYapeId: number | null
  ): Promise<string | null> {
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metodoPago,
        pagoYapeId,
        items: carrito.map((l) => ({
          productoId: l.producto.id,
          cantidad: l.cantidad,
        })),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "No se pudo registrar la venta";
    }
    setCarrito([]);
    cargar();
    return null;
  }

  const etiqueta = "block text-sm text-gray-600";
  const conMargen = campo + " mt-1";

  const formNuevo = nuevo && (
    <form onSubmit={guardar} className="mb-4 space-y-3 rounded-lg border-2 border-green-600 p-4">
      <p className="font-semibold">
        {tab === "vender" ? "Producto nuevo: se agrega a la venta" : "Nuevo producto"}
      </p>
      <input
        className={campo}
        placeholder="Nombre del producto"
        value={nuevo.nombre}
        onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
        required
        autoFocus
      />
      <div className="flex gap-2">
        <input
          className={campo}
          placeholder="Código de barras (opcional)"
          value={nuevo.barcode}
          onChange={(e) => setNuevo({ ...nuevo, barcode: e.target.value })}
        />
        <button
          type="button"
          onClick={() => setCamara("codigo")}
          className="rounded-lg bg-gray-800 px-4 text-xl text-white"
        >
          📷
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={etiqueta}>
          Costo (lo que pagó)
          <input
            className={conMargen}
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={nuevo.precioCompra}
            onChange={(e) =>
              setNuevo({
                ...nuevo,
                precioCompra: e.target.value,
                precioVenta: String(redondear(num(e.target.value) + num(nuevo.ganancia))),
              })
            }
          />
        </label>
        <label className={etiqueta}>
          Ganancia por unidad (Bs.)
          <input
            className={conMargen}
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={nuevo.ganancia}
            onChange={(e) =>
              setNuevo({
                ...nuevo,
                ganancia: e.target.value,
                precioVenta: String(redondear(num(nuevo.precioCompra) + num(e.target.value))),
              })
            }
          />
        </label>
        <label className={etiqueta + " col-span-2"}>
          Precio de venta (se calcula solo)
          <input
            className={conMargen}
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={nuevo.precioVenta}
            onChange={(e) =>
              setNuevo({
                ...nuevo,
                precioVenta: e.target.value,
                ganancia: String(redondear(num(e.target.value) - num(nuevo.precioCompra))),
              })
            }
            required
          />
        </label>
        <label className={etiqueta}>
          Stock (cuántos hay)
          <input
            className={conMargen}
            type="number"
            inputMode="numeric"
            value={nuevo.stock}
            onChange={(e) => setNuevo({ ...nuevo, stock: e.target.value })}
            required
          />
        </label>
        <label className={etiqueta}>
          Stock mínimo
          <input
            className={conMargen}
            type="number"
            inputMode="numeric"
            value={nuevo.stockMinimo}
            onChange={(e) => setNuevo({ ...nuevo, stockMinimo: e.target.value })}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setNuevo(null)}
          className="flex-1 rounded-lg bg-gray-200 p-3 font-semibold"
        >
          Cancelar
        </button>
        <button
          disabled={guardando}
          className="flex-1 rounded-lg bg-green-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );

  const formCompra = compra && (
    <form onSubmit={guardarCompra} className="mb-4 space-y-3 rounded-lg border-2 border-blue-600 p-4">
      <p className="font-semibold">Compré más: {compra.nombre}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className={etiqueta}>
          Cantidad que compré
          <input
            className={conMargen}
            type="number"
            inputMode="numeric"
            value={compra.cantidad}
            onChange={(e) => setCompra({ ...compra, cantidad: e.target.value })}
            required
            autoFocus
          />
        </label>
        <label className={etiqueta}>
          Costo nuevo (c/u)
          <input
            className={conMargen}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={compra.costo}
            onChange={(e) =>
              setCompra({
                ...compra,
                costo: e.target.value,
                precio:
                  e.target.value === ""
                    ? ""
                    : String(redondear(num(e.target.value) + compra.ganancia)),
              })
            }
            required
          />
        </label>
        <label className={etiqueta + " col-span-2"}>
          Precio de venta sugerido (puedes cambiarlo)
          <input
            className={conMargen}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={compra.precio}
            onChange={(e) => setCompra({ ...compra, precio: e.target.value })}
          />
        </label>
      </div>
      <p className="text-sm text-gray-600">
        Ganancia: Bs. {redondear(num(compra.precio) - num(compra.costo)).toFixed(2)} por unidad
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCompra(null)}
          className="flex-1 rounded-lg bg-gray-200 p-3 font-semibold"
        >
          Cancelar
        </button>
        <button
          disabled={guardando}
          className="flex-1 rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar compra"}
        </button>
      </div>
    </form>
  );

  async function salir() {
    if (!confirm("¿Cerrar sesión?")) return;
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  if (tab === "ventas") {
    return (
      <main className="mx-auto max-w-2xl pb-8">
        <BarraApp actual="ventas" onIr={cambiarTab} onSalir={salir} />
        <ListaVentas />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl pb-72">
      <BarraApp actual={tab} onIr={cambiarTab} onSalir={salir} />

      <div className="p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={alEnter}
            placeholder={
              tab === "vender" ? "Escribe el nombre o escanea" : "Buscar producto"
            }
            className={campo}
          />
          {tab === "vender" && (
            <button
              onClick={() => setCamara("venta")}
              className="rounded-lg bg-gray-800 px-4 text-2xl text-white"
            >
              📷
            </button>
          )}
        </div>

        {camara && (
          <BarcodeScanner
            onScan={(c) =>
              camara === "venta"
                ? escanear(c)
                : setNuevo((f) => (f ? { ...f, barcode: c } : f))
            }
            onClose={() => setCamara(null)}
          />
        )}

        {error && <p className="mt-3 text-red-600">{error}</p>}
        {ok && <p className="mt-3 font-semibold text-green-700">{ok}</p>}

        <div className="mt-3">
          {formNuevo}
          {formCompra}
        </div>

        {tab === "vender" ? (
          <>
            {q.trim() && (
              <ul className="space-y-1 rounded-lg border p-2">
                {productos.slice(0, 8).map((p) => (
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
                {productos.length === 0 && (
                  <li className="p-2 text-gray-500">No encontrado</li>
                )}
              </ul>
            )}

            <ul className="mt-4 space-y-2">
              {carrito.map((l) => (
                <li
                  key={l.producto.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
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
              {carrito.length === 0 && !q.trim() && (
                <p className="py-6 text-center text-gray-500">
                  Escanea o busca un producto para empezar
                </p>
              )}
            </ul>
          </>
        ) : (
          <>
            {!nuevo && !compra && (
              <button
                onClick={() => setNuevo(formVacio)}
                className="mb-4 w-full rounded-lg bg-green-600 p-3 text-lg font-semibold text-white"
              >
                + Nuevo producto
              </button>
            )}
            <ul className="space-y-2">
              {productos.map((p) => {
                const bajo = p.stock <= p.stockMinimo;
                return (
                  <li key={p.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{p.nombre}</p>
                        <p className="text-sm text-gray-500">
                          Vende Bs. {Number(p.precioVenta).toFixed(2)} · gana Bs.{" "}
                          {Number(p.ganancia).toFixed(2)}
                        </p>
                        {p.barcode && (
                          <p className="text-xs text-gray-400">{p.barcode}</p>
                        )}
                      </div>
                      <span
                        className={
                          "rounded-full px-3 py-1 text-sm font-semibold " +
                          (bajo ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")
                        }
                      >
                        {p.stock} u.
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setDetalle(p.id)}
                        className="flex-1 rounded-lg bg-gray-100 p-2 text-sm font-semibold text-gray-700"
                      >
                        Ver detalles
                      </button>
                      <button
                        onClick={() => abrirCompra(p)}
                        className="flex-1 rounded-lg bg-blue-50 p-2 text-sm font-semibold text-blue-700"
                      >
                        Compré más
                      </button>
                    </div>
                  </li>
                );
              })}
              {productos.length === 0 && (
                <p className="py-6 text-center text-gray-500">No hay productos</p>
              )}
            </ul>
          </>
        )}
      </div>

      {tab === "vender" && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xs text-gray-400">
                  {carrito.reduce((s, l) => s + l.cantidad, 0)} producto(s)
                </p>
              </div>
              <span className="text-4xl font-extrabold tabular-nums">Bs. {total.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCobro("efectivo")}
                disabled={carrito.length === 0}
                className="flex-1 rounded-xl bg-emerald-600 p-4 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => setCobro("qr")}
                disabled={carrito.length === 0}
                className="flex-1 rounded-xl bg-purple-600 p-4 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
              >
                📱 QR Yape
              </button>
            </div>
          </div>
        </div>
      )}
      {cobro !== null && (
        <CobroModal
          key={cobro}
          modo={cobro}
          total={total}
          onConfirmar={confirmarVenta}
          onCerrar={() => {
            setCobro(null);
            inputRef.current?.focus();
          }}
        />
      )}
      {detalle !== null && (
        <DetalleProducto
          id={detalle}
          onClose={() => setDetalle(null)}
          onCambio={cargar}
          onCompra={() => {
            const p = productos.find((x) => x.id === detalle);
            setDetalle(null);
            if (p) abrirCompra(p);
          }}
        />
      )}
    </main>
  );
}
