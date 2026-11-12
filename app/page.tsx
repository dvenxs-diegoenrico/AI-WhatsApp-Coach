import Link from "next/link";
import { Footer, Header, WhatsAppButton } from "@/components/SiteChrome";
import { TrialWalkthrough } from "@/components/TrialWalkthrough";
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
        <div className="hero-bg">
          <div className="wrap hero">
            <div>
              <span className="eyebrow">Tu coach de nutrición, ejercicio y hábitos con IA</span>
              <h1>
                Come mejor y muévete más, <span className="hl">sin dietas extremas</span>, desde tu WhatsApp
              </h1>
              <p className="lead">
                Mándale una foto de tu comida y recibe una estimación de calorías. Te calcula metas realistas, te arma
                entrenamientos y te acompaña con tus hábitos: agua, sueño, pasos, refresco, alcohol o tabaco.
              </p>
              <div className="cta-row">
                <WhatsAppButton href={wa} label="Probar gratis en WhatsApp" pulse />
                <a className="btn btn-orange-ghost" href="#prueba">
                  Ver cómo funciona ↓
                </a>
              </div>
              <ul className="trust">
                <li>🎁 {site.demo.photos} foto + {site.demo.questions} preguntas gratis, sin tarjeta</li>
                <li>🔒 Tus datos son privados</li>
                <li>🇲🇽🇨🇴🇦🇷🇪🇸 Para todo el mundo hispano</li>
              </ul>
            </div>
            <ChatDemo />
          </div>
        </div>

        {/* Free trial step by step */}
        <section id="prueba" className="alt">
          <div className="wrap">
            <span className="kicker">Prueba gratis, paso a paso</span>
            <h2>Así se ve tu primera conversación</h2>
            <p className="lead">
              Toca <b>Siguiente</b> para ver cada paso: registro, tu foto gratis, tus 3 preguntas y cómo continuar.
            </p>
            <TrialWalkthrough />
          </div>
        </section>

        {/* Expert method */}
        <section>
          <div className="wrap">
            <span className="kicker">Un coach experto</span>
            <h2>Metas con ciencia, no con modas</h2>
            <div className="grid-3" style={{ marginTop: 20 }}>
              <Feature icon="🧮" title="Metas calculadas, no inventadas" text="Calorías y proteína con fórmulas validadas (Mifflin-St Jeor). La IA nunca inventa tus números." />
              <Feature icon="📉" title="Pérdida sostenible" text="Alrededor de 0.5 % de tu peso por semana. Nunca por debajo de un mínimo saludable ni más de 1 kg semanal." />
              <Feature icon="🔁" title="Se ajusta contigo" text="Con tus registros de comida y peso, recalcula tu gasto real cada semana, como los mejores coaches." />
              <Feature icon="🏋️" title="Entrenamientos a tu medida" text="En casa, en el parque o en el gym, según tu nivel y tus días libres. Fuerza primero, sin lesionarte." />
              <Feature icon="📸" title="Calorías con una foto" text="Identifica los alimentos y te da un rango estimado de calorías y proteína. Siempre como estimación." />
              <Feature icon="🌮" title="Comida de tu país" text="Tacos, arepas, empanadas, pupusas o tortilla española. Sin dietas de otro planeta." />
            </div>
          </div>
        </section>

        {/* Habits + steps */}
        <section className="alt">
          <div className="wrap">
            <span className="kicker">Hábitos y vicios</span>
            <h2>Pequeños cambios que sí se quedan</h2>
            <div className="grid-2" style={{ marginTop: 20 }}>
              <div className="card">
                <div className="icon" aria-hidden>🌱</div>
                <h3>Un hábito a la vez</h3>
                <p>
                  Elige 1 o 2 hábitos y tu coach los sigue contigo: agua, sueño, pasos, verduras, refresco, alcohol o cigarro.
                  Sin regaños: metas pequeñas y un check-in cada semana.
                </p>
                <div className="habit-chips" aria-hidden>
                  <span>💧 Agua</span>
                  <span>😴 Sueño</span>
                  <span>🚶 Pasos</span>
                  <span>🥤 Refresco</span>
                  <span>🍺 Alcohol</span>
                  <span>🚭 Tabaco</span>
                </div>
              </div>
              <div className="card">
                <div className="icon" aria-hidden>👟</div>
                <h3>Tus pasos del celular</h3>
                <p>
                  Escribe <b>PASOS</b> en el chat. En iPhone se conecta con la app Salud mediante un atajo automático; en Android
                  manda una captura de Google Fit o Samsung Health y el coach la lee.
                </p>
                <Link className="link-arrow" href="/conectar-pasos">
                  Ver cómo se conecta
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Panel + commands */}
        <section>
          <div className="wrap">
            <span className="kicker">Tu panel</span>
            <h2>Tu progreso, de un vistazo</h2>
            <div className="grid-2" style={{ marginTop: 20 }}>
              <div className="card">
                <div className="icon" aria-hidden>📊</div>
                <h3>Panel personal</h3>
                <p>
                  Escribe <b>PANEL</b> y abre tu enlace: calorías y proteína del día, tendencia de peso, pasos, hábitos y
                  entrenamientos. Sin contraseñas.
                </p>
                <div className="cta-row">
                  <Link className="btn btn-orange btn-sm" href="/panel/demo">
                    Ver panel de ejemplo →
                  </Link>
                </div>
              </div>
              <div className="card">
                <div className="icon" aria-hidden>💬</div>
                <h3>Comandos útiles</h3>
                <ul className="checks">
                  <li><b>PANEL</b>: tu progreso en la web</li>
                  <li><b>PASOS</b>: conecta los pasos de tu celular</li>
                  <li><b>MI CUENTA</b>: plan, tarjeta o cancelar</li>
                  <li><b>ALTO</b>: deja de recibir recordatorios</li>
                  <li><b>BORRAR MIS DATOS</b>: elimina todo</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="alt" id="precios">
          <div className="wrap">
            <span className="kicker">Precios</span>
            <h2>Primero pruébalo gratis</h2>
            <p className="lead" style={{ marginTop: 0 }}>
              {site.demo.photos} foto y {site.demo.questions} preguntas sin tarjeta. Después, {site.prices.trialDays} días de prueba:
              si cancelas antes, no se te cobra nada.
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
                  <li>Fotos, preguntas, panel y hábitos</li>
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
              Precios en pesos mexicanos con IVA incluido. Si pagas desde otro país, tu banco hace la conversión. Aplican
              límites diarios de uso justo.
            </p>
            <div className="cta-row">
              <WhatsAppButton href={wa} label="Probar gratis en WhatsApp" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="wrap narrow">
            <span className="kicker">Dudas</span>
            <h2>Preguntas frecuentes</h2>
            <Faq q="¿Es un nutricionista?">
              No. Es un coach de nutrición con inteligencia artificial. Te da información general y te acompaña con tus hábitos,
              pero no diagnostica ni sustituye a un nutricionista, nutriólogo o médico.
            </Faq>
            <Faq q="¿Qué incluye la prueba gratis?">
              {site.demo.photos} análisis de foto y {site.demo.questions} preguntas, sin tarjeta. Si te gusta, eliges plan y tienes{" "}
              {site.prices.trialDays} días más de prueba; si cancelas antes, no pagas nada.
            </Faq>
            <Faq q="¿Qué tan exactas son las calorías de las fotos?">
              Son estimaciones. Dependen de la porción, el aceite y la preparación. Sirven para orientarte, no como una medición
              exacta.
            </Faq>
            <Faq q="¿Me va a poner una dieta muy estricta?">
              No. Nunca sugiere comer por debajo de un mínimo saludable ni bajar más de alrededor de 1 kg por semana.
            </Faq>
            <Faq q="Tengo diabetes, estoy embarazada o tengo otra condición de salud. ¿Lo puedo usar?">
              Sí, pero solo te dará orientación general, sin metas de calorías, y te recomendará que tu plan lo haga un
              profesional de la salud.
            </Faq>
            <Faq q="¿Cómo conecto mis pasos?">
              Escribe PASOS en el chat. En iPhone se conecta con la app Salud con un atajo; en Android puedes mandar una captura de
              tu app de pasos.
            </Faq>
            <Faq q="¿Qué hacen con mis datos?">
              Los usamos solo para darte el servicio. Tus fotos se guardan en privado y puedes borrar todo cuando quieras
              escribiendo BORRAR MIS DATOS. Detalles en el <a href="/privacidad">aviso de privacidad</a>.
            </Faq>
            <Faq q="¿Cómo cancelo?">
              Escribe MI CUENTA en el chat y te mandamos un enlace para cancelar o cambiar de plan.
            </Faq>
          </div>
        </section>

        <section className="final-cta">
          <div className="wrap" style={{ textAlign: "center" }}>
            <h2>Empieza hoy con {site.name}, gratis</h2>
            <p className="lead" style={{ margin: "0 auto" }}>
              Manda tu primera foto y ve lo que tu coach puede hacer por ti.
            </p>
            <div className="cta-row" style={{ justifyContent: "center" }}>
              <WhatsAppButton href={wa} label="Probar gratis en WhatsApp" pulse />
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
    <div className="phone hero-phone" aria-label="Ejemplo de conversación">
      <div className="bubble out">
        <div className="photo" role="img" aria-label="Foto de un plato de comida" />
        ¿Cuántas calorías tiene mi comida?
      </div>
      <div className="bubble in">
        📸 <b>Estimación aproximada</b>
        <br />
        3 tacos al pastor con piña y cilantro.
        <br />
        <b>Total: 450–600 kcal</b> · proteína ~25 g
        <br />
        💡 Súmale nopales o una ensalada para llenarte más.
      </div>
      <div className="bubble out">¡Gracias! ¿Y qué ceno hoy?</div>
      <div className="bubble in">Algo ligero y con proteína: quesadillas de champiñón con frijoles de olla 🙌</div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="card feature">
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
