import { normalize } from "@/lib/safety/normalize";

export type Command = "delete_request" | "delete_confirm" | "stop_reminders";

/** Commands only trigger when they are the whole message (so normal chat isn't misread). */
export function detectCommand(text: string): Command | null {
  const n = normalize(text).replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  if (/^(borra|borrar|elimina|eliminar) (todos )?mis datos$/.test(n)) return "delete_request";
  if (/^(confirmo|si confirmo) borrar$/.test(n)) return "delete_confirm";
  if (/^(alto|stop|baja|ya no me mandes recordatorios|no mas recordatorios|detener recordatorios|cancelar recordatorios)$/.test(n))
    return "stop_reminders";
  return null;
}

export const DELETE_CONFIRM_WINDOW_MS = 10 * 60 * 1000;
