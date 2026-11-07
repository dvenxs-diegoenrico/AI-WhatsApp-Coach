/**
 * Every message the user sees, in neutral Spanish that reads naturally in any
 * Spanish-speaking country (no country-specific slang), in one place.
 * Edit wording here; the logic lives elsewhere.
 */

import type { Country } from "./countries";

export const CONSENT_VERSION = "2026-11-v1";

export const t = {
  welcome:
    "¡Hola! 👋 Soy tu *coach de nutrición con IA*. Te ayudo con tu alimentación, tu ejercicio y tus hábitos, aquí mismo por WhatsApp.\n\n" +
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
    "Cuéntame: ¿cuál es tu meta principal? Puedes preguntarme lo que quieras sobre comida y ejercicio, o mandarme una foto de tu comida 📸 para estimar sus calorías.",

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

  aiError: "Uy, tuve un problema para responderte 😓. ¿Me lo vuelves a mandar en un momento?",
  refusal: "Prefiero no responder eso. ¿Te ayudo con algo sobre tu alimentación o tu ejercicio?",
} as const;

export const personalityLabel = {
  amigable: "amigable",
  estricto: "estricto",
  balanceado: "balanceado",
} as const;
