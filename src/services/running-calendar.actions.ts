"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { disableCalendarLink, issueCalendarLink } from "./running-calendar";

export async function createRunningCalendar(input: unknown) {
  const parsed = z.object({ consent: z.literal(true), rotate: z.boolean() }).strict().safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Confirme o compartilhamento dos seus treinos." };
  try {
    const link = await issueCalendarLink(parsed.data.consent, parsed.data.rotate);
    revalidatePath("/paciente/corrida/garmin");
    return { success: true as const, ...link };
  } catch (error) { return { success: false as const, message: error instanceof Error ? error.message : "Não foi possível gerar o link." }; }
}
export async function revokeRunningCalendar() {
  try { await disableCalendarLink(); revalidatePath("/paciente/corrida/garmin"); return { success: true as const }; }
  catch { return { success: false as const, message: "Não foi possível desativar. Tente novamente." }; }
}
