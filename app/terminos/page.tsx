import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/Legal";
import { formatMXN, site } from "@/lib/site";

export const metadata: Metadata = { title: "Términos y condiciones" };

// NOTE: draft. Have a lawyer review it before launch (consumer protection rules in Mexico, PROFECO).
export default function Terminos() {
  return (
    <LegalPage title="Términos y condiciones" updated="7 de noviembre de 2026">
      <p>
        Estos términos regulan el uso de “{site.name}” (el “Servicio”), que ofrece{" "}
        <Field value={site.legalName} label="nombre o razón social" />. Al usar el Servicio aceptas estos términos.
      </p>

      <h2>1. Qué es el Servicio</h2>
      <p>
        Un coach de nutrición y ejercicio basado en inteligencia artificial que funciona por WhatsApp. Ofrece información
        general, ideas de comidas, estimaciones de calorías y acompañamiento de hábitos.
      </p>
      <p>
        <b>No es atención médica.</b> El Servicio no es un nutricionista, nutriólogo ni médico; no diagnostica, no trata
        enfermedades y no receta medicamentos. Si tienes una condición de salud, estás embarazada o en lactancia, o tienes
        síntomas, consulta a un profesional. En una emergencia, llama a los servicios de emergencia de tu país.
      </p>

      <h2>2. Requisitos</h2>
      <ul>
        <li>Ser mayor de 18 años.</li>
        <li>Aceptar el <a href="/privacidad">aviso de privacidad</a> y dar tu consentimiento para el tratamiento de datos de salud.</li>
        <li>Usar un número de WhatsApp propio.</li>
      </ul>

      <h2>3. Estimaciones e inteligencia artificial</h2>
      <p>
        Las calorías y nutrientes calculados a partir de fotos o descripciones son estimaciones y pueden variar bastante. La
        inteligencia artificial puede cometer errores; usa tu criterio y verifica la información importante con un profesional.
      </p>

      <h2>4. Prueba gratis, suscripción y pagos</h2>
      <ul>
        <li>
          Puedes probar el Servicio sin tarjeta con {site.demo.photos} análisis de foto y {site.demo.questions} preguntas.
        </li>
        <li>
          Después puedes suscribirte al plan mensual ({formatMXN(site.prices.monthly)} {site.prices.currency}) o anual (
          {formatMXN(site.prices.yearly)} {site.prices.currency}), impuestos incluidos, con una prueba de{" "}
          {site.prices.trialDays} días. Para iniciar la prueba debes registrar una tarjeta; el primer cobro se hace al terminar
          la prueba, salvo que canceles antes.
        </li>
        <li>La prueba de {site.prices.trialDays} días se ofrece una sola vez por número de WhatsApp.</li>
        <li>
          La suscripción se renueva automáticamente al final de cada periodo hasta que la canceles. Puedes cancelar en cualquier
          momento escribiendo <b>MI CUENTA</b> en el chat; mantienes el acceso hasta el final del periodo pagado.
        </li>
        <li>
          No hacemos reembolsos por periodos parciales, salvo cuando la ley aplicable lo exija o en caso de un cobro indebido.
        </li>
        <li>Los pagos los procesa Stripe. Si un pago falla, puedes actualizar tu tarjeta desde MI CUENTA.</li>
      </ul>

      <h2>5. Uso justo</h2>
      <p>
        Para mantener un precio accesible aplicamos límites diarios de mensajes y fotos. Si los alcanzas, el coach te avisará y
        podrás continuar cuando se libere el límite.
      </p>

      <h2>6. Uso aceptable</h2>
      <p>
        No uses el Servicio para fines ilegales, para enviar contenido ofensivo o de terceros sin permiso, ni para intentar
        dañarlo o abusar de él. Podemos suspender el acceso en esos casos.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        El Servicio se ofrece “tal cual”. En la medida que la ley lo permita, no somos responsables de decisiones de salud que
        tomes sin consultar a un profesional, ni de interrupciones causadas por terceros (por ejemplo, WhatsApp).
      </p>

      <h2>8. Cambios</h2>
      <p>
        Podemos actualizar estos términos. Te avisaremos de cambios importantes por WhatsApp; si no estás de acuerdo, puedes
        cancelar tu suscripción.
      </p>

      <h2>9. Contacto y ley aplicable</h2>
      <p>
        Dudas y aclaraciones: <Field value={site.contactEmail} label="correo de contacto" />. Estos términos se rigen por las
        leyes de México. Como consumidor, puedes acudir a la Procuraduría Federal del Consumidor (PROFECO).
      </p>
    </LegalPage>
  );
}
