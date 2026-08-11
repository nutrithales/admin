import { getConfiguracoes, getLogoPublicUrl } from "@/services/configuracoes.queries";
import { listMensagensModelos } from "@/services/mensagens.queries";
import { ConfiguracoesClient } from "./ConfiguracoesClient";
import { MensagensModelosSection } from "./MensagensModelosSection";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const [config, modelos] = await Promise.all([getConfiguracoes(), listMensagensModelos()]);
  const logoUrl = getLogoPublicUrl(config?.logo_path ?? null);

  return (
    <div className="flex flex-col gap-6">
      <ConfiguracoesClient config={config} logoUrl={logoUrl} />
      <MensagensModelosSection modelos={modelos} />
    </div>
  );
}
