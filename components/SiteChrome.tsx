import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

export function Header() {
  const wa = whatsappLink();
  return (
    <header className="wrap nav">
      <Link href="/" className="logo" aria-label={site.name}>
        <img className="logo-mark" src="/brand/whatupcoach-logo.svg" alt="" width={36} height={36} />
        <span>{site.shortName}</span>
      </Link>
      <nav className="nav-links" aria-label="Secciones">
        <a href="/#prueba">Cómo funciona</a>
        <a href="/#precios">Precios</a>
        <Link href="/panel/demo">Panel</Link>
      </nav>
      <WhatsAppButton href={wa} small label="Empezar gratis" />
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <nav aria-label="Legal">
          <Link href="/privacidad">Aviso de privacidad</Link>
          <Link href="/terminos">Términos y condiciones</Link>
          {site.contactEmail && <a href={`mailto:${site.contactEmail}`}>Contacto</a>}
        </nav>
        <p>
          {site.name} es un {site.tagline.toLowerCase()}: una herramienta de acompañamiento con inteligencia artificial: no es un nutricionista, nutriólogo ni
          médico, y no sustituye la atención de un profesional de la salud. Servicio solo para mayores de 18 años.
        </p>
        <p>
          Si estás en crisis o piensas en hacerte daño, llama al número de emergencias de tu país (en México: Línea de la Vida
          800 911 2000 o 911).
        </p>
      </div>
    </footer>
  );
}

export function WhatsAppButton({
  href,
  label = "Empezar en WhatsApp",
  small = false,
  pulse = false,
}: {
  href: string | null;
  label?: string;
  small?: boolean;
  pulse?: boolean;
}) {
  const cls = `btn btn-primary${small ? " btn-sm" : ""}${pulse ? " btn-pulse" : ""}`;
  // Without a public number yet, the button still works: it shows the step-by-step demo.
  if (!href)
    return (
      <a className={cls} href="/#prueba">
        <WhatsAppIcon /> {small ? "Ver demo" : "Ver la demo paso a paso"}
      </a>
    );
  return (
    <a className={cls} href={href} target="_blank" rel="noopener noreferrer">
      <WhatsAppIcon /> {label}
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}
