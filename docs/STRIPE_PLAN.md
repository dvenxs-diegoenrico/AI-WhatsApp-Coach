# Plan de integración con Stripe (Billing, Invoicing, Tax)

Basado en las guías oficiales de Stripe (`stripe-best-practices`: billing, tax, security) y adaptado a WhatUpCoach:
suscripción digital de $199 MXN/mes o $1,490 MXN/año, prueba de 3 días con tarjeta, usuarios en México y otros
países de habla hispana, todo dentro de WhatsApp.

## Arquitectura (ya construida)

```
WhatsApp ──"MI CUENTA"/fin de prueba──► enlace firmado /pagar
   /pagar ──► /api/checkout ──► Stripe Checkout (mode: subscription, prueba 3 días, tarjeta obligatoria)
   Stripe ──webhook──► /api/stripe/webhook ──► tabla subscriptions ──► acceso en el bot + aviso por WhatsApp
   "MI CUENTA" ──► /api/cuenta ──► Customer Portal (cambiar plan, tarjeta, cancelar)
```

| Recomendación de Stripe | Estado |
|---|---|
| Billing APIs + **Checkout Sessions** (`mode: subscription`), no PaymentIntents manuales | ✅ |
| **Customer Portal** para autoservicio | ✅ |
| **Un Product con dos Prices** (mensual/anual son variantes del mismo plan) | ✅ (se crea en el Dashboard) |
| **No pasar `payment_method_types`** (métodos dinámicos desde el Dashboard) | ✅ |
| Instancia de cliente (`new Stripe(key)`), no clave global | ✅ |
| Última versión de API/SDK (`stripe` 23, API `2026-10-28.endive`) | ✅ |
| **Webhook obligatorio** con firma verificada e idempotencia por `event.id` | ✅ |
| Eventos de ciclo de vida: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed` | ✅ |
| Pagos asíncronos: `checkout.session.async_payment_succeeded`, confirmar solo con `payment_status` pagado | ✅ |
| Eventos de riesgo: `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created` | ✅ (se registran en Vercel Logs como "STRIPE ACTION NEEDED") |
| Mapear eventos por el grafo de objetos (Customer → usuario), `metadata` solo como respaldo | ✅ |
| `integration_identifier` en Checkout Sessions | ✅ `whatupcoach-suscripcion-qkmvrtla` |
| **Sandbox** para desarrollo (no el "test mode" compartido) | 📋 paso manual (abajo) |
| **Clave restringida** (`rk_…`) en lugar de la secreta (`sk_…`) | 📋 paso manual (abajo) |
| Stripe Tax con registro activo antes de `automatic_tax` | 📋 se activa con `STRIPE_AUTOMATIC_TAX=true` cuando tengas el registro |

## Pasos manuales en Stripe

### 1. Sandbox para probar
Dashboard → selector de cuenta (arriba a la izquierda) → **Sandboxes → Create sandbox** ("whatupcoach-dev").
Todo lo de abajo se hace primero en el sandbox; para producción se repite en modo real.

### 2. Producto y precios
**Product catalog → Add product**: "WhatUpCoach – Coach de nutrición con IA".
- Precio mensual: **199.00 MXN**, recurrente, mensual, **tax behavior: inclusive** (el IVA ya va dentro).
- Precio anual: **1,490.00 MXN**, recurrente, anual, **inclusive**.
- **Código fiscal del producto**: elige con tu contador entre `txcd_10103001` (SaaS – uso personal) o
  `txcd_10000000` (servicios suministrados electrónicamente). No pongas la prueba de 3 días en el precio: la pone el código.

### 3. Clave restringida (más segura que la secreta)
Developers → API keys → **Create restricted key** ("whatupcoach-server") con estos permisos:

| Recurso | Permiso |
|---|---|
| Checkout Sessions | Write |
| Customers | Write |
| Subscriptions | Write (cancelar cuando el usuario borra sus datos) |
| Customer portal | Write |
| Prices, Products | Read |
| Invoices, Charges, Disputes | Read |
| Tax (settings, registrations, calculations) | Read |

Pégala en Vercel como `STRIPE_SECRET_KEY` (el código acepta `rk_…` igual que `sk_…`).

### 4. Webhook
Developers → Webhooks → **Add endpoint**: `https://whatupcoach.vercel.app/api/stripe/webhook`. Eventos:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`,
`charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created`.
Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

### 5. Customer Portal
Settings → Billing → **Customer portal**: actualizar método de pago ✅, cancelar al final del periodo ✅,
cambiar entre mensual y anual ✅, historial de facturas ✅.

### 6. Cobros fallidos y correos (Invoicing)
- Settings → Billing → **Subscriptions and emails**: reintentos inteligentes; si todos fallan → **cancelar la suscripción**.
- Settings → **Customer emails**: recibos de pago exitoso ✅, facturas/recibos de suscripción ✅, aviso de tarjeta por vencer ✅.
- Settings → **Branding**: logo (`public/brand/whatupcoach-logo-1024.png`), color `#238554`. Las facturas de Stripe lo usan.
- Settings → Billing → **Invoice template**: pie con "WhatUpCoach no sustituye atención médica" y tu correo de soporte.

### 7. Impuestos (Stripe Tax)
1. **Tax → Settings**: domicilio fiscal (head office). Sin esto, Tax queda en `pending` y no calcula nada.
2. **Tax → Locations → Add registration**: registra **México (IVA)** con tu RFC **solo si ya estás dado de alta en el SAT**.
   Agregarlo en Stripe no te da de alta ante el SAT; solo le dice a Stripe dónde ya cobras impuestos.
3. Confirma que aparece como **Collecting**. Entonces pon `STRIPE_AUTOMATIC_TAX=true` en Vercel y haz Redeploy.
4. **Revisa una compra de prueba**: en el sandbox, la sesión debe mostrar el IVA desglosado dentro de los $199.
   Si sale 0, revisa el registro y el código fiscal (ver "Diagnose zero tax" en la guía de Stripe Tax).
5. Clientes fuera de México: Stripe no cobra impuesto donde no tienes registro. **Tax → Locations → Needs attention**
   te avisa si te acercas a un umbral en otro país; decide con tu contador.

> ⚠️ Activar `automatic_tax` sin un registro activo **no da error y no cobra impuesto**. Es el error más común.

### 8. Factura electrónica mexicana (CFDI)
Stripe genera **recibos y facturas de Stripe**, pero **no timbra CFDI ante el SAT**. Si tus clientes piden factura:
- Opción simple al inicio: emitirla manualmente desde el portal del SAT o tu sistema contable cuando la pidan.
- Opción automática (siguiente milestone): conectar un PAC (por ejemplo Facturapi o Facturama) en el evento `invoice.paid`
  para usuarios que registren su RFC. Decídelo con tu contador.

### 9. Probar
Tarjeta `4242 4242 4242 4242` (cualquier fecha futura y CVC). Fallo de pago: `4000 0000 0000 0341`.
Disputa: `4000 0000 0000 0259`. Revisa en Vercel → Logs las líneas `STRIPE ACTION NEEDED` para disputas y reembolsos.
Usa **test clocks** (Billing → Test clocks) para adelantar el fin de la prueba de 3 días y ver la primera renovación.

### 10. Antes de producción ([Go-live checklist](https://docs.stripe.com/get-started/checklist/go-live.md))
Activar la cuenta (RFC, CLABE, identificación), repetir pasos 2–7 en modo real con nuevas claves y webhook,
datos legales y número real en el sitio, Vercel Pro, y una compra real de prueba que luego reembolsas.
