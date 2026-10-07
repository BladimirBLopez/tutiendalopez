"use client";

import { useEffect, useState } from "react";
import { TIENDAS_WEB } from "@/lib/tiendas";

export default function LoginPage() {
  const [sinTienda, setSinTienda] = useState(false);

  // Lleva directo al acceso de la última tienda usada en este celular
  useEffect(() => {
    let slug = "";
    try {
      slug = localStorage.getItem("tienda") ?? "";
    } catch {}
    if (TIENDAS_WEB.some((t) => t.slug === slug)) {
      window.location.replace("/" + slug);
    } else {
      setSinTienda(true);
    }
  }, []);

  if (!sinTienda) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-green-600 text-white text-2xl font-bold flex items-center justify-center">
          TL
        </div>
        <h1 className="mt-3 text-2xl font-bold text-gray-800">Tu Tienda</h1>
        <p className="text-gray-500">Abre el enlace de acceso de tu tienda para entrar.</p>
      </div>
    </main>
  );
}
