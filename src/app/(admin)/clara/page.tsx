import { syncPendencias } from "@/services/pendencias.actions";
import { listPendenciasAtivas } from "@/services/pendencias.queries";
import { listTarefasPendentes } from "@/services/tarefas.queries";
import { listConsultasDoIntervalo, inicioDoDia, fimDoDia } from "@/services/clara.queries";
import { listPacientesResumo } from "@/services/pacientes.queries";
import { listPacientesForSelect } from "@/services/paginas.queries";
import { listMensagensModelos } from "@/services/mensagens.queries";
import { listLeadFollowupsPendentes } from "@/services/leads.queries";
import { ClaraClient } from "./ClaraClient";

export const metadata = { title: "Maria" };
export default async function ClaraPage(){await syncPendencias();const[consultasHoje,pendencias,tarefas,pacientesResumo,pacientesParaConsulta,mensagens,leadFollowups]=await Promise.all([listConsultasDoIntervalo(inicioDoDia(),fimDoDia()),listPendenciasAtivas(),listTarefasPendentes(),listPacientesResumo(),listPacientesForSelect(),listMensagensModelos(),listLeadFollowupsPendentes()]);return <ClaraClient consultasHoje={consultasHoje} pendencias={pendencias} tarefas={tarefas} pacientesResumo={pacientesResumo} pacientesParaConsulta={pacientesParaConsulta} mensagens={mensagens} leadFollowups={leadFollowups}/>;}
