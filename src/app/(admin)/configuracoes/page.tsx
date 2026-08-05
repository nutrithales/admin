import { getConfiguracoes, getLogoPublicUrl } from "@/services/configuracoes.queries";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const config = await getConfiguracoes();
  const logoUrl = getLogoPublicUrl(config?.logo_path ?? null);

  return <ConfiguracoesClient config={config} logoUrl={logoUrl} />;
}
