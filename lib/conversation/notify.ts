import { db } from "@/lib/supabase/server";
import { sendText } from "@/lib/whatsapp/client";

/**
 * Sends a WhatsApp message that isn't a reply to a just-received message (e.g. from the Stripe webhook).
 * WhatsApp only allows free-form messages within 24 h of the user's last message; outside that window
 * this fails (approved templates come in the reminders milestone), so failures are logged, not thrown.
 */
export async function notifyUser(userId: string, text: string): Promise<boolean> {
  const { data: user } = await db().from("users").select("id, wa_id").eq("id", userId).maybeSingle();
  if (!user) return false;
  try {
    const ids = await sendText(user.wa_id as string, text);
    await db().from("messages").insert({ user_id: userId, direction: "out", wa_message_id: ids[0] ?? null, type: "text", body: text });
    return true;
  } catch (err) {
    console.warn(`notifyUser failed for ${userId}`, err);
    return false;
  }
}
