"use client";

import { useEffect, useState } from "react";

export type Seccion = "vender" | "productos" | "ventas" | "ganancias";

const SECCIONES: { id: Seccion; nombre: string; icono: string }[] = [
  { id: "vender", nombre: "Vender", icono: "🛒" },
  { id: "productos", nombre: "Productos", icono: "📦" },
  { id: "ventas", nombre: "Ventas del día", icono: "📊" },
  { id: "ganancias", nombre: "Mis ganancias", icono: "💰" },
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
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  const titulo = SECCIONES.find((s) => s.id === actual)?.nombre ?? "Tu Tienda López";

  function ir(s: Seccion) {
    setAbierto(false);
    onIr(s);
  }

  function salir() {
    setAbierto(false);
    onSalir();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-green-600 px-2 py-2 text-white shadow">
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="flex h-12 w-12 items-center justify-center rounded-xl text-3xl active:bg-green-700"
        >
          ☰
        </button>
        <h1 className="text-xl font-bold">{titulo}</h1>
      </header>

      {abierto && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAbierto(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center gap-3 bg-green-600 p-4 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg font-bold text-green-700">
                TL
              </div>
              <div className="text-lg font-bold leading-tight">Tu Tienda López</div>
            </div>

            <nav className="flex-1 p-2">
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => ir(s.id)}
                  className={
                    "flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-lg font-semibold " +
                    (actual === s.id
                      ? "bg-green-100 text-green-800"
                      : "text-gray-700 active:bg-gray-100")
                  }
                >
                  <span className="text-2xl">{s.icono}</span>
                  {s.nombre}
                </button>
              ))}
            </nav>

            <div className="border-t p-2">
              <button
                onClick={salir}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-lg font-semibold text-red-600 active:bg-red-50"
              >
                <span className="text-2xl">🚪</span>
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
