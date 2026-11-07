import type { Metadata } from "next";
import { Footer, Header, WhatsAppButton } from "@/components/SiteChrome";
import { verifyLink } from "@/lib/billing/links";
import { billingEnabled, linksKey } from "@/lib/billing/stripe";
import { db } from "@/lib/supabase/server";
import { formatMXN, site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = { title: "Elige tu plan", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Pagar({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token } = await searchParams;
  const userId = billingEnabled() ? verifyLink(token, "pay", linksKey()) : null;

  let trialAvailable = true;
  if (userId) {
    const { data } = await db().from("users").select("trial_used_at").eq("id", userId).maybeSingle();
    trialAvailable = !data?.trial_used_at;
  }
  const href = (plan: "mensual" | "anual") => `/api/checkout?t=${encodeURIComponent(token ?? "")}&plan=${plan}`;
  const saving = Math.round(100 - (site.prices.yearly / (site.prices.monthly * 12)) * 100);

  return (
    <>
      <Header />
      <main className="wrap narrow" style={{ paddingBottom: 48 }}>
        {!userId ? (
          <>
            <h1>Este enlace ya no es válido</h1>
            <p className="lead">
              Los enlaces de pago duran 7 días. Escribe <b>MI CUENTA</b> en el chat de WhatsApp y te mandamos uno nuevo.
            </p>
            <div className="cta-row">
              <WhatsAppButton href={whatsappLink()} label="Volver a WhatsApp" />
            </div>
          </>
        ) : (
          <>
            <h1>Elige tu plan</h1>
            <p className="lead">
              {trialAvailable
                ? `Empiezas con ${site.prices.trialDays} días gratis. Registras tu tarjeta, y si cancelas antes de que terminen, no se te cobra nada.`
                : "Activa tu suscripción para seguir con tu coach."}
            </p>
            <div className="grid-2" style={{ marginTop: 20 }}>
              <PlanCard title="Mensual" price={`${formatMXN(site.prices.monthly)}`} per="/ mes" href={href("mensual")} trial={trialAvailable} />
              <PlanCard
                title="Anual"
                price={`${formatMXN(site.prices.yearly)}`}
                per="/ año"
                href={href("anual")}
                trial={trialAvailable}
                badge={`Ahorra ${saving}%`}
                note={`Equivale a ${formatMXN(Math.round(site.prices.yearly / 12))} al mes`}
              />
            </div>
            <p className="fine" style={{ marginTop: 16 }}>
              Pago seguro con Stripe: tarjeta, Apple Pay o Google Pay. Precios en pesos mexicanos ({site.prices.currency}),
              impuestos incluidos. Cancela cuando quieras escribiendo MI CUENTA en el chat. Al continuar aceptas los{" "}
              <a href="/terminos">términos</a> y el <a href="/privacidad">aviso de privacidad</a>.
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function PlanCard(props: { title: string; price: string; per: string; href: string; trial: boolean; badge?: string; note?: string }) {
  return (
    <div className={`card price-card${props.badge ? " featured" : ""}`}>
      {props.badge && <span className="badge">{props.badge}</span>}
      <h3>{props.title}</h3>
      <div className="price">
        {props.price} <small>MXN {props.per}</small>
      </div>
      {props.note && <p style={{ marginTop: 4 }}>{props.note}</p>}
      <a className="btn btn-primary" style={{ marginTop: 16, width: "100%" }} href={props.href}>
        {props.trial ? `Empezar ${site.prices.trialDays} días gratis` : "Suscribirme"}
      </a>
    </div>
  );
}
