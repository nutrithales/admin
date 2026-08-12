import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FormularioResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  ativo: boolean;
  recorrencia_dias: number | null;
  created_at: string;
  perguntas?: Array<{
    id: string;
    ordem: number;
    chave: string;
    titulo: string;
    tipo: string;
    obrigatoria: boolean;
    opcoes: unknown;
    minimo: number | null;
    maximo: number | null;
  }>;
};

export type EnvioFormularioResumo = {
  id: string;
  status: string;
  canal: string;
  token: string;
  agendado_para: string;
  enviado_em: string | null;
  respondido_em: string | null;
  expira_em: string;
  ultimo_erro: string | null;
  formulario: { id: string; nome: string; tipo: string } | null;
  paciente: { id: string; nome: string | null; telefone: string | null } | null;
};

export async function listFormularios(): Promise<FormularioResumo[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("formularios")
    .select("*, perguntas:formulario_perguntas(*)")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Erro ao carregar formulários: ${error.message}`);

  return (data ?? []).map((f: any) => ({
    ...f,
    perguntas: [...(f.perguntas ?? [])].sort((a: any, b: any) => a.ordem - b.ordem),
  }));
}

export async function listEnviosFormularios(limit = 100): Promise<EnvioFormularioResumo[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("formulario_envios")
    .select("id,status,canal,token,agendado_para,enviado_em,respondido_em,expira_em,ultimo_erro, formulario:formularios(id,nome,tipo), paciente:pacientes(id,nome,telefone)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Erro ao carregar envios: ${error.message}`);
  return (data ?? []) as EnvioFormularioResumo[];
}
