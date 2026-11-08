import type { Metadata } from "next";
import { demoDashboard } from "@/lib/coach/dashboard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PanelShell } from "@/components/dashboard/PanelShell";

export const metadata: Metadata = { title: "Ejemplo del panel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function PanelDemo() {
  return (
    <PanelShell>
      <Dashboard data={demoDashboard()} demo />
    </PanelShell>
  );
}
