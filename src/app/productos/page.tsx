"use client";

import { useCallback, useEffect, useState } from "react";

type Producto = {
  id: number;
  nombre: string;
  barcode: string | null;
  precioCompra: string;
  precioVenta: string;
  stock: number;
  stockMinimo: number;
};

const vacio = {
  nombre: "",
  barcode: "",
  precioCompra: "",
  precioVenta: "",
  stock: "",
  stockMinimo: "5",
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(vacio);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/productos?q=${encodeURIComponent(q)}`);
    if (res.ok) setProductos(await res.json());
  }, [q]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setForm(vacio);
    setMostrarForm(false);
    cargar();
  }

  const campo = "w-full rounded-lg border border-gray-300 p-3 text-base";

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Productos</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o escanear código"
        className={campo}
        autoFocus
      />

      <button
        onClick={() => setMostrarForm(!mostrarForm)}
        className="my-4 w-full rounded-lg bg-green-600 p-3 text-lg font-semibold text-white"
      >
        {mostrarForm ? "Cancelar" : "+ Nuevo producto"}
      </button>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 space-y-3 rounded-lg border p-4">
          <input
            className={campo}
            placeholder="Nombre del producto"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
          <input
            className={campo}
            placeholder="Código de barras (opcional)"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className={campo}
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="Precio compra"
              value={form.precioCompra}
              onChange={(e) => setForm({ ...form, precioCompra: e.target.value })}
            />
            <input
              className={campo}
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="Precio venta"
              value={form.precioVenta}
              onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
              required
            />
            <input
              className={campo}
              type="number"
              inputMode="numeric"
              placeholder="Stock"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
            <input
              className={campo}
              type="number"
              inputMode="numeric"
              placeholder="Stock mínimo"
              value={form.stockMinimo}
              onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
            />
          </div>
          {error && <p className="text-red-600">{error}</p>}
          <button
            disabled={guardando}
            className="w-full rounded-lg bg-blue-600 p-3 text-lg font-semibold text-white disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {productos.map((p) => {
          const bajo = p.stock <= p.stockMinimo;
          return (
            <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-semibold">{p.nombre}</p>
                <p className="text-sm text-gray-500">
                  Bs. {Number(p.precioVenta).toFixed(2)}
                  {p.barcode ? ` · ${p.barcode}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  bajo ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}
              >
                {p.stock} u.
              </span>
            </li>
          );
        })}
        {productos.length === 0 && (
          <p className="py-6 text-center text-gray-500">No hay productos todavía</p>
        )}
      </ul>
    </main>
  );
}
