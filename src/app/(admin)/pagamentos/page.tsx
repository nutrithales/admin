import { listPacientesResumo } from "@/services/pacientes.queries";
import { listPagamentos } from "@/services/pagamentos";
import { PagamentosClient } from "./PagamentosClient";
export const metadata = { title: "Pagamentos" };
export default async function PagamentosPage(){ const [pagamentos,pacientes]=await Promise.all([listPagamentos(),listPacientesResumo()]); return <PagamentosClient initialPagamentos={pagamentos} pacientes={pacientes}/>; }