"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CobroModal from "@/components/CobroModal";
import BarcodeScanner from "@/components/BarcodeScanner";
import DetalleProducto from "@/components/DetalleProducto";
import ListaVentas from "@/components/ListaVentas";
import BarraApp from "@/components/BarraApp";
import MisGanancias from "@/components/MisGanancias";
import { ScanBarcode, Banknote, QrCode, Trash2 } from "lucide-react";

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

const campo = "w-full rounded-xl border border-gray-200 bg-white p-3.5 text-base shadow-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100";
const redondear = (n: number) => Math.round(n * 100) / 100;
const num = (s: string) => (s.trim() === "" ? 0 : Number(s) || 0);

export default function Home() {
  const [tab, setTab] = useState<"vender" | "productos" | "ventas" | "ganancias">("vender");
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
  const [editarCantidad, setEditarCantidad] = useState<number | null>(null);
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

  function cambiarTab(t: "vender" | "productos" | "ventas" | "ganancias") {
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

  const lineaEditada =
    editarCantidad !== null
      ? carrito.find((l) => l.producto.id === editarCantidad) ?? null
      : null;

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
          <ScanBarcode size={24} strokeWidth={2.2} />
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
      <p className="font-semibold">Agregar stock: {compra.nombre}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className={etiqueta}>
          Cantidad
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
          Costo por unidad
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
          Nuevo precio de venta
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
          {guardando ? "Guardando..." : "Guardar stock"}
        </button>
      </div>
    </form>
  );

  async function salir() {
    if (!confirm("¿Cerrar sesión?")) return;
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  if (tab === "ganancias") {
    return (
      <main className="mx-auto max-w-2xl pb-28">
        <BarraApp actual="ganancias" onIr={cambiarTab} onSalir={salir} />
        <MisGanancias />
      </main>
    );
  }

  if (tab === "ventas") {
    return (
      <main className="mx-auto max-w-2xl pb-28">
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
              tab === "vender" ? "Buscar producto o escanear código" : "Buscar producto"
            }
            className={campo}
          />
          {tab === "vender" && (
            <button
              onClick={() => setCamara("venta")}
              className="rounded-xl bg-gray-900 px-4 text-2xl text-white shadow-sm active:scale-95"
            >
              <ScanBarcode size={24} strokeWidth={2.2} />
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

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}
        {ok && (
          <div className="mt-3 rounded-xl bg-green-50 p-3 font-semibold text-green-700">
            ✓ {ok}
          </div>
        )}

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
                      className="flex w-full items-center justify-between rounded-xl p-3 text-left active:bg-green-50"
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
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setEditarCantidad(l.producto.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left active:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-gray-900">
                        {l.producto.nombre}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {l.cantidad} {l.cantidad === 1 ? "unidad" : "unidades"} · Bs.{" "}
                        {Number(l.producto.precioVenta).toFixed(2)} c/u
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-extrabold tabular-nums text-gray-900">
                        Bs. {(Number(l.producto.precioVenta) * l.cantidad).toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-green-700">
                        Cambiar cantidad ›
                      </p>
                    </div>
                  </button>
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
                className="mb-4 w-full rounded-xl bg-green-600 p-3.5 text-lg font-bold text-white shadow-sm active:scale-[0.99]"
              >
                + Nuevo producto
              </button>
            )}
            <ul className="space-y-2">
              {productos.map((p) => {
                const bajo = p.stock <= p.stockMinimo;
                return (
                  <li key={p.id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
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
        <div className="fixed inset-x-0 bottom-20 z-30 border-t border-gray-200 bg-white p-4 shadow-2xl">
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 p-4 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
              >
                <Banknote size={22} strokeWidth={2.3} />
                <span>Cobrar efectivo</span>
              </button>
              <button
                onClick={() => setCobro("qr")}
                disabled={carrito.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 p-4 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
              >
                <QrCode size={22} strokeWidth={2.3} />
                <span>Cobrar QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {lineaEditada && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => {
            setEditarCantidad(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-green-700">
                  Editar cantidad
                </p>
                <h2 className="mt-1 truncate text-2xl font-extrabold text-gray-900">
                  {lineaEditada.producto.nombre}
                </h2>
                <p className="mt-1 text-gray-500">
                  Bs. {Number(lineaEditada.producto.precioVenta).toFixed(2)} por unidad
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditarCantidad(null);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 rounded-2xl bg-gray-50 p-5">
              <button
                type="button"
                onClick={() => {
                  if (lineaEditada.cantidad === 1) {
                    if (
                      confirm(
                        "¿Quitar " +
                          lineaEditada.producto.nombre +
                          " de la venta?"
                      )
                    ) {
                      setCarrito((prev) =>
                        prev.filter(
                          (l) => l.producto.id !== lineaEditada.producto.id
                        )
                      );
                      setEditarCantidad(null);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }
                    return;
                  }

                  cambiarCantidad(lineaEditada.producto.id, -1);
                }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl font-bold text-gray-800 shadow-sm ring-1 ring-gray-200 active:scale-95"
              >
                −
              </button>

              <div className="min-w-20 text-center">
                <p className="text-5xl font-black tabular-nums text-gray-900">
                  {lineaEditada.cantidad}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {lineaEditada.cantidad === 1 ? "unidad" : "unidades"}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  lineaEditada.cantidad >= lineaEditada.producto.stock
                }
                onClick={() =>
                  cambiarCantidad(lineaEditada.producto.id, 1)
                }
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600 text-4xl font-bold text-white shadow-sm active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
              >
                +
              </button>
            </div>

            {lineaEditada.cantidad >= lineaEditada.producto.stock && (
              <p className="mt-3 text-center text-sm font-semibold text-amber-700">
                Stock disponible: {lineaEditada.producto.stock}
              </p>
            )}

            <div className="my-5 flex items-center justify-between rounded-2xl bg-green-50 p-4">
              <span className="font-semibold text-green-900">
                Subtotal
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-green-800">
                Bs.{" "}
                {(
                  Number(lineaEditada.producto.precioVenta) *
                  lineaEditada.cantidad
                ).toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (
                  !confirm(
                    "¿Quitar " +
                      lineaEditada.producto.nombre +
                      " de la venta?"
                  )
                )
                  return;

                setCarrito((prev) =>
                  prev.filter(
                    (l) => l.producto.id !== lineaEditada.producto.id
                  )
                );
                setEditarCantidad(null);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 p-3.5 font-bold text-red-700 active:bg-red-100"
            >
              <Trash2 size={20} strokeWidth={2.2} />
              <span>Quitar producto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditarCantidad(null);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="w-full rounded-2xl bg-green-600 p-4 text-xl font-extrabold text-white shadow-sm active:scale-[0.99]"
            >
              Listo · seguir agregando
            </button>
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
