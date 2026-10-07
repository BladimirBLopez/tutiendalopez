import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegistrarSW from "@/components/RegistrarSW";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "Tu Tienda López",
  description: "Control de ventas e inventario de la tienda",
  icons: { apple: "/icon/192" },
  appleWebApp: { capable: true, title: "Tu Tienda", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegistrarSW />
        <InstallPrompt />
      </body>
    </html>
  );
}
