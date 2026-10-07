"use client";

import { useCallback, useEffect, useState } from "react";

type Detalle = {
  id: number;
  nombre: string;
  barcode: string | null;
  precioCompra: string;
  precioVenta: string;
  ganancia: string;
  stock: number;
  stockMinimo: number;
  vencimiento: string | null;
  createdAt: string;
  unidadesVendidas: number;
  gananciaTotal: number;
  ultimaVenta: string | null;
};

const campo = "mt-1 w-full rounded-lg border border-gray-300 p-3 text-base";
const etiqueta = "block text-sm text-gray-600";
const bs = (v: string | number) => "Bs. " + Number(v).toFixed(2);
const redondear = (n: number) => Math.round(n * 100) / 100;
const num = (s: string) => (s.trim() === "" ? 0 : Number(s) || 0);

function fechaSolo(iso: string | null) {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d + "/" + m + "/" + y;
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-2">
      <span className="text-gray-500">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}

export default function DetalleProducto({
  id,
  onClose,
  onCambio,
  onCompra,
}: {
  id: number;
  onClose: () => void;
  onCambio: () => void;
  onCompra: () => void;
}) {
  const [d, setD] = useState<Detalle | null>(null);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [f, setF] = useState({
    nombre: "",
    barcode: "",
    precioCompra: "",
    ganancia: "",
    precioVenta: "",
    stock: "",
    stockMinimo: "",
    vencimiento: "",
  });

  const cargar = useCallback(async () => {
    const res = await fetch("/api/productos/" + id);
    if (!res.ok) {
      setError("No se pudo cargar el producto");
      return;
    }
    setD(await res.json());
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function eliminar() {
    if (!d) return;
    const vendido = Number(d.unidadesVendidas) > 0;
    const aviso = vendido
      ? "Este producto ya tiene ventas. Se va a quitar de la lista, pero el historial de ventas se conserva. ¿Eliminar?"
      : "¿Eliminar este producto? No se puede deshacer.";
    if (!confirm(aviso)) return;
    setError("");
    setGuardando(true);
    try {
      const res = await fetch("/api/productos/" + id, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo eliminar");
        setGuardando(false);
        return;
      }
      onCambio();
      onClose();
    } catch {
      setError("Sin conexión. Intenta otra vez.");
      setGuardando(false);
    }
  }

  function empezarEdicion() {
    if (!d) return;
    setF({
      nombre: d.nombre,
      barcode: d.barcode ?? "",
      precioCompra: String(Number(d.precioCompra)),
      ganancia: String(Number(d.ganancia)),
      precioVenta: String(Number(d.precioVenta)),
      stock: String(d.stock),
      stockMinimo: String(d.stockMinimo),
      vencimiento: d.vencimiento ? d.vencimiento.slice(0, 10) : "",
    });
    setError("");
    setEditando(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    const res = await fetch("/api/productos/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setEditando(false);
    await cargar();
    onCambio();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">
            {editando ? "Editar producto" : d ? d.nombre : "Cargando..."}
          </h2>
          <button onClick={onClose} className="rounded-full bg-gray-200 px-3 py-1 text-lg">
            ✕
          </button>
        </div>

        {error && <p className="mb-3 text-red-600">{error}</p>}

        {d && !editando && (
          <>
            <Fila k="Código de barras" v={d.barcode ?? "Sin código"} />
            <Fila k="Costo (lo que pagó)" v={bs(d.precioCompra)} />
            <Fila k="Ganancia por unidad" v={bs(d.ganancia)} />
            <Fila k="Precio de venta" v={bs(d.precioVenta)} />
            <Fila
              k="Stock"
              v={d.stock + " u." + (d.stock <= d.stockMinimo ? " (bajo)" : "")}
            />
            <Fila k="Stock mínimo" v={d.stockMinimo + " u."} />
            <Fila k="Vencimiento" v={fechaSolo(d.vencimiento)} />
            <Fila k="Invertido en el stock" v={bs(d.stock * Number(d.precioCompra))} />
            <Fila k="Si vende todo el stock" v={bs(d.stock * Number(d.precioVenta))} />
            <Fila k="Unidades vendidas" v={d.unidadesVendidas + " u."} />
            <Fila k="Ganancia obtenida" v={bs(d.gananciaTotal)} />
            <Fila
              k="Última venta"
              v={d.ultimaVenta ? new Date(d.ultimaVenta).toLocaleString("es-BO") : "Nunca"}
            />
            <Fila k="Registrado" v={new Date(d.createdAt).toLocaleDateString("es-BO")} />

            <div className="mt-4 flex gap-2">
              <button
                onClick={empezarEdicion}
                className="flex-1 rounded-lg bg-gray-200 p-3 font-semibold"
              >
                Editar
              </button>
              <button
                onClick={onCompra}
                className="flex-1 rounded-lg bg-blue-600 p-3 font-semibold text-white"
              >
                Compré más
              </button>
            </div>
            <button
              onClick={eliminar}
              disabled={guardando}
              className="mt-3 w-full rounded-lg p-3 font-semibold text-red-600 active:bg-red-50 disabled:opacity-50"
            >
              🗑️ Eliminar producto
            </button>
          </>
        )}

        {d && editando && (
          <form onSubmit={guardar} className="space-y-3">
            <label className={etiqueta}>
              Nombre
              <input
                className={campo}
                value={f.nombre}
                onChange={(e) => setF({ ...f, nombre: e.target.value })}
                required
              />
            </label>
            <label className={etiqueta}>
              Código de barras
              <input
                className={campo}
                value={f.barcode}
                onChange={(e) => setF({ ...f, barcode: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={etiqueta}>
                Costo
                <input
                  className={campo}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={f.precioCompra}
                  onChange={(e) =>
                    setF({
                      ...f,
                      precioCompra: e.target.value,
                      precioVenta: String(redondear(num(e.target.value) + num(f.ganancia))),
                    })
                  }
                />
              </label>
              <label className={etiqueta}>
                Ganancia (Bs.)
                <input
                  className={campo}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={f.ganancia}
                  onChange={(e) =>
                    setF({
                      ...f,
                      ganancia: e.target.value,
                      precioVenta: String(redondear(num(f.precioCompra) + num(e.target.value))),
                    })
                  }
                />
              </label>
              <label className={etiqueta + " col-span-2"}>
                Precio de venta
                <input
                  className={campo}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={f.precioVenta}
                  onChange={(e) =>
                    setF({
                      ...f,
                      precioVenta: e.target.value,
                      ganancia: String(redondear(num(e.target.value) - num(f.precioCompra))),
                    })
                  }
                  required
                />
              </label>
              <label className={etiqueta}>
                Stock
                <input
                  className={campo}
                  type="number"
                  inputMode="numeric"
                  value={f.stock}
                  onChange={(e) => setF({ ...f, stock: e.target.value })}
                />
              </label>
              <label className={etiqueta}>
                Stock mínimo
                <input
                  className={campo}
                  type="number"
                  inputMode="numeric"
                  value={f.stockMinimo}
                  onChange={(e) => setF({ ...f, stockMinimo: e.target.value })}
                />
              </label>
              <label className={etiqueta + " col-span-2"}>
                Fecha de vencimiento (opcional)
                <input
                  className={campo}
                  type="date"
                  value={f.vencimiento}
                  onChange={(e) => setF({ ...f, vencimiento: e.target.value })}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(false)}
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
        )}
      </div>
    </div>
  );
}
