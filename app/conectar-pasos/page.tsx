import type { Metadata } from "next";
import { PanelShell } from "@/components/dashboard/PanelShell";
import { CopyField } from "@/components/ui/CopyField";
import { currentUserId } from "@/lib/auth/session";
import { verifyLink } from "@/lib/billing/links";
import { linksKey } from "@/lib/billing/stripe";
import { stepsUrl } from "@/lib/coach/steps-link";
import { db } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Conectar tus pasos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConectarPasos({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const userId = (t ? verifyLink(t, "panel", linksKey()) : null) ?? (await currentUserId());
  const { data } = userId ? await db().from("users").select("id, steps_token_version, onboarding_step").eq("id", userId).maybeSingle() : { data: null };
  const user = data as Pick<UserRow, "id" | "steps_token_version" | "onboarding_step"> | null;
  const url = user && user.onboarding_step === "done" ? stepsUrl(user) : null;

  return (
    <PanelShell>
      <article className="guide" style={{ paddingBottom: 48 }}>
        <h1>Conecta tus pasos 👟</h1>
        <p className="lead">
          Tu coach puede ver tus pasos de cada día para ajustar tu plan y celebrar tu avance. Elige tu tipo de celular.
        </p>

        <section className="dash-card" style={{ "--i": 0 } as React.CSSProperties}>
          <h2>📱 iPhone (app Salud): automático</h2>
          <p className="muted">Se configura una sola vez con la app <b>Atajos</b> de Apple, que ya viene en tu iPhone. Toma unos 3 minutos.</p>
          {url ? (
            <>
              <p><b>1.</b> Copia tu enlace personal (no lo compartas):</p>
              <CopyField value={url} label="Tu enlace personal para el atajo" />
            </>
          ) : (
            <p className="warn">
              Para ver tu enlace personal, escribe <b>PASOS</b> en tu chat de WhatsApp con WhatUpCoach y abre el enlace que te llega.
            </p>
          )}
          <ol className="steps-list">
            <li>Abre <b>Atajos</b> → pestaña <b>Automatización</b> → <b>+</b> → <b>Hora del día</b>.</li>
            <li>Elige <b>23:00</b>, <b>Diariamente</b> y <b>Ejecutar inmediatamente</b>. Toca <b>Siguiente</b> → <b>Nuevo atajo en blanco</b>.</li>
            <li>
              Agrega la acción <b>Buscar muestras de salud</b>: tipo <b>Pasos</b>, filtro <b>Fecha de inicio · es hoy</b> y en <b>Agrupar por</b> elige <b>Día</b>.
            </li>
            <li>Agrega <b>Obtener detalles de muestras de salud</b> → <b>Valor</b>.</li>
            <li>
              Agrega <b>Obtener contenido de URL</b> y pega tu enlace. Toca la flecha para ver más: Método <b>POST</b>, Cuerpo de la solicitud <b>JSON</b>, agrega un campo de
              texto con la clave <code>pasos</code> y como valor elige la variable <b>Valor</b>.
            </li>
            <li>Toca ▶︎ para probarlo. La primera vez el iPhone te pide permiso para leer tus pasos: tócale <b>Permitir</b>. Debe responder <code>{`{"ok":true…}`}</code>.</li>
          </ol>
          <p className="dash-foot">Los nombres pueden variar un poco según tu versión de iOS. Si algo no aparece, mándale captura a tu coach.</p>
        </section>

        <section className="dash-card" style={{ "--i": 1, marginTop: 16 } as React.CSSProperties}>
          <h2>🤖 Android: con una captura</h2>
          <p>
            Google está cerrando el acceso web a Google Fit, y Health Connect solo funciona dentro de una app instalada. Mientras tanto, lo más fácil:
          </p>
          <ul className="checks">
            <li>Manda en WhatsApp una <b>captura de tu contador de pasos</b> (Google Fit, Samsung Health, Fitbit…) y tu coach lee el número.</li>
            <li>O escríbelo: <i>“hoy caminé 9,500 pasos”</i>.</li>
          </ul>
        </section>

        <p className="dash-legal">Usamos tus pasos solo para tu coaching. Puedes borrar todo con BORRAR MIS DATOS.</p>
      </article>
    </PanelShell>
  );
}
