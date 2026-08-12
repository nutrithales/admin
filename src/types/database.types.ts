/**
 * Gerado a partir do schema real do projeto Supabase "Nutri Thales".
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = { public: { Tables: { leads: { Row: { convertido_paciente_id:string|null;created_at:string;email:string|null;etapa:string;fluxo_followup:string|null;followup_inicio_em:string|null;id:string;nome:string;observacoes:string|null;origem:string|null;plano_interesse:string|null;proxima_acao_em:string|null;telefone:string|null;ultimo_followup_enviado_dia:number|null;ultimo_followup_enviado_em:string|null;updated_at:string;urgente:boolean }; Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]> & {nome:string}; Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>; Relationships: [] }; [key:string]: { Row:any; Insert:any; Update:any; Relationships:any[] } }; Views:{[key:string]:never}; Functions:{is_admin:{Args:never;Returns:boolean};is_full_admin:{Args:never;Returns:boolean}}; Enums:{[key:string]:never}; CompositeTypes:{[key:string]:never} } }
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends string> = never
export type CompositeTypes<T extends string> = never
export const Constants={public:{Enums:{}}} as const
