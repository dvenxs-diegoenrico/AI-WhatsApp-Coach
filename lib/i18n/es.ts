/**
 * Every message the user sees, in neutral Spanish that reads naturally in any
 * Spanish-speaking country (no country-specific slang), in one place.
 * Edit wording here; the logic lives elsewhere.
 */

import type { Country } from "./countries";

export const CONSENT_VERSION = "2026-11-v1";

export const t = {
  welcome:
    "¡Hola! 👋 Soy *WhatUpCoach*, tu *coach de nutrición con IA*. Te ayudo con tu alimentación, tu ejercicio y tus hábitos, aquí mismo por WhatsApp.\n\n" +
    "Antes de empezar: no soy nutricionista, nutriólogo ni médico, y no sustituyo a un profesional de la salud.\n\n" +
    "Para comenzar, ¿cuántos años tienes? (escribe solo el número)",

  askAgeAgain: "No te entendí 😅 ¿Cuántos años tienes? Escribe solo el número, por ejemplo: 32",

  ageOutOfRange: "Mmm, ese número no parece una edad válida. ¿Cuántos años tienes?",

  minorBlocked:
    "Gracias por tu interés 🙏 Este servicio es solo para personas mayores de 18 años, así que no puedo acompañarte por aquí.\n\n" +
    "Si quieres mejorar tu alimentación, habla con tu familia y con tu médico o un nutricionista. ¡Cuídate mucho!",

  minorStillBlocked: "Lo siento, este servicio es solo para mayores de 18 años.",

  consentRequest:
    "¡Perfecto! Antes de seguir necesito tu permiso 📝\n\n" +
    "Para ayudarte voy a guardar *datos de salud* que tú me compartas: lo que comes, tu peso, tu ejercicio, fotos de tus comidas y condiciones de salud que me cuentes. " +
    "Son datos sensibles; los uso solo para darte seguimiento, no los vendo ni los comparto con terceros para publicidad.\n\n" +
    "Puedes borrar todo cuando quieras escribiendo *BORRAR MIS DATOS*.\n\n" +
    "¿Aceptas que guarde y use estos datos? Responde *ACEPTO* para continuar o *NO* si no estás de acuerdo.",

  consentDeclined:
    "Entendido, respeto tu decisión. Sin tu permiso no puedo guardar tus datos ni darte seguimiento.\n\n" +
    "Si cambias de opinión, escribe *ACEPTO*. Si quieres que borre tu número, escribe *BORRAR MIS DATOS*.",

  consentAskAgain: "Para continuar necesito que respondas *ACEPTO* o *NO*.",

  askPersonality:
    "¡Gracias! ✅ Ahora elige cómo quieres que te hable:\n\n" +
    "*1* – Amigable 😊: paciente, cálido y motivador\n" +
    "*2* – Estricto 💪: directo, sin rodeos y exigente con tus metas\n" +
    "*3* – Balanceado ⚖️: un poco de las dos\n\n" +
    "Responde 1, 2 o 3.",

  personalityAskAgain: "Responde *1* (amigable), *2* (estricto) o *3* (balanceado).",

  onboardingDone: (personality: string) =>
    `¡Listo! Voy a ser tu coach en modo *${personality}*.\n\n` +
    "Para armar tu plan necesito conocerte un poco: ¿cuánto mides, cuánto pesas y qué te gustaría lograr (bajar grasa, mantenerte o ganar músculo)?\n\n" +
    "También puedes preguntarme lo que quieras o mandarme una foto de tu comida 📸.",
  stepsConnect: (link: string) =>
    "👟 *Conecta tus pasos*\n\n" +
    "📱 *iPhone:* abre este enlace y sigue los pasos (3 min, una sola vez). Cada noche tu iPhone me mandará tus pasos solo 👉 " + link + "\n\n" +
    "🤖 *Android:* mándame una *captura de tu contador de pasos* o escríbeme cuántos caminaste.",
  panelLink: (link: string) =>
    `📊 Aquí está tu panel con tus comidas, tu peso y tu constancia 👉 ${link}\n_El enlace es personal: no lo compartas. Funciona 7 días._`,

  finishOnboardingFirst: "Primero terminemos tu registro 🙂",

  audioNotSupportedYet:
    "Recibí tu audio 🎧, pero por ahora todavía no puedo escuchar notas de voz. ¿Me lo escribes, por favor?",

  unsupportedType: "Por ahora solo entiendo mensajes de texto y fotos de comida 📸. ¿Me lo escribes?",

  imageTooLarge: "La foto es demasiado pesada para analizarla. ¿Puedes mandarla de nuevo con menor calidad?",

  photoHeader: "📸 *Estimación aproximada*",
  photoFooter:
    "_Las calorías calculadas a partir de una foto son solo una estimación y pueden variar bastante según porciones, aceites y preparación._",

  // Deletion
  deleteConfirmRequest:
    "⚠️ ¿Seguro que quieres borrar *todos* tus datos (perfil, mensajes, comidas, peso, fotos)? Esto no se puede deshacer.\n\n" +
    "Si estás seguro, responde *CONFIRMO BORRAR* en los próximos 10 minutos.",
  deleteNothingPending: "No tengo ninguna solicitud de borrado pendiente. Si quieres borrar tus datos, escribe *BORRAR MIS DATOS*.",
  deleteDone:
    "Listo. Borré todos tus datos 🗑️. Si algún día quieres volver, solo escríbeme y empezamos de cero. ¡Te deseo lo mejor!",

  // Reminders
  remindersStopped: "Listo, ya no te enviaré recordatorios. 🔕 Si quieres reactivarlos más adelante, solo dímelo.",

  // Safety
  restrictedNotice:
    "Gracias por contarme. 💙 Con lo que me compartes, lo más seguro es que tu plan de alimentación lo haga un profesional de la salud " +
    "(médico o nutricionista) que pueda revisarte en persona. Yo puedo darte información general y acompañarte con hábitos, " +
    "pero no te daré metas de calorías ni dietas específicas.",
  restrictedFooter: "_Recuerda: para tu caso, cualquier cambio en tu alimentación consúltalo con tu médico o nutricionista._",

  crisis: (country: Country | null) => {
    const line = country?.crisisLine ? `llama ahora a la *${country.crisisLine}*` : "busca ayuda ahora mismo";
    const emergency = country?.emergency ? `al *${country.emergency}*` : "al número de emergencias de tu país";
    return (
      "Siento mucho que estés pasando por esto. 💙 No estás solo/a.\n\n" +
      `Si estás en peligro o piensas en hacerte daño, ${line} o llama ${emergency}. ` +
      "También puedes acudir a la sala de urgencias más cercana o pedirle a alguien de confianza que te acompañe.\n\n" +
      "Es muy importante que hables con un profesional de la salud. Aquí sigo para escucharte."
    );
  },

  unsafeReplyFallback:
    "Prefiero no darte una recomendación así: bajar de peso muy rápido o comer muy poco puede afectar tu salud. 🙏\n\n" +
    "Lo recomendable es una pérdida gradual (máximo alrededor de 1 kg por semana) sin comer por debajo de un mínimo saludable. " +
    "Si quieres, armamos juntos un plan sostenible.",

  messageLimit: (limit: number) =>
    `Llegamos al límite de ${limit} mensajes en 24 horas 🙌. Así mantenemos el servicio a buen precio para todos. ` +
    "En unas horas seguimos conversando. Los comandos *BORRAR MIS DATOS* y *ALTO* siguen funcionando.",
  photoLimit: (limit: number) =>
    `Ya analicé ${limit} fotos en las últimas 24 horas 📸. Mientras tanto, puedes describirme tu comida con texto y te ayudo igual.`,

  // Billing (free demo → 3-day trial with card → subscription)
  demoIntro: (photos: number, questions: number) =>
    `🎁 Para que me conozcas, tienes *${plural(photos, "análisis de foto", "análisis de foto")}* y *${plural(questions, "pregunta", "preguntas")}* gratis. ` +
    "¡Mándame una foto de tu comida y te digo cuántas calorías tiene!",
  demoLeft: (photos: number, questions: number) =>
    `_Prueba gratis: te ${photos + questions === 1 ? "queda" : "quedan"} ${plural(questions, "pregunta", "preguntas")} y ${plural(photos, "foto", "fotos")}._`,
  demoFinished: (link: string, trialAvailable: boolean) =>
    "🎁 Ese fue el final de tu prueba gratis. " +
    (trialAvailable
      ? "Para seguir con tu coach, activa tus *3 días gratis*: registras tu tarjeta y, si cancelas antes de que terminen, no se te cobra nada."
      : "Para seguir con tu coach, activa tu suscripción.") +
    `\n👉 ${link}`,
  paywall: (link: string, trialAvailable: boolean, kind: "text" | "photo", questionsLeft: number) =>
    (kind === "photo" && questionsLeft > 0
      ? `Ya usaste tu análisis de foto gratis 📸. Todavía puedes hacerme ${plural(questionsLeft, "pregunta", "preguntas")}, o `
      : "Tu prueba gratis terminó. Para seguir, ") +
    (trialAvailable ? "activa tus *3 días gratis* (cancela cuando quieras):" : "activa tu suscripción:") +
    `\n👉 ${link}`,
  account: (link: string) =>
    `Aquí puedes cambiar de plan, actualizar tu tarjeta o cancelar 👉 ${link}\n_El enlace funciona durante 24 horas._`,
  accountNoSubscription: (link: string) => `Todavía no tienes una suscripción. Elige tu plan aquí 👉 ${link}`,
  billingOff: "Por ahora el servicio es gratis 🙌. No tienes nada que pagar.",
  trialStarted: (date: string) =>
    `🎉 ¡Listo! Tu prueba de 3 días empezó. Si no cancelas, el primer cobro será el *${date}*. ` +
    "Escribe *MI CUENTA* cuando quieras administrarla. ¿En qué te ayudo hoy?",
  subscriptionActive: (plan: string) =>
    `🎉 ¡Listo! Tu plan *${plan}* está activo. Escribe *MI CUENTA* cuando quieras administrarlo. ¿En qué te ayudo hoy?`,
  paymentFailed: (link: string) =>
    `⚠️ No pudimos cobrar tu suscripción. Actualiza tu tarjeta para no perder el acceso 👉 ${link}`,
  subscriptionEnded: (link: string) => `Tu suscripción terminó. Gracias por estos días 💚. Si quieres volver: 👉 ${link}`,
  deleteCancelFailed:
    "No pude cancelar tu suscripción en este momento, así que todavía no borré nada. Intenta de nuevo en unos minutos con *BORRAR MIS DATOS*.",

  aiError: "Uy, tuve un problema para responderte 😓. ¿Me lo vuelves a mandar en un momento?",
  refusal: "Prefiero no responder eso. ¿Te ayudo con algo sobre tu alimentación o tu ejercicio?",
} as const;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const personalityLabel = {
  amigable: "amigable",
  estricto: "estricto",
  balanceado: "balanceado",
} as const;
