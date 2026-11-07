import { Footer, Header, WhatsAppButton } from "@/components/SiteChrome";
import { formatMXN, site, whatsappLink } from "@/lib/site";

export default function Home() {
  const wa = whatsappLink();
  const monthlyEquivalent = Math.round(site.prices.yearly / 12);
  const yearlySaving = Math.round(100 - (site.prices.yearly / (site.prices.monthly * 12)) * 100);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <div className="wrap hero">
          <div>
            <span className="eyebrow">Coach de nutrición con IA · en WhatsApp</span>
            <h1>Come mejor sin dietas extremas, desde tu WhatsApp</h1>
            <p className="lead">
              Mándale una foto de tu comida y recibe una estimación de calorías. Pregúntale qué cenar, cómo armar tu plato o
              cómo retomar el ejercicio. Te responde en segundos, con comida de tu país.
            </p>
            <div className="cta-row">
              <WhatsAppButton href={wa} />
              <span className="fine">
                Prueba gratis: {site.demo.photos} foto y {site.demo.questions} preguntas sin tarjeta.
              </span>
            </div>
          </div>
          <ChatDemo />
        </div>

        {/* How it works */}
        <section className="alt">
          <div className="wrap">
            <h2>Así funciona</h2>
            <div className="grid-3" style={{ marginTop: 20 }}>
              <Step n={1} title="Escríbele por WhatsApp" text="Sin descargar apps ni crear contraseñas. Tocas el botón y se abre el chat." />
              <Step n={2} title="Cuéntale de ti" text="Tu edad y cómo quieres que te hable: amigable, estricto o balanceado. Toma un minuto." />
              <Step n={3} title="Pregunta y manda fotos" text="Te ayuda con tus comidas, tu ejercicio y tus hábitos, cuando lo necesites." />
            </div>
          </div>
        </section>

        {/* Features */}
        <section>
          <div className="wrap">
            <h2>Lo que hace por ti</h2>
            <div className="grid-3" style={{ marginTop: 20 }}>
              <Feature icon="📸" title="Calorías con una foto" text="Identifica los alimentos y te da un rango estimado de calorías, proteína, carbohidratos y grasa." />
              <Feature icon="🌮" title="Habla como tú" text="Conoce los platillos de tu país: tacos, arepas, empanadas, pupusas… Nada de dietas de otro planeta." />
              <Feature icon="🎭" title="Elige su personalidad" text="Amigable si quieres ánimo, estricto si quieres que no te deje pasar una, o balanceado." />
              <Feature icon="🛡️" title="Seguro por diseño" text="Nunca te sugiere comer por debajo de un mínimo saludable ni bajar de peso demasiado rápido." />
              <Feature icon="⚡" title="Respuestas en segundos" text="A cualquier hora. Varias preguntas seguidas reciben una sola respuesta, clara y corta." />
              <Feature icon="🔒" title="Tus datos son tuyos" text="Escribe BORRAR MIS DATOS y eliminamos todo. Tus fotos se guardan en privado." />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="alt" id="precios">
          <div className="wrap">
            <h2>Precios</h2>
            <p className="lead" style={{ marginTop: 0 }}>
              Primero pruébalo gratis. Después, {site.prices.trialDays} días de prueba con tarjeta: si cancelas antes, no se te cobra nada.
            </p>
            <div className="grid-2" style={{ marginTop: 20, maxWidth: 760 }}>
              <div className="card price-card">
                <h3>Mensual</h3>
                <div className="price">
                  {formatMXN(site.prices.monthly)} <small>{site.prices.currency} / mes</small>
                </div>
                <ul className="checks">
                  <li>{site.prices.trialDays} días de prueba</li>
                  <li>Cancela cuando quieras</li>
                  <li>Fotos y preguntas todos los días</li>
                </ul>
              </div>
              <div className="card price-card featured">
                <span className="badge">Ahorra {yearlySaving}%</span>
                <h3>Anual</h3>
                <div className="price">
                  {formatMXN(site.prices.yearly)} <small>{site.prices.currency} / año</small>
                </div>
                <ul className="checks">
                  <li>Equivale a {formatMXN(monthlyEquivalent)} al mes</li>
                  <li>{site.prices.trialDays} días de prueba</li>
                  <li>Todo lo del plan mensual</li>
                </ul>
              </div>
            </div>
            <p className="fine" style={{ marginTop: 14 }}>
              Precios en pesos mexicanos. Si pagas desde otro país, tu banco hace la conversión. Aplican límites diarios de uso
              justo, pensados para que el servicio se mantenga a buen precio.
            </p>
            <div className="cta-row">
              <WhatsAppButton href={wa} label="Probar gratis en WhatsApp" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="wrap narrow">
            <h2>Preguntas frecuentes</h2>
            <Faq q="¿Es un nutricionista?">
              No. Es un coach de nutrición con inteligencia artificial. Te da información general y te acompaña con tus hábitos,
              pero no diagnostica ni sustituye a un nutricionista, nutriólogo o médico.
            </Faq>
            <Faq q="¿Qué tan exactas son las calorías de las fotos?">
              Son estimaciones. Dependen de la porción, el aceite y la preparación, y pueden variar bastante. Sirven para
              orientarte, no como una medición exacta.
            </Faq>
            <Faq q="¿Me va a poner una dieta muy estricta?">
              No. Por diseño nunca sugiere comer por debajo de un mínimo saludable ni bajar más de alrededor de 1 kg por semana.
            </Faq>
            <Faq q="Tengo diabetes, estoy embarazada o tengo otra condición de salud. ¿Lo puedo usar?">
              Sí, pero en ese caso solo te dará orientación general y te recomendará que tu plan lo haga un profesional de la
              salud que pueda revisarte.
            </Faq>
            <Faq q="¿Qué hacen con mis datos?">
              Los usamos solo para darte el servicio. Tus fotos se guardan en privado y puedes borrar todo cuando quieras
              escribiendo BORRAR MIS DATOS. Detalles en el <a href="/privacidad">aviso de privacidad</a>.
            </Faq>
            <Faq q="¿Cómo cancelo?">
              Escribe MI CUENTA en el chat y te mandamos un enlace para cancelar o cambiar de plan. Si cancelas durante la prueba,
              no se te cobra.
            </Faq>
            <Faq q="¿Necesito descargar algo?">No. Todo funciona dentro de WhatsApp.</Faq>
          </div>
        </section>

        <section className="alt">
          <div className="wrap" style={{ textAlign: "center" }}>
            <h2>Empieza hoy, gratis</h2>
            <p className="lead" style={{ margin: "0 auto" }}>
              Manda tu primera foto y ve lo que tu coach puede hacer por ti.
            </p>
            <div className="cta-row" style={{ justifyContent: "center" }}>
              <WhatsAppButton href={wa} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ChatDemo() {
  return (
    <div className="phone" aria-label="Ejemplo de conversación">
      <div className="bubble out">
        <div className="photo" role="img" aria-label="Foto de un plato de comida" />
        ¿Cuántas calorías tiene mi comida?
      </div>
      <div className="bubble in">
        📸 <b>Estimación aproximada</b>
        <br />
        Veo 3 tacos de pastor con piña, cebolla y cilantro.
        <br />
        <b>Total: 450–600 kcal</b> · proteína ~25 g
        <br />
        💡 Agrega una ensalada o nopales para sentirte más satisfecho.
      </div>
      <div className="bubble out">¡Gracias! ¿Y qué ceno hoy?</div>
      <div className="bubble in">Algo ligero y con proteína: quesadillas de champiñones con frijoles de olla 🙌</div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="card">
      <div className="step-num">{n}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="card">
      <div className="icon" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details>
      <summary>{q}</summary>
      <p>{children}</p>
    </details>
  );
}
