import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/Legal";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Aviso de privacidad" };

// NOTE: draft written for Mexico's personal data law (LFPDPPP). Have a lawyer review it before launch.
export default function Privacidad() {
  const email = site.contactEmail;
  return (
    <LegalPage title="Aviso de privacidad integral" updated="7 de noviembre de 2026">
      <h2>1. Responsable</h2>
      <p>
        <Field value={site.legalName} label="nombre o razón social" />, con domicilio en{" "}
        <Field value={site.address} label="domicilio" />, es responsable del tratamiento de tus datos personales en el
        servicio “{site.name}” (el “Servicio”), que se ofrece por WhatsApp y en este sitio. Contacto de privacidad:{" "}
        <Field value={email} label="correo de contacto" />.
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>
          <b>Identificación y contacto:</b> número de WhatsApp, nombre de perfil de WhatsApp y país (deducido del número).
        </li>
        <li>
          <b>Edad</b>, para confirmar que eres mayor de 18 años.
        </li>
        <li>
          <b>Datos personales sensibles de salud</b> que tú decidas compartir: lo que comes, fotos de tus comidas, peso,
          estatura, actividad física, objetivos y condiciones de salud que menciones (por ejemplo, embarazo o diabetes).
        </li>
        <li>
          <b>Contenido de tus mensajes</b> con el coach y preferencias (por ejemplo, la personalidad elegida).
        </li>
        <li>
          <b>Datos de pago y facturación:</b> los procesa Stripe. Nosotros no vemos ni guardamos el número completo de tu
          tarjeta; solo recibimos el estado de tu suscripción y un identificador de cliente.
        </li>
        <li>
          <b>Datos técnicos:</b> fechas y horas de los mensajes, uso del Servicio y registros técnicos necesarios para operarlo.
        </li>
      </ul>
      <p>El Servicio no está dirigido a menores de 18 años. Si detectamos que eres menor de edad, dejamos de atenderte y eliminamos tus mensajes.</p>

      <h2>3. Para qué usamos tus datos</h2>
      <p>
        <b>Finalidades necesarias</b> (sin ellas no podemos darte el Servicio):
      </p>
      <ul>
        <li>Responder tus mensajes y darte orientación general de alimentación, ejercicio y hábitos.</li>
        <li>Estimar calorías y nutrientes a partir de fotos y descripciones (siempre como estimación).</li>
        <li>Adaptar las respuestas a tu situación, incluido limitar la orientación a información general cuando compartes una condición de salud.</li>
        <li>Administrar tu prueba gratuita, tu suscripción, tus pagos y los límites de uso.</li>
        <li>Atender solicitudes, prevenir abusos y mantener la seguridad del Servicio.</li>
      </ul>
      <p>
        <b>Finalidades adicionales</b> (puedes negarte sin perder el Servicio): elaborar estadísticas agregadas para mejorar el
        Servicio y medir qué canales de difusión funcionan (por ejemplo, el código “Hola A/B/C/D” de tu primer mensaje). Para
        oponerte, escribe a <Field value={email} label="correo de contacto" />.
      </p>

      <h2>4. Consentimiento para datos sensibles</h2>
      <p>
        Antes de tratar tus datos de salud te pedimos tu consentimiento expreso en WhatsApp (respondiendo “ACEPTO”). Guardamos
        la fecha y la versión del aviso que aceptaste. Puedes revocarlo en cualquier momento (ver sección 7).
      </p>

      <h2>5. Con quién compartimos tus datos</h2>
      <p>
        Usamos proveedores que tratan datos por nuestra cuenta y bajo nuestras instrucciones (encargados). Algunos están fuera
        de México, principalmente en Estados Unidos:
      </p>
      <table>
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Para qué</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Meta Platforms (WhatsApp Business)</td><td>Enviar y recibir mensajes de WhatsApp</td></tr>
          <tr><td>Anthropic</td><td>Inteligencia artificial que genera las respuestas y analiza las fotos</td></tr>
          <tr><td>Supabase</td><td>Base de datos y almacenamiento privado de fotos</td></tr>
          <tr><td>Vercel</td><td>Alojamiento del sitio y del Servicio</td></tr>
          <tr><td>Stripe</td><td>Procesamiento de pagos y suscripciones</td></tr>
        </tbody>
      </table>
      <p>
        No vendemos tus datos ni los compartimos con terceros para publicidad. Solo los entregaríamos a una autoridad cuando
        la ley lo exija.
      </p>

      <h2>6. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras uses el Servicio. Si borras tus datos, eliminamos tu perfil, mensajes, fotos y registros de salud. Conservamos
        solo lo que la ley nos obliga a guardar (por ejemplo, registros fiscales de pagos, que administra Stripe) y un registro
        anónimo de que la eliminación se realizó.
      </p>

      <h2>7. Tus derechos (ARCO) y cómo revocar tu consentimiento</h2>
      <p>
        Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso, y revocar tu consentimiento:
      </p>
      <ul>
        <li>
          <b>Forma rápida:</b> escribe <b>BORRAR MIS DATOS</b> en el chat y confirma con <b>CONFIRMO BORRAR</b>. Eliminamos todo de
          inmediato y, si tenías una suscripción, se cancela.
        </li>
        <li>
          <b>Por correo:</b> escribe a <Field value={email} label="correo de contacto" /> indicando tu número de WhatsApp y qué
          derecho quieres ejercer. Te responderemos en un máximo de 20 días hábiles.
        </li>
      </ul>
      <p>
        Para dejar de recibir recordatorios, escribe <b>ALTO</b> en el chat.
      </p>

      <h2>8. Uso de inteligencia artificial</h2>
      <p>
        Las respuestas las genera un sistema de inteligencia artificial. Puede equivocarse. No toma decisiones con efectos
        legales sobre ti y no sustituye la opinión de un profesional de la salud.
      </p>

      <h2>9. Cookies</h2>
      <p>Este sitio no usa cookies de publicidad ni de rastreo.</p>

      <h2>10. Cambios a este aviso</h2>
      <p>
        Publicaremos cualquier cambio en esta página. Si el cambio afecta el tratamiento de tus datos de salud, te pediremos tu
        consentimiento de nuevo por WhatsApp.
      </p>
    </LegalPage>
  );
}
