"use client";

import { useEffect, useState } from "react";

type Tienda = { id: number; nombre: string };

export default function LoginPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [tiendaId, setTiendaId] = useState(0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tiendas", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const lista: Tienda[] = await res.json();
        setTiendas(lista);
        let guardada = 0;
        try {
          guardada = Number(localStorage.getItem("tienda")) || 0;
        } catch {}
        setTiendaId(lista.find((t) => t.id === guardada)?.id ?? lista[0]?.id ?? 0);
      } catch {
        setError("No se pudieron cargar las tiendas. Revisa tu conexión.");
      }
    })();
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !tiendaId || cargando) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiendaId, password }),
      });
      if (res.ok) {
        try {
          localStorage.setItem("tienda", String(tiendaId));
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
          <div className="mx-auto w-16 h-16 rounded-2xl bg-green-600 text-white text-2xl font-bold flex items-center justify-center">
            TL
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-800">Tu Tienda</h1>
          <p className="text-gray-500">Elige tu tienda y escribe tu contraseña</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tiendas.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTiendaId(t.id)}
              className={
                "rounded-xl border-2 py-4 text-lg font-bold " +
                (tiendaId === t.id
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 active:bg-gray-100")
              }
            >
              {t.nombre}
            </button>
          ))}
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-green-600"
        />

        {error && (
          <p className="text-red-600 text-center font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={cargando || !password || !tiendaId}
          className="w-full bg-green-600 text-white text-xl font-bold rounded-xl py-4 disabled:opacity-50"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
