"use client";

import { useEffect, useState } from "react";
import { gananciaPara } from "@/lib/ganancia";

type Fila = { desde: string; ganancia: string };

function num(s: string): number {
  return Number(s.trim().replace(",", "."));
}

export default function MisGanancias() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [prueba, setPrueba] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rangos");
        if (res.ok) {
          const data = (await res.json()) as {
            desde: string | number;
            ganancia: string | number;
          }[];
          setFilas(
            data.map((r) => ({
              desde: String(Number(r.desde)),
              ganancia: String(Number(r.ganancia)),
            }))
          );
        } else {
          setError("No se pudieron cargar las ganancias");
        }
      } catch {
        setError("Sin conexión. Intenta otra vez.");
      }
      setCargando(false);
    })();
  }, []);

  function cambiar(i: number, campo: keyof Fila, valor: string) {
    setOk("");
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  }

  function quitar(i: number) {
    setOk("");
    setFilas((fs) => fs.filter((_, j) => j !== i));
  }

  function agregar() {
    setOk("");
    setFilas((fs) => [...fs, { desde: "", ganancia: "" }]);
  }

  const validos = filas
    .filter((f) => f.desde.trim() !== "" && f.ganancia.trim() !== "")
    .map((f) => ({ desde: num(f.desde), ganancia: num(f.ganancia) }))
    .filter((r) => Number.isFinite(r.desde) && Number.isFinite(r.ganancia));

  async function guardar() {
    setError("");
    setOk("");

    const incompletas = filas.some(
      (f) => f.desde.trim() === "" || f.ganancia.trim() === ""
    );
    const rangos = filas.map((f) => ({ desde: num(f.desde), ganancia: num(f.ganancia) }));

    if (
      incompletas ||
      rangos.some(
        (r) =>
          !Number.isFinite(r.desde) ||
          !Number.isFinite(r.ganancia) ||
          r.desde < 0 ||
          r.ganancia < 0
      )
    ) {
      setError("Llena todos los números. Solo números, sin letras.");
      return;
    }
    if (!rangos.some((r) => r.desde === 0)) {
      setError("Debe haber una fila que empiece en 0.");
      return;
    }
    if (new Set(rangos.map((r) => r.desde)).size !== rangos.length) {
      setError("Hay dos filas que empiezan igual.");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/rangos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rangos }),
      });
      if (res.ok) {
        setFilas(
          [...rangos]
            .sort((a, b) => a.desde - b.desde)
            .map((r) => ({ desde: String(r.desde), ganancia: String(r.ganancia) }))
        );
        setOk("Guardado");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo guardar");
      }
    } catch {
      setError("Sin conexión. Intenta otra vez.");
    }
    setGuardando(false);
  }

  const costoPrueba = num(prueba);
  const hayPrueba = prueba.trim() !== "" && Number.isFinite(costoPrueba) && costoPrueba >= 0;
  const gPrueba = hayPrueba ? gananciaPara(costoPrueba, validos) : 0;

  const campo =
    "w-full rounded-lg border-2 border-gray-300 p-3 text-lg focus:border-green-600 focus:outline-none";

  if (cargando) return <p className="p-4 text-gray-500">Cargando...</p>;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xl font-bold">Mis ganancias</h2>
        <p className="text-gray-600">
          Dile a la app cuánto ganas según lo que te cuesta cada producto. Al
          poner el costo, el precio de venta sale solo.
        </p>
      </div>

      <div className="space-y-3">
        {filas.map((f, i) => (
          <div key={i} className="flex items-end gap-2 rounded-xl bg-gray-50 p-3">
            <label className="flex-1 text-sm text-gray-600">
              Si cuesta desde Bs.
              <input
                className={campo}
                inputMode="decimal"
                value={f.desde}
                onChange={(e) => cambiar(i, "desde", e.target.value)}
              />
            </label>
            <label className="flex-1 text-sm text-gray-600">
              Gano Bs.
              <input
                className={campo}
                inputMode="decimal"
                value={f.ganancia}
                onChange={(e) => cambiar(i, "ganancia", e.target.value)}
              />
            </label>
            <button
              onClick={() => quitar(i)}
              aria-label="Quitar fila"
              className="mb-1 rounded-lg p-3 text-xl active:bg-red-50"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={agregar}
        className="w-full rounded-lg bg-gray-200 p-3 text-lg font-semibold"
      >
        + Agregar otro rango
      </button>

      {error && <p className="text-red-600">{error}</p>}
      {ok && <p className="font-semibold text-green-700">{ok}</p>}

      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full rounded-lg bg-green-600 p-4 text-xl font-bold text-white disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>

      <div className="space-y-2 rounded-xl border-2 border-dashed border-gray-300 p-3">
        <p className="font-semibold">Probar</p>
        <label className="block text-sm text-gray-600">
          Si un producto me cuesta Bs.
          <input
            className={campo}
            inputMode="decimal"
            value={prueba}
            onChange={(e) => setPrueba(e.target.value)}
          />
        </label>
        {hayPrueba && (
          <p className="text-lg">
            Gano <b>Bs. {gPrueba.toFixed(2)}</b> y lo vendo a{" "}
            <b>Bs. {(costoPrueba + gPrueba).toFixed(2)}</b>
          </p>
        )}
      </div>
    </div>
  );
}
