import { notFound } from "next/navigation";
import { getPlanoEstruturado } from "@/services/planos-estruturados.queries";
import { PlanoBuilderClient } from "./PlanoBuilderClient";

export const metadata = { title: "Montar plano" };

export default async function PlanoBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plano = await getPlanoEstruturado(id);
  if (!plano) notFound();

  return <PlanoBuilderClient plano={plano} />;
}
