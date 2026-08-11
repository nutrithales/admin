export interface AgendaEventInfo {
  paciente?: string;
  whatsapp?: string;
  email?: string;
  plano?: string;
  modalidade?: string;
}

/** A agenda pública descreve cada evento como texto livre no formato
 * "Rótulo: valor" por linha (nome, whatsapp, e-mail, plano, modalidade).
 * Usado tanto no cliente (exibição) quanto no servidor (para vincular um
 * evento sem consulta correspondente a um paciente já cadastrado). */
export function parseAgendaDescription(description = ""): AgendaEventInfo {
  const aliases: Record<string, keyof AgendaEventInfo> = {
    paciente: "paciente",
    whatsapp: "whatsapp",
    "whats app": "whatsapp",
    email: "email",
    "e-mail": "email",
    plano: "plano",
    modalidade: "modalidade",
  };
  const info: AgendaEventInfo = {};

  for (const line of description.split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const label = line.slice(0, separator).trim().toLowerCase();
    const key = aliases[label];
    if (key) info[key] = line.slice(separator + 1).trim();
  }

  return info;
}

export function onlyDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}
