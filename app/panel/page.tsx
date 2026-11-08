import type { Metadata } from "next";
import { currentUserId } from "@/lib/auth/session";
import { db } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";
import { loadDashboard } from "@/lib/coach/dashboard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PanelShell } from "@/components/dashboard/PanelShell";

export const metadata: Metadata = { title: "Tu panel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Panel({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const userId = await currentUserId();
  const { data: user } = userId ? await db().from("users").select("*").eq("id", userId).maybeSingle() : { data: null };

  if (!user || (user as UserRow).onboarding_step !== "done") {
    return (
      <PanelShell>
        <section className="panel-login dash-card" style={{ "--i": 0 } as React.CSSProperties}>
          <h1>{q.salir ? "Cerraste sesión" : q.vencido ? "Ese enlace ya venció" : "Tu panel"}</h1>
          <p className="lead">
            Para entrar, escribe <b>PANEL</b> en tu chat de WhatsApp con WhatUpCoach y abre el enlace que te llega. Sin contraseñas.
          </p>
          <p className="muted">
            ¿Quieres ver cómo se ve? <a href="/panel/demo">Mira un ejemplo</a>.
          </p>
        </section>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <Dashboard data={await loadDashboard(user as UserRow)} />
    </PanelShell>
  );
}
