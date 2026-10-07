"use client";

import { useState } from "react";

export default function LoginTienda({
  id,
  slug,
  nombre,
}: {
  id: number;
  slug: string;
  nombre: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!password || cargando) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiendaId: id, password }),
      });
      if (res.ok) {
        try {
          localStorage.setItem("tienda", slug);
        } catch {}
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo entrar");
    } catch {
      setError("Sin conexión. Intenta otra vez.");
    }
    setCargando(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4"
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-green-600 text-white text-3xl font-bold flex items-center justify-center">
            {nombre.charAt(0)}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-800">{nombre}</h1>
          <p className="text-gray-500">Escribe tu contraseña para entrar</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          autoFocus
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-green-600"
        />

        {error && (
          <p className="text-red-600 text-center font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={cargando || !password}
          className="w-full bg-green-600 text-white text-xl font-bold rounded-xl py-4 disabled:opacity-50"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
