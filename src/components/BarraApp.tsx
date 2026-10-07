"use client";

import { useEffect, useState } from "react";

export type Seccion = "vender" | "productos" | "ventas" | "ganancias";

function IconStore({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M5 13v7h14v-7" />
      <path d="M9 20v-6h6v6" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    </svg>
  );
}

function IconCart({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="20" r="1" />
      <circle cx="19" cy="20" r="1" />
      <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.6L22 7H6" />
    </svg>
  );
}

function IconPackage({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 8l-9 5-9-5" />
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="M12 13v8" />
    </svg>
  );
}

function IconReceipt({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </svg>
  );
}

function IconChart({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function IconLogout({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </svg>
  );
}

const SECCIONES = [
  { id: "vender" as const, nombre: "Caja", Icono: IconCart },
  { id: "productos" as const, nombre: "Productos", Icono: IconPackage },
  { id: "ventas" as const, nombre: "Ventas", Icono: IconReceipt },
  { id: "ganancias" as const, nombre: "Ganancias", Icono: IconChart },
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-sm">
            <IconStore className="h-6 w-6" />
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 transition active:scale-95 active:bg-gray-200"
          >
            <IconLogout className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-2xl pb-[max(0.3rem,env(safe-area-inset-bottom))]">
          {SECCIONES.map((s) => {
            const activo = actual === s.id;
            const Icono = s.Icono;

            return (
              <button
                key={s.id}
                onClick={() => onIr(s.id)}
                aria-current={activo ? "page" : undefined}
                className={
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-bold transition active:scale-95 " +
                  (activo ? "text-green-700" : "text-gray-500")
                }
              >
                <span
                  className={
                    "flex h-9 w-12 items-center justify-center rounded-2xl transition " +
                    (activo ? "bg-green-100" : "")
                  }
                >
                  <Icono className="h-[21px] w-[21px]" />
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
