import { listAllLeads, listLeads } from "@/services/leads.queries";
import { LeadsClient } from "./LeadsClient";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const [initialLeads, leadHistory] = await Promise.all([listLeads(), listAllLeads()]);
  return <LeadsClient initialLeads={initialLeads} leadHistory={leadHistory} />;
}
