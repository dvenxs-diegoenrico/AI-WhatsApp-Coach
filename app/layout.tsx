import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${site.name} en WhatsApp`, template: `%s · ${site.shortName}` },
  description:
    "Tu coach de nutrición y ejercicio con IA, directo en WhatsApp. Estima calorías con una foto, resuelve tus dudas de comida y te acompaña todos los días. No sustituye a un profesional de la salud.",
  openGraph: { title: `${site.name} en WhatsApp`, locale: "es_419", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
