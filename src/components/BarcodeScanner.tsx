"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
  continuo?: boolean;
};

export default function BarcodeScanner({ onScan, onClose, continuo = false }: Props) {
  const [error, setError] = useState("");
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const ultimo = useRef({ code: "", t: 0 });

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let activo = true;

    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (!activo) return;

      scanner = new Html5Qrcode("lector-barras", {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      });

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 140 } },
          (texto: string) => {
            const ahora = Date.now();
            if (
              texto === ultimo.current.code &&
              ahora - ultimo.current.t < 2500
            ) {
              return;
            }
            ultimo.current = { code: texto, t: ahora };
            if (navigator.vibrate) navigator.vibrate(80);
            onScanRef.current(texto);
            if (!continuo) onCloseRef.current();
          },
          () => {}
        );
      } catch {
        setError("No se pudo abrir la cámara. Revisa el permiso del navegador.");
      }
    })();

    return () => {
      activo = false;
      const s = scanner;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [continuo]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <p className="mb-3 text-center text-lg font-semibold text-white">
        Apunta al código de barras
      </p>
      <div id="lector-barras" className="mx-auto w-full max-w-md overflow-hidden rounded-lg bg-black" />
      {error && <p className="mt-3 text-center text-red-400">{error}</p>}
      <button
        onClick={onClose}
        className="mx-auto mt-4 w-full max-w-md rounded-lg bg-white p-3 text-lg font-semibold"
      >
        Cerrar
      </button>
    </div>
  );
}
