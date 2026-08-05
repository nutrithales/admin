/**
 * Matches the real schema in the Nutri Thales Rosa Supabase project
 * (inspected directly via the Supabase MCP tools — this is NOT a guessed
 * schema). Several tables predate this admin panel and are shared with
 * other patient-facing apps (paginas_paciente, biblioteca, planos_alimentares,
 * consultas, checkins, historico_ia, diario, treino_sessions all link a
 * patient via `auth_id`/`user_id`, the Supabase Auth user id — not through
 * a `pacientes.id` foreign key). Once linked, regenerate with:
 *   supabase gen types typescript --linked > src/types/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      administradores: {
        Row: {
          id: string;
          auth_id: string;
          nome: string | null;
          nivel: string | null;
          foto_url: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          nome?: string | null;
          nivel?: string | null;
          foto_url?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          nome?: string | null;
          nivel?: string | null;
          foto_url?: string | null;
        };
        Relationships: [];
      };
      pacientes: {
        Row: {
          id: string;
          auth_id: string;
          nome: string | null;
          email: string | null;
          telefone: string | null;
          cpf: string | null;
          plano: string | null;
          data_inicio: string | null;
          status: string | null;
          created_at: string | null;
          last_login_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          nome?: string | null;
          email?: string | null;
          telefone?: string | null;
          cpf?: string | null;
          plano?: string | null;
          data_inicio?: string | null;
          status?: string | null;
          created_at?: string | null;
          last_login_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          nome?: string | null;
          email?: string | null;
          telefone?: string | null;
          cpf?: string | null;
          plano?: string | null;
          data_inicio?: string | null;
          status?: string | null;
          created_at?: string | null;
          last_login_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      paginas_paciente: {
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          url_pagina: string;
          tipo: string;
          icone: string | null;
          ordem: number;
          ativo: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          titulo: string;
          url_pagina: string;
          tipo?: string;
          icone?: string | null;
          ordem?: number;
          ativo?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          url_pagina?: string;
          tipo?: string;
          icone?: string | null;
          ordem?: number;
          ativo?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "paginas_paciente_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      biblioteca: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          categoria: string | null;
          url: string | null;
          ordem: number | null;
          ativo: boolean | null;
          created_at: string | null;
          tipo: "pdf" | "video" | "link" | "html" | (string & {});
          bucket: string | null;
          path: string | null;
          thumbnail_path: string | null;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao?: string | null;
          categoria?: string | null;
          url?: string | null;
          ordem?: number | null;
          ativo?: boolean | null;
          created_at?: string | null;
          tipo?: string;
          bucket?: string | null;
          path?: string | null;
          thumbnail_path?: string | null;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string | null;
          categoria?: string | null;
          url?: string | null;
          ordem?: number | null;
          ativo?: boolean | null;
          created_at?: string | null;
          tipo?: string;
          bucket?: string | null;
          path?: string | null;
          thumbnail_path?: string | null;
        };
        Relationships: [];
      };
      planos_alimentares: {
        Row: {
          id: string;
          auth_id: string;
          titulo: string | null;
          bucket: string | null;
          path: string | null;
          data_envio: string | null;
          ativo: boolean | null;
          tipo: "pdf" | "html" | (string & {});
          conteudo_html: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          titulo?: string | null;
          bucket?: string | null;
          path?: string | null;
          data_envio?: string | null;
          ativo?: boolean | null;
          tipo?: string;
          conteudo_html?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          titulo?: string | null;
          bucket?: string | null;
          path?: string | null;
          data_envio?: string | null;
          ativo?: boolean | null;
          tipo?: string;
          conteudo_html?: string | null;
        };
        Relationships: [];
      };
      consultas: {
        Row: {
          id: string;
          auth_id: string;
          data: string | null;
          tipo: string | null;
          status: string | null;
          observacoes: string | null;
          google_event_id: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          data?: string | null;
          tipo?: string | null;
          status?: string | null;
          observacoes?: string | null;
          google_event_id?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          data?: string | null;
          tipo?: string | null;
          status?: string | null;
          observacoes?: string | null;
          google_event_id?: string | null;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          id: number;
          auth_id: string;
          semana: string | null;
          resumo: string | null;
          pontuacao: number | null;
          created_at: string | null;
          origem: string;
        };
        Insert: {
          id?: number;
          auth_id: string;
          semana?: string | null;
          resumo?: string | null;
          pontuacao?: number | null;
          created_at?: string | null;
          origem?: string;
        };
        Update: {
          id?: number;
          auth_id?: string;
          semana?: string | null;
          resumo?: string | null;
          pontuacao?: number | null;
          created_at?: string | null;
          origem?: string;
        };
        Relationships: [];
      };
      historico_ia: {
        Row: {
          id: string;
          auth_id: string;
          pergunta: string | null;
          resposta: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          pergunta?: string | null;
          resposta?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          pergunta?: string | null;
          resposta?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      configuracoes_consultorio: {
        Row: {
          id: boolean;
          nome_consultorio: string | null;
          logo_path: string | null;
          endereco: string | null;
          whatsapp: string | null;
          email: string | null;
          redes_sociais: Json;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          nome_consultorio?: string | null;
          logo_path?: string | null;
          endereco?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          redes_sociais?: Json;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          nome_consultorio?: string | null;
          logo_path?: string | null;
          endereco?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          redes_sociais?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
