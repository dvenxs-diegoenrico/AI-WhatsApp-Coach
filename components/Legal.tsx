import { Footer, Header } from "@/components/SiteChrome";
import { legalIsDraft } from "@/lib/site";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="wrap narrow legal">
        <h1>{title}</h1>
        <p className="fine">Última actualización: {updated}</p>
        {legalIsDraft && (
          <p className="warn">
            Borrador: faltan datos del responsable y este documento está pendiente de revisión legal.
          </p>
        )}
        {children}
      </main>
      <Footer />
    </>
  );
}

/** Shows a configured value, or a visible placeholder while it's missing. */
export function Field({ value, label }: { value: string | null; label: string }) {
  return value ? <>{value}</> : <mark>[pendiente: {label}]</mark>;
}
