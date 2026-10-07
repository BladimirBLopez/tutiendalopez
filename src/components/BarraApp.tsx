"use client";

import { useEffect, useState } from "react";

export type Seccion = "vender" | "productos" | "ventas" | "ganancias";

const SECCIONES: { id: Seccion; nombre: string; icono: string }[] = [
  { id: "vender", nombre: "Caja", icono: "🛒" },
  { id: "productos", nombre: "Productos", icono: "📦" },
  { id: "ventas", nombre: "Ventas", icono: "📊" },
  { id: "ganancias", nombre: "Ganancias", icono: "💰" },
];

export default function BarraApp({
  actual,
  onIr,
  onSalir,
}: {
  actual: Seccion;
  onIr: (s: Seccion) => void;
  onSalir: () => void;
}) {
  const [tienda, setTienda] = useState("");

  useEffect(() => {
    fetch("/api/tienda", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => {
        if (t?.nombre) setTienda(t.nombre);
      })
      .catch(() => {});
  }, []);

  const titulo =
    SECCIONES.find((s) => s.id === actual)?.nombre ?? "Tu Tienda López";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-base font-black text-white">
            TL
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold uppercase tracking-wider text-green-700">
              {tienda || "Tu Tienda López"}
            </p>
            <h1 className="truncate text-xl font-extrabold text-gray-900">
              {titulo}
            </h1>
          </div>

          <button
            onClick={onSalir}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-xl active:bg-gray-200"
          >
            🚪
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-2xl pb-[max(0.3rem,env(safe-area-inset-bottom))]">
          {SECCIONES.map((s) => {
            const activo = actual === s.id;

            return (
              <button
                key={s.id}
                onClick={() => onIr(s.id)}
                aria-current={activo ? "page" : undefined}
                className={
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-bold " +
                  (activo ? "text-green-700" : "text-gray-500")
                }
              >
                <span
                  className={
                    "flex h-9 w-12 items-center justify-center rounded-2xl text-xl " +
                    (activo ? "bg-green-100" : "")
                  }
                >
                  {s.icono}
                </span>
                <span className="truncate">{s.nombre}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
