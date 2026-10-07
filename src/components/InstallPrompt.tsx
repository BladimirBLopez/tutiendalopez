"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CLAVE = "instalar-descartado";
const DIAS = 7;

export default function InstallPrompt() {
  const [evento, setEvento] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let descartado = 0;
    try {
      descartado = Number(localStorage.getItem(CLAVE) ?? 0);
    } catch {}
    if (Date.now() - descartado < DIAS * 86400000) return;

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setIos(true);
      setVisible(true);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setEvento(e as BIPEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setEvento(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function recordarDescarte() {
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {}
  }

  function ahoraNo() {
    recordarDescarte();
    setVisible(false);
  }

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const r = await evento.userChoice;
    if (r.outcome === "dismissed") recordarDescarte();
    setEvento(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600 text-2xl font-extrabold text-white">
          TL
        </div>
        <h2 className="text-xl font-bold">Instalar Tu Tienda</h2>
        <p className="mt-2 text-gray-600">
          Agrégala a tu celular para abrirla como una app, más rápido y sin barra del
          navegador.
        </p>

        {ios && !evento ? (
          <p className="mt-3 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
            En iPhone: toca el botón <b>Compartir</b> y luego{" "}
            <b>Agregar a pantalla de inicio</b>.
          </p>
        ) : null}

        <div className="mt-5 flex gap-3">
          <button
            onClick={ahoraNo}
            className="flex-1 rounded-lg bg-gray-200 p-3 font-semibold"
          >
            {ios && !evento ? "Entendido" : "Ahora no"}
          </button>
          {evento && (
            <button
              onClick={instalar}
              className="flex-1 rounded-lg bg-green-600 p-3 font-semibold text-white"
            >
              Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
