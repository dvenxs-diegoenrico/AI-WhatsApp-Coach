export const metadata = {
  title: "Coach de nutrición con IA",
  description: "Tu coach de nutrición y ejercicio con IA en WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
