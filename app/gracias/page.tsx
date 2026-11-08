import type { Metadata } from "next";
import { Footer, Header, WhatsAppButton } from "@/components/SiteChrome";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "¡Listo!", robots: { index: false } };

export default async function Gracias({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const back = site.whatsappNumber ? `https://wa.me/${site.whatsappNumber.replace(/\D/g, "")}` : null;

  const [title, text] = q.vencido
    ? ["Este enlace ya no es válido", "Escribe MI CUENTA en el chat de WhatsApp y te mandamos uno nuevo."]
    : q.ya
      ? ["Ya tienes una suscripción activa", "No necesitas pagar de nuevo. Escribe MI CUENTA en WhatsApp para administrarla."]
      : q.cuenta
        ? ["Cambios guardados", "Puedes volver a WhatsApp y seguir con tu coach."]
        : ["¡Listo! 🎉", "Tu coach ya te está esperando. En unos segundos te llega la confirmación por WhatsApp."];

  return (
    <>
      <Header />
      <main className="wrap narrow" style={{ paddingBottom: 48, textAlign: "center" }}>
        <h1>{title}</h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          {text}
        </p>
        <div className="cta-row" style={{ justifyContent: "center" }}>
          <WhatsAppButton href={back} label="Volver a WhatsApp" />
        </div>
      </main>
      <Footer />
    </>
  );
}
