import Link from "next/link";
import { site } from "@/lib/site";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const wa = site.whatsappNumber ? `https://wa.me/${site.whatsappNumber.replace(/\D/g, "")}` : null;
  return (
    <>
      <header className="wrap nav">
        <Link href="/" className="logo" aria-label={site.name}>
          <img className="logo-mark" src="/brand/whatupcoach-logo.svg" alt="" width={36} height={36} />
          <span>{site.shortName}</span>
        </Link>
        {wa && (
          <a className="btn btn-primary btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
            Ir a WhatsApp
          </a>
        )}
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
