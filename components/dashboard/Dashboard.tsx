import type { DashboardData } from "@/lib/coach/dashboard";
import { insights } from "@/lib/coach/dashboard";

const fmt = (n: number) => new Intl.NumberFormat("es-MX").format(Math.round(n));
const MEAL_ICON: Record<string, string> = { desayuno: "🌅", comida: "🍽️", cena: "🌙", colacion: "🍎", otro: "🥤" };
const MEAL_LABEL: Record<string, string> = { desayuno: "Desayuno", comida: "Comida", cena: "Cena", colacion: "Colación", otro: "Otro" };

/** The whole dashboard. Server-rendered, no client JavaScript; motion is CSS only. */
export function Dashboard({ data, demo = false }: { data: DashboardData; demo?: boolean }) {
  const tips = insights(data);
  let i = 0; // stagger index for the entrance animation
  const card = () => ({ style: { "--i": i++ } as React.CSSProperties });

  return (
    <div className="dash">
      <header className="dash-head" {...card()}>
        <div>
          <p className="dash-date">{data.dateLabel}</p>
          <h1>{data.name ? `Hola, ${data.name.split(" ")[0]}` : "Tu progreso"} 👋</h1>
        </div>
        {demo ? <span className="chip">Ejemplo</span> : <a className="btn btn-ghost btn-sm" href="/panel/salir">Salir</a>}
      </header>

      {tips.length > 0 && (
        <section className="dash-card dash-tips" {...card()} aria-label="Sugerencias de tu coach">
          <span className="tip-icon" aria-hidden>💡</span>
          <ul>{tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}

      <div className="dash-grid">
        {!data.restricted && data.targets ? (
          <section className="dash-card" {...card()} aria-labelledby="today-title">
            <h2 id="today-title">Hoy</h2>
            <div className="today">
              <CalorieRing eaten={data.totals.kcal} target={data.targets.calories} />
              <div className="macros">
                <MacroBar label="Proteína" value={data.totals.protein} target={data.targets.proteinG} unit="g" tone="protein" />
                <MacroBar label="Carbohidratos" value={data.totals.carbs} target={data.targets.carbsG} unit="g" tone="carbs" />
                <MacroBar label="Grasas" value={data.totals.fat} target={data.targets.fatG} unit="g" tone="fat" />
                <MacroBar label="Fibra" value={data.totals.fiber} target={data.targets.fiberG} unit="g" tone="fiber" />
              </div>
            </div>
            <p className="dash-foot">
              💧 {(data.targets.waterMl / 1000).toFixed(1)} L de agua · 👟 {fmt(data.targets.steps)} pasos
            </p>
          </section>
        ) : (
          <section className="dash-card" {...card()}>
            <h2>Hoy</h2>
            <p className="dash-big">{data.meals.length}</p>
            <p className="muted">{data.meals.length === 1 ? "comida registrada" : "comidas registradas"}</p>
            {!data.restricted && data.missingProfile.length > 0 && (
              <p className="muted">Cuando le digas a tu coach tu {data.missingProfile.join(", ")}, aquí verás tus metas del día.</p>
            )}
          </section>
        )}

        <section className="dash-card" {...card()} aria-labelledby="meals-title">
          <h2 id="meals-title">Comidas de hoy</h2>
          {data.meals.length === 0 ? (
            <p className="muted">Aún no hay comidas. Manda una foto o escribe lo que comiste en WhatsApp.</p>
          ) : (
            <ul className="meals">
              {data.meals.map((m) => (
                <li key={m.id} className="meal">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt="" className="meal-photo" loading="lazy" />
                  ) : (
                    <span className="meal-icon" aria-hidden>{MEAL_ICON[m.type] ?? "🍽️"}</span>
                  )}
                  <div className="meal-body">
                    <p className="meal-type">{MEAL_LABEL[m.type] ?? "Comida"} · {m.time}</p>
                    <p className="meal-desc">{m.description}</p>
                  </div>
                  {!data.restricted && m.kcal !== null && (
                    <p className="meal-kcal">
                      ~{fmt(m.kcal)} <small>kcal</small>
                      {m.protein !== null && <span>{m.protein} g prot.</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!data.restricted && data.meals.length > 0 && <p className="dash-foot">Las calorías son estimaciones.</p>}
        </section>

        {!data.restricted && data.targets && (
          <section className="dash-card" {...card()} aria-labelledby="week-title">
            <h2 id="week-title">Calorías de la semana</h2>
            <WeekBars days={data.days} target={data.targets.calories} />
          </section>
        )}

        {!data.restricted && (
          <section className="dash-card" {...card()} aria-labelledby="weight-title">
            <h2 id="weight-title">Peso</h2>
            {data.weights.length >= 2 ? (
              <>
                <div className="weight-head">
                  <p className="dash-big">{data.weights.at(-1)!.trend.toFixed(1)} <small>kg</small></p>
                  {data.weightChange7d !== null && (
                    <p className="delta">
                      {data.weightChange7d > 0 ? "▲" : data.weightChange7d < 0 ? "▼" : "•"} {Math.abs(data.weightChange7d).toFixed(1)} kg en 7 días
                    </p>
                  )}
                </div>
                <WeightChart points={data.weights} />
                {data.goalWeightKg && <p className="dash-foot">Meta: {data.goalWeightKg} kg · mostramos la tendencia, no cada pesaje.</p>}
              </>
            ) : (
              <p className="muted">Cuéntale tu peso a tu coach un par de veces por semana (en ayunas) y aquí verás tu tendencia.</p>
            )}
          </section>
        )}

        <section className="dash-card" {...card()} aria-labelledby="move-title">
          <h2 id="move-title">Constancia</h2>
          <WeekDots days={data.days} active={data.activeDays} />
          <p className="muted">{data.activeDays.filter(Boolean).length} de 7 días con algo registrado</p>
          <h3 className="sub">Entrenamientos{data.trainingDays ? ` · meta ${data.trainingDays}/semana` : ""}</h3>
          {data.workouts.length ? (
            <ul className="workouts">
              {data.workouts.map((w, k) => (
                <li key={k}>
                  <span className="w-day">{w.label}</span> {w.kind}
                  {w.minutes ? <span className="muted"> · {w.minutes} min</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Cuando entrenes, dile a tu coach qué hiciste y aparecerá aquí.</p>
          )}
        </section>

        {!data.restricted && data.targets && (
          <section className="dash-card" {...card()} aria-labelledby="plan-title">
            <h2 id="plan-title">Tu plan</h2>
            <dl className="plan">
              <div><dt>Calorías al día</dt><dd>{fmt(data.targets.calories)} kcal</dd></div>
              <div><dt>Mantenimiento estimado</dt><dd>{fmt(data.targets.tdee)} kcal</dd></div>
              <div><dt>Proteína</dt><dd>{data.targets.proteinG} g</dd></div>
              <div><dt>Ritmo esperado</dt><dd>{data.targets.weeklyChangeKg ? `${data.targets.weeklyChangeKg > 0 ? "+" : ""}${data.targets.weeklyChangeKg} kg/semana` : "mantener"}</dd></div>
            </dl>
            <p className="dash-foot">
              {data.targets.method === "adaptativo"
                ? "Ajustado con tus propios registros de comida y peso."
                : "Estimado inicial. Se ajusta solo cuando registres comidas y peso durante ~2 semanas."}
            </p>
          </section>
        )}
      </div>

      <p className="dash-legal">
        WhatUpCoach es un coach de nutrición con IA y no sustituye a un profesional de la salud. Para ver datos nuevos, recarga la página.
      </p>
    </div>
  );
}

function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const r = 52;
  const len = 2 * Math.PI * r;
  const pct = Math.min(eaten / target, 1);
  const left = target - eaten;
  return (
    <figure className="ring" aria-label={`${fmt(eaten)} de ${fmt(target)} kilocalorías`}>
      <svg viewBox="0 0 128 128" width="148" height="148" role="img">
        <title>{`${fmt(eaten)} de ${fmt(target)} kcal`}</title>
        <circle cx="64" cy="64" r={r} className="ring-track" />
        <circle
          cx="64" cy="64" r={r}
          className="ring-value"
          strokeDasharray={len}
          style={{ "--len": len, "--off": len * (1 - pct) } as React.CSSProperties}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <figcaption>
        <strong>{fmt(Math.abs(left))}</strong>
        <span>{left >= 0 ? "kcal restantes" : "kcal sobre la meta"}</span>
      </figcaption>
    </figure>
  );
}

function MacroBar({ label, value, target, unit, tone }: { label: string; value: number; target: number; unit: string; tone: string }) {
  const pct = target ? Math.min(value / target, 1) : 0;
  return (
    <div className="macro">
      <div className="macro-top">
        <span>{label}</span>
        <span className="muted">{fmt(value)} / {fmt(target)} {unit}</span>
      </div>
      <div className="bar" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={target}>
        <span className="bar-fill" data-tone={tone} style={{ "--w": `${pct * 100}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}

function WeekBars({ days, target }: { days: DashboardData["days"]; target: number }) {
  const W = 300, H = 150, pad = 22, base = H - 24;
  const max = Math.max(target * 1.15, ...days.map((d) => d.kcal));
  const y = (v: number) => base - (v / max) * (base - pad);
  const bw = 26, gap = (W - 16 - bw * days.length) / (days.length - 1);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Calorías por día de los últimos 7 días">
        <line x1="8" x2={W - 8} y1={y(target)} y2={y(target)} className="ref-line" />
        <text x={W - 8} y={y(target) - 5} className="ref-label" textAnchor="end">Meta {fmt(target)}</text>
        {days.map((d, k) => {
          const x = 8 + k * (bw + gap);
          const h = Math.max(d.kcal ? 4 : 0, base - y(d.kcal));
          return (
            <g key={d.date}>
              <rect x={x} y={base - h} width={bw} height={h} rx="4" className={`wbar${d.isToday ? " today" : ""}`} style={{ "--k": k } as React.CSSProperties}>
                <title>{`${d.label}: ${d.kcal ? `${fmt(d.kcal)} kcal` : "sin registro"}`}</title>
              </rect>
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" className={`axis-label${d.isToday ? " strong" : ""}`}>{d.label}</text>
              {d.isToday && d.kcal > 0 && (
                <text x={x + bw / 2} y={base - h - 6} textAnchor="middle" className="value-label">{fmt(d.kcal)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="table-view">
        <summary>Ver como tabla</summary>
        <table>
          <thead><tr><th>Día</th><th>kcal</th></tr></thead>
          <tbody>{days.map((d) => <tr key={d.date}><td>{d.label}</td><td>{d.kcal ? fmt(d.kcal) : "—"}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function WeightChart({ points }: { points: DashboardData["weights"] }) {
  const W = 320, H = 150, padL = 34, padR = 10, padT = 12, base = H - 22;
  const all = points.flatMap((p) => [p.kg, p.trend]);
  const lo = Math.floor(Math.min(...all) - 0.3), hi = Math.ceil(Math.max(...all) + 0.3);
  const x = (k: number) => padL + (k / Math.max(1, points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (base - padT);
  const path = points.map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(p.trend).toFixed(1)}`).join(" ");
  const short = (d: string) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Peso diario y tendencia">
        {[hi, (hi + lo) / 2, lo].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="grid" />
            <text x={padL - 6} y={y(v) + 4} textAnchor="end" className="axis-label">{v.toFixed(v % 1 ? 1 : 0)}</text>
          </g>
        ))}
        {points.map((p, k) => (
          <circle key={p.date} cx={x(k)} cy={y(p.kg)} r="4" className="wdot">
            <title>{`${short(p.date)}: ${p.kg.toFixed(1)} kg (tendencia ${p.trend.toFixed(1)})`}</title>
          </circle>
        ))}
        <path d={path} className="trend-line" pathLength={1} />
        <text x={padL} y={H - 4} className="axis-label">{short(points[0].date)}</text>
        <text x={W - padR} y={H - 4} className="axis-label" textAnchor="end">{short(points.at(-1)!.date)}</text>
      </svg>
      <p className="legend">
        <span className="lg-dot" aria-hidden /> Pesaje <span className="lg-line" aria-hidden /> Tendencia
      </p>
      <details className="table-view">
        <summary>Ver como tabla</summary>
        <table>
          <thead><tr><th>Fecha</th><th>Peso</th><th>Tendencia</th></tr></thead>
          <tbody>{[...points].reverse().map((p) => <tr key={p.date}><td>{short(p.date)}</td><td>{p.kg.toFixed(1)}</td><td>{p.trend.toFixed(1)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function WeekDots({ days, active }: { days: DashboardData["days"]; active: boolean[] }) {
  return (
    <ol className="dots" aria-label="Días con registro en los últimos 7 días">
      {days.map((d, k) => (
        <li key={d.date} className={active[k] ? "on" : ""} style={{ "--k": k } as React.CSSProperties}>
          <span className="dot" aria-hidden>{active[k] ? "✓" : ""}</span>
          <span className="axis-label">{d.label}</span>
          <span className="sr-only">{active[k] ? "con registro" : "sin registro"}</span>
        </li>
      ))}
    </ol>
  );
}
