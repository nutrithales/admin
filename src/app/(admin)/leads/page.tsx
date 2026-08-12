import { listLeads } from "@/services/leads.queries";
import { LeadsClient } from "./LeadsClient";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  return <LeadsClient initialLeads={await listLeads()} />;
}
