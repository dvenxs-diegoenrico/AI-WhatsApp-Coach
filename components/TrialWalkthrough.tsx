"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "user" | "coach"; text: string; photo?: boolean };
type Step = { label: string; note: string; msgs: Msg[] };

/**
 * Step-by-step walkthrough of the free trial (1 photo + 3 questions), built from the bot's real copy.
 * Buttons move between steps; bubbles animate in; respects "reduce motion" through CSS.
 */
const STEPS: Step[] = [
  {
    label: "Saludo",
    note: "Tocas el botón y se abre WhatsApp con un mensaje listo. No descargas nada.",
    msgs: [
      { from: "user", text: "Hola D" },
      {
        from: "coach",
        text: "¡Hola! 👋 Soy *WhatUpCoach*, tu *coach de nutrición con IA*. Antes de empezar: no soy nutricionista ni médico.\n\n¿Cuántos años tienes?",
      },
    ],
  },
  {
    label: "Registro",
    note: "Edad (solo mayores de 18), tu permiso para guardar datos de salud y cómo quieres que te hable.",
    msgs: [
      { from: "user", text: "32" },
      { from: "coach", text: "Antes de seguir necesito tu permiso 📝 … ¿Aceptas? Responde *ACEPTO* o *NO*." },
      { from: "user", text: "ACEPTO" },
      { from: "coach", text: "Elige cómo quieres que te hable:\n*1* Amigable 😊  *2* Estricto 💪  *3* Balanceado ⚖️" },
      { from: "user", text: "1" },
      { from: "coach", text: "¡Listo! 🎁 Tienes *1 análisis de foto* y *3 preguntas* gratis. ¡Mándame una foto de tu comida!" },
    ],
  },
  {
    label: "1 foto",
    note: "Tu foto gratis: identifica los alimentos y te da un rango de calorías y proteína. Siempre es una estimación.",
    msgs: [
      { from: "user", text: "¿Qué tal mi comida?", photo: true },
      {
        from: "coach",
        text: "📸 *Estimación aproximada*\n3 tacos al pastor con piña y cilantro\n*Total: 450–600 kcal* · proteína ~25 g\n\n💡 Súmale nopales o una ensalada: más fibra y te llenas más.\n\n_Te quedan 3 preguntas gratis._",
      },
    ],
  },
  {
    label: "Pregunta 1",
    note: "Le cuentas de ti y calcula tus metas con fórmulas validadas, nunca por debajo de un mínimo saludable.",
    msgs: [
      { from: "user", text: "Soy mujer, 1.62 m y 74 kg. Quiero bajar. Trabajo en oficina y camino a diario." },
      {
        from: "coach",
        text: "¡Gracias! Con tus datos, tu meta es de *1,560 kcal* y *118 g de proteína* al día, para bajar unos *0.4 kg por semana* sin pasar hambre 🙌\n\nPrimer paso: proteína en cada comida y 8,000 pasos diarios.",
      },
    ],
  },
  {
    label: "Pregunta 2",
    note: "Recuerda lo que ya comiste hoy y te propone opciones con comida de tu país.",
    msgs: [
      { from: "user", text: "¿Qué ceno si ya comí esos tacos?" },
      {
        from: "coach",
        text: "Te quedan ~1,000 kcal y ~90 g de proteína. Algo ligero: *quesadillas de champiñón con queso panela* y frijoles de olla 🫘 (~450 kcal, 30 g de proteína).",
      },
    ],
  },
  {
    label: "Pregunta 3",
    note: "También te acompaña con hábitos: agua, sueño, pasos, alcohol, refresco o tabaco.",
    msgs: [
      { from: "user", text: "Tomo refresco diario, ¿cómo le bajo?" },
      {
        from: "coach",
        text: "Sin prohibiciones: esta semana cambia *1 de cada 2* por agua mineral con limón o refresco sin azúcar. Te pregunto el domingo cómo te fue 💪",
      },
    ],
  },
  {
    label: "Tu plan",
    note: "Terminas la prueba y eliges plan. Tienes 3 días más de prueba con tarjeta: si cancelas antes, no pagas nada.",
    msgs: [
      { from: "user", text: "¿Y la proteína de mañana?" },
      {
        from: "coach",
        text: "¡Me encantó acompañarte! 🎉 Ya usaste tu prueba gratis.\n\nSigue con *3 días de prueba* (cancela cuando quieras) 👉 whatupcoach.vercel.app/pagar",
      },
    ],
  },
];

function Rich({ text }: { text: string }) {
  // WhatsApp-style *bold* and _italic_
  const parts = text.split(/(\*[^*]+\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") ? (
          <b key={i}>{p.slice(1, -1)}</b>
        ) : p.startsWith("_") && p.endsWith("_") ? (
          <i key={i}>{p.slice(1, -1)}</i>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function TrialWalkthrough() {
  const [step, setStep] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const shown = STEPS.slice(0, step + 1).flatMap((s, si) => s.msgs.map((m, mi) => ({ ...m, key: `${si}-${mi}`, fresh: si === step, idx: mi })));
  const last = step === STEPS.length - 1;

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [step]);

  return (
    <div className="walk">
      <div className="walk-side">
        <ol className="walk-steps" aria-label="Pasos de la prueba gratis">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <button
                type="button"
                className={`walk-step${i === step ? " is-current" : ""}${i < step ? " is-done" : ""}`}
                aria-current={i === step ? "step" : undefined}
                onClick={() => setStep(i)}
              >
                <span className="walk-num">{i < step ? "✓" : i + 1}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="walk-note" aria-live="polite" key={step}>
          {STEPS[step].note}
        </p>
        <div className="walk-nav">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← Atrás
          </button>
          {last ? (
            <button type="button" className="btn btn-orange btn-sm" onClick={() => setStep(0)}>
              ↺ Ver de nuevo
            </button>
          ) : (
            <button type="button" className="btn btn-orange btn-sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Siguiente →
            </button>
          )}
        </div>
      </div>

      <div className="phone walk-phone" aria-label="Conversación de ejemplo">
        <div className="phone-top">
          <img src="/brand/whatupcoach-logo.svg" alt="" width={28} height={28} />
          <div>
            <b>WhatUpCoach</b>
            <span>en línea</span>
          </div>
        </div>
        <div className="phone-chat" ref={chatRef}>
          {shown.map((m) => (
            <div
              key={m.key}
              className={`bubble ${m.from === "user" ? "out" : "in"}${m.fresh ? " fresh" : ""}`}
              style={m.fresh ? ({ "--d": `${m.idx * 0.35}s` } as React.CSSProperties) : undefined}
            >
              {m.photo && <div className="photo" role="img" aria-label="Foto de tacos" />}
              <Rich text={m.text} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
