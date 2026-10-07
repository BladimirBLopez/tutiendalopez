"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { nombre: string; cantidad: number; precioUnit: number };
type Venta = {
  id: number;
  total: number;
  metodoPago: string;
  createdAt: string;
  ganancia: number;
  items: Item[];
};
type Datos = {
  resumen: {
    cantidad: number;
    total: number;
    ganancia: number;
    efectivo: number;
    qr: number;
  };
  ventas: Venta[];
};

function fmt(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + dia;
}

function mover(fecha: string, dias: number) {
  const [y, m, d] = fecha.split("-").map(Number);
  return fmt(new Date(y, m - 1, d + dias));
}

const bs = (n: number) => "Bs. " + n.toFixed(2);

export default function ListaVentas() {
  const hoy = fmt(new Date());
  const [fecha, setFecha] = useState(hoy);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    const res = await fetch("/api/ventas?fecha=" + fecha, { cache: "no-store" });
    setCargando(false);
    if (!res.ok) {
      setError("No se pudieron cargar las ventas");
      return;
    }
    setDatos(await res.json());
    setAbierta(null);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const boton = "rounded-lg bg-gray-200 px-4 py-3 text-xl font-bold disabled:opacity-30";

  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setFecha(mover(fecha, -1))} className={boton}>
          ‹
        </button>
        <input
          type="date"
          value={fecha}
          max={hoy}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-3 text-center text-base"
        />
        <button
          onClick={() => setFecha(mover(fecha, 1))}
          disabled={fecha >= hoy}
          className={boton}
        >
          ›
        </button>
      </div>
      <p className="mt-1 text-center text-sm text-gray-500">
        {fecha === hoy ? "Hoy" : ""}
      </p>

      {error && <p className="mt-3 text-red-600">{error}</p>}

      {datos && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm text-gray-600">Vendido</p>
              <p className="text-2xl font-bold text-green-700">{bs(datos.resumen.total)}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm text-gray-600">Ganancia</p>
              <p className="text-2xl font-bold text-blue-700">{bs(datos.resumen.ganancia)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-600">Ventas</p>
              <p className="text-xl font-bold">{datos.resumen.cantidad}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p>Efectivo: <b>{bs(datos.resumen.efectivo)}</b></p>
              <p>QR: <b>{bs(datos.resumen.qr)}</b></p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {datos.ventas.map((v) => (
              <li key={v.id} className="rounded-lg border">
                <button
                  onClick={() => setAbierta(abierta === v.id ? null : v.id)}
                  className="flex w-full items-center justify-between p-3 text-left"
                >
                  <div>
                    <p className="font-semibold">
                      {new Date(v.createdAt).toLocaleTimeString("es-BO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {v.metodoPago === "qr" ? "QR" : "Efectivo"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {v.items.reduce((s, i) => s + i.cantidad, 0)} producto(s) · gana{" "}
                      {bs(v.ganancia)}
                    </p>
                  </div>
                  <span className="text-lg font-bold">{bs(v.total)}</span>
                </button>
                {abierta === v.id && (
                  <ul className="space-y-1 border-t bg-gray-50 p-3 text-sm">
                    {v.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span>
                          {it.cantidad} × {it.nombre}
                        </span>
                        <span>{bs(it.cantidad * it.precioUnit)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {datos.ventas.length === 0 && !cargando && (
              <p className="py-6 text-center text-gray-500">No hay ventas este día</p>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
