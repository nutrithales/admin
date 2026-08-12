import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCheckinDetalhe } from "@/services/checkins.queries";
import { CheckinDetailClient } from "./CheckinDetailClient";

export const metadata = { title: "Revisar Check-in" };

const CHECKIN_GPT_URL = "https://chatgpt.com/g/g-6a7cafe17184819196aad68445c4c67c-assistentente-check-in-thales-rosa";

export default async function CheckinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const data = await getCheckinDetalhe(numericId);
  if (!data) notFound();

  const chatgptUrl = process.env.NEXT_PUBLIC_CHATGPT_CHECKIN_URL || CHECKIN_GPT_URL;

  return (
    <div>
      <PageHeader
        title={`Check-in · ${data.paciente?.nome ?? "Paciente"}`}
        description="Revise as respostas, gere a análise, prepare as orientações dos próximos 15 dias e envie pelo WhatsApp."
      />
      <CheckinDetailClient {...data} chatgptUrl={chatgptUrl} />
    </div>
  );
}
