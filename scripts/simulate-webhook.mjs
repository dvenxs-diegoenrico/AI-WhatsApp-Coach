// Sends a fake, correctly signed WhatsApp text message to your local (or deployed) webhook.
//
//   npm run simulate -- "Hola A"
//   npm run simulate -- "25"
//
// Uses WHATSAPP_APP_SECRET and WHATSAPP_PHONE_NUMBER_ID from .env.local.
// Optional: SIMULATE_URL (default http://localhost:3000/api/whatsapp/webhook)
//           SIMULATE_FROM (default 5215500000000, a fake Mexican number)
// Tip: set WHATSAPP_DRY_RUN=true so replies are printed in the `npm run dev` terminal instead of sent.
import { createHmac, randomUUID } from "node:crypto";

const text = process.argv.slice(2).join(" ") || "Hola A";
const url = process.env.SIMULATE_URL ?? "http://localhost:3000/api/whatsapp/webhook";
const from = process.env.SIMULATE_FROM ?? "5215500000000";
const secret = process.env.WHATSAPP_APP_SECRET;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
if (!secret || !phoneNumberId) {
  console.error("Set WHATSAPP_APP_SECRET and WHATSAPP_PHONE_NUMBER_ID in .env.local first.");
  process.exit(1);
}

const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{
    id: "simulated",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: "15550000000", phone_number_id: phoneNumberId },
        contacts: [{ wa_id: from, profile: { name: "Prueba" } }],
        messages: [{ id: `wamid.sim.${randomUUID()}`, from, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: text } }],
      },
    }],
  }],
});

const signature = "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature }, body });
console.log(`${res.status} ${await res.text()}  ← sent "${text}" from ${from}`);
