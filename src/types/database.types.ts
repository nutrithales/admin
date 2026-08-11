/**
 * Gerado a partir do schema real do projeto Supabase "Nutri Thales"
 * (`supabase gen types typescript --linked`, via Supabase MCP) — inclui
 * as migrações 0001–0004 já aplicadas. Regenere com o mesmo comando
 * sempre que uma nova migração for aplicada.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      administradores: {
        Row: {
          auth_id: string
          foto_url: string | null
          id: string
          nivel: string | null
          nome: string | null
        }
        Insert: {
          auth_id?: string
          foto_url?: string | null
          id?: string
          nivel?: string | null
          nome?: string | null
        }
        Update: {
          auth_id?: string
          foto_url?: string | null
          id?: string
          nivel?: string | null
          nome?: string | null
        }
        Relationships: []
      }
      alimentos: {
        Row: {
          acucares_100g: number | null
          alergenos: string[]
          ativo: boolean
          calcio_100g: number | null
          carboidrato_100g: number
          carga_glicemica: number | null
          categoria: string | null
          created_at: string
          fator_coccao: number | null
          fator_correcao: number | null
          ferro_100g: number | null
          fibra_100g: number | null
          gordura_100g: number
          grupo_alimentar: string | null
          id: string
          indice_glicemico: number | null
          ingredientes: string | null
          kcal_100g: number
          magnesio_100g: number | null
          marca: string | null
          medidas_caseiras: Json
          nome: string
          observacoes: string | null
          origem: string
          origem_referencia: string | null
          porcao_padrao_g: number | null
          potassio_100g: number | null
          proteina_100g: number
          revisado_manualmente: boolean
          sinonimos: string[]
          sodio_100g: number | null
          tags_restricao: string[]
          unidade_padrao: string | null
          vitamina_a_100g: number | null
          vitamina_c_100g: number | null
        }
        Insert: {
          acucares_100g?: number | null
          alergenos?: string[]
          ativo?: boolean
          calcio_100g?: number | null
          carboidrato_100g?: number
          carga_glicemica?: number | null
          categoria?: string | null
          created_at?: string
          fator_coccao?: number | null
          fator_correcao?: number | null
          ferro_100g?: number | null
          fibra_100g?: number | null
          gordura_100g?: number
          grupo_alimentar?: string | null
          id?: string
          indice_glicemico?: number | null
          ingredientes?: string | null
          kcal_100g?: number
          magnesio_100g?: number | null
          marca?: string | null
          medidas_caseiras?: Json
          nome: string
          observacoes?: string | null
          origem: string
          origem_referencia?: string | null
          porcao_padrao_g?: number | null
          potassio_100g?: number | null
          proteina_100g?: number
          revisado_manualmente?: boolean
          sinonimos?: string[]
          sodio_100g?: number | null
          tags_restricao?: string[]
          unidade_padrao?: string | null
          vitamina_a_100g?: number | null
          vitamina_c_100g?: number | null
        }
        Update: {
          acucares_100g?: number | null
          alergenos?: string[]
          ativo?: boolean
          calcio_100g?: number | null
          carboidrato_100g?: number
          carga_glicemica?: number | null
          categoria?: string | null
          created_at?: string
          fator_coccao?: number | null
          fator_correcao?: number | null
          ferro_100g?: number | null
          fibra_100g?: number | null
          gordura_100g?: number
          grupo_alimentar?: string | null
          id?: string
          indice_glicemico?: number | null
          ingredientes?: string | null
          kcal_100g?: number
          magnesio_100g?: number | null
          marca?: string | null
          medidas_caseiras?: Json
          nome?: string
          observacoes?: string | null
          origem?: string
          origem_referencia?: string | null
          porcao_padrao_g?: number | null
          potassio_100g?: number | null
          proteina_100g?: number
          revisado_manualmente?: boolean
          sinonimos?: string[]
          sodio_100g?: number | null
          tags_restricao?: string[]
          unidade_padrao?: string | null
          vitamina_a_100g?: number | null
          vitamina_c_100g?: number | null
        }
        Relationships: []
      }
      avaliacoes_fisicas: {
        Row: {
          altura_cm: number | null
          auth_id: string
          bucket: string | null
          circunferencia_braco_cm: number | null
          circunferencia_cintura_cm: number | null
          circunferencia_coxa_cm: number | null
          circunferencia_quadril_cm: number | null
          consulta_id: string | null
          created_at: string
          data: string
          disponibilizado_em: string | null
          disponivel_paciente: boolean
          id: string
          interpretacao_ia: string | null
          massa_gorda_kg: number | null
          massa_magra_kg: number | null
          medidas_extra: Json
          path: string | null
          percentual_gordura: number | null
          peso_kg: number | null
          resumo_paciente: string | null
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          auth_id: string
          bucket?: string | null
          circunferencia_braco_cm?: number | null
          circunferencia_cintura_cm?: number | null
          circunferencia_coxa_cm?: number | null
          circunferencia_quadril_cm?: number | null
          consulta_id?: string | null
          created_at?: string
          data?: string
          disponibilizado_em?: string | null
          disponivel_paciente?: boolean
          id?: string
          interpretacao_ia?: string | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          medidas_extra?: Json
          path?: string | null
          percentual_gordura?: number | null
          peso_kg?: number | null
          resumo_paciente?: string | null
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          auth_id?: string
          bucket?: string | null
          circunferencia_braco_cm?: number | null
          circunferencia_cintura_cm?: number | null
          circunferencia_coxa_cm?: number | null
          circunferencia_quadril_cm?: number | null
          consulta_id?: string | null
          created_at?: string
          data?: string
          disponibilizado_em?: string | null
          disponivel_paciente?: boolean
          id?: string
          interpretacao_ia?: string | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          medidas_extra?: Json
          path?: string | null
          percentual_gordura?: number | null
          peso_kg?: number | null
          resumo_paciente?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fisicas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_resumos_paciente: {
        Row: {
          auth_id: string
          avaliacao_id: string
          disponibilizado_em: string
          id: string
          resumo: string
        }
        Insert: {
          auth_id: string
          avaliacao_id: string
          disponibilizado_em?: string
          id?: string
          resumo: string
        }
        Update: {
          auth_id?: string
          avaliacao_id?: string
          disponibilizado_em?: string
          id?: string
          resumo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_resumos_paciente_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "avaliacoes_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca: {
        Row: {
          ativo: boolean | null
          bucket: string | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          ordem: number | null
          path: string | null
          thumbnail_path: string | null
          tipo: string
          titulo: string
          url: string | null
        }
        Insert: {
          ativo?: boolean | null
          bucket?: string | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          path?: string | null
          thumbnail_path?: string | null
          tipo?: string
          titulo: string
          url?: string | null
        }
        Update: {
          ativo?: boolean | null
          bucket?: string | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          path?: string | null
          thumbnail_path?: string | null
          tipo?: string
          titulo?: string
          url?: string | null
        }
        Relationships: []
      }
      checkins: {
        Row: {
          auth_id: string
          created_at: string | null
          id: number
          origem: string
          pontuacao: number | null
          resumo: string | null
          semana: string | null
        }
        Insert: {
          auth_id?: string
          created_at?: string | null
          id?: number
          origem?: string
          pontuacao?: number | null
          resumo?: string | null
          semana?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          id?: number
          origem?: string
          pontuacao?: number | null
          resumo?: string | null
          semana?: string | null
        }
        Relationships: []
      }
      configuracoes_consultorio: {
        Row: {
          email: string | null
          endereco: string | null
          id: boolean
          logo_path: string | null
          nome_consultorio: string | null
          redes_sociais: Json
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          email?: string | null
          endereco?: string | null
          id?: boolean
          logo_path?: string | null
          nome_consultorio?: string | null
          redes_sociais?: Json
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          email?: string | null
          endereco?: string | null
          id?: boolean
          logo_path?: string | null
          nome_consultorio?: string | null
          redes_sociais?: Json
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      consulta_prontuarios: {
        Row: {
          consulta_id: string
          created_at: string
          id: string
          prontuario: string | null
          resumo_granola: string | null
          updated_at: string
        }
        Insert: {
          consulta_id: string
          created_at?: string
          id?: string
          prontuario?: string | null
          resumo_granola?: string | null
          updated_at?: string
        }
        Update: {
          consulta_id?: string
          created_at?: string
          id?: string
          prontuario?: string | null
          resumo_granola?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulta_prontuarios_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: true
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas: {
        Row: {
          auth_id: string
          created_at: string
          data: string | null
          google_event_id: string | null
          id: string
          modalidade: string | null
          observacoes: string | null
          origem: string
          status: string | null
          tipo: string | null
        }
        Insert: {
          auth_id?: string
          created_at?: string
          data?: string | null
          google_event_id?: string | null
          id?: string
          modalidade?: string | null
          observacoes?: string | null
          origem?: string
          status?: string | null
          tipo?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string
          data?: string | null
          google_event_id?: string | null
          id?: string
          modalidade?: string | null
          observacoes?: string | null
          origem?: string
          status?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      diario: {
        Row: {
          created_at: string
          id: string
          valor: Json | null
        }
        Insert: {
          created_at?: string
          id: string
          valor?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          valor?: Json | null
        }
        Relationships: []
      }
      documentos_biblioteca: {
        Row: {
          auth_id: string | null
          bucket: string
          created_at: string
          erro_mensagem: string | null
          id: string
          nome_arquivo: string
          path: string | null
          resumo_extracao: Json
          status: string
          tipo_arquivo: string
        }
        Insert: {
          auth_id?: string | null
          bucket?: string
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          nome_arquivo: string
          path?: string | null
          resumo_extracao?: Json
          status?: string
          tipo_arquivo: string
        }
        Update: {
          auth_id?: string | null
          bucket?: string
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          nome_arquivo?: string
          path?: string | null
          resumo_extracao?: Json
          status?: string
          tipo_arquivo?: string
        }
        Relationships: []
      }
      historico_ia: {
        Row: {
          auth_id: string
          created_at: string | null
          id: string
          pergunta: string | null
          resposta: string | null
        }
        Insert: {
          auth_id?: string
          created_at?: string | null
          id?: string
          pergunta?: string | null
          resposta?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          id?: string
          pergunta?: string | null
          resposta?: string | null
        }
        Relationships: []
      }
      formularios_pre_consulta: {
        Row: {
          auth_id: string
          consentimento_dados_saude: boolean
          id: string
          paciente_id: string
          respondido_em: string | null
          respostas: Json
          solicitado_em: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_id: string
          consentimento_dados_saude?: boolean
          id?: string
          paciente_id: string
          respondido_em?: string | null
          respostas?: Json
          solicitado_em?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string
          consentimento_dados_saude?: boolean
          id?: string
          paciente_id?: string
          respondido_em?: string | null
          respostas?: Json
          solicitado_em?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formularios_pre_consulta_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: true
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          altura_cm: number | null
          auth_id: string
          cpf: string | null
          consultas_incluidas: number
          consultas_realizadas_iniciais: number
          created_at: string | null
          data_inicio: string | null
          data_nascimento: string | null
          email: string | null
          fluxo_etapa: string
          fluxo_observacoes: string | null
          fluxo_proxima_acao_em: string | null
          fluxo_updated_at: string
          fluxo_urgente: boolean
          id: string
          last_login_at: string | null
          nivel_atividade: string | null
          nome: string | null
          objetivo: string | null
          peso_kg: number | null
          plano: string | null
          preferencias_alimentares: string | null
          restricoes_alimentares: string[]
          status: string | null
          telefone: string | null
          treino_frequencia_semanal: number | null
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          auth_id?: string
          cpf?: string | null
          consultas_incluidas?: number
          consultas_realizadas_iniciais?: number
          created_at?: string | null
          data_inicio?: string | null
          data_nascimento?: string | null
          email?: string | null
          fluxo_etapa?: string
          fluxo_observacoes?: string | null
          fluxo_proxima_acao_em?: string | null
          fluxo_updated_at?: string
          fluxo_urgente?: boolean
          id?: string
          last_login_at?: string | null
          nivel_atividade?: string | null
          nome?: string | null
          objetivo?: string | null
          peso_kg?: number | null
          plano?: string | null
          preferencias_alimentares?: string | null
          restricoes_alimentares?: string[]
          status?: string | null
          telefone?: string | null
          treino_frequencia_semanal?: number | null
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          auth_id?: string
          cpf?: string | null
          consultas_incluidas?: number
          consultas_realizadas_iniciais?: number
          created_at?: string | null
          data_inicio?: string | null
          data_nascimento?: string | null
          email?: string | null
          fluxo_etapa?: string
          fluxo_observacoes?: string | null
          fluxo_proxima_acao_em?: string | null
          fluxo_updated_at?: string
          fluxo_urgente?: boolean
          id?: string
          last_login_at?: string | null
          nivel_atividade?: string | null
          nome?: string | null
          objetivo?: string | null
          peso_kg?: number | null
          plano?: string | null
          preferencias_alimentares?: string | null
          restricoes_alimentares?: string[]
          status?: string | null
          telefone?: string | null
          treino_frequencia_semanal?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      paginas_paciente: {
        Row: {
          ativo: boolean
          icone: string | null
          id: string
          ordem: number
          tipo: string
          titulo: string
          url_pagina: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo: string
          url_pagina: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string
          url_pagina?: string
          user_id?: string
        }
        Relationships: []
      }
      plano_refeicao_item_ingredientes: {
        Row: {
          alimento_id: string
          id: string
          ordem: number
          plano_refeicao_item_id: string
          quantidade_g_final: number
          receita_item_id: string | null
        }
        Insert: {
          alimento_id: string
          id?: string
          ordem?: number
          plano_refeicao_item_id: string
          quantidade_g_final: number
          receita_item_id?: string | null
        }
        Update: {
          alimento_id?: string
          id?: string
          ordem?: number
          plano_refeicao_item_id?: string
          quantidade_g_final?: number
          receita_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_refeicao_item_ingredientes_alimento_id_fkey"
            columns: ["alimento_id"]
            isOneToOne: false
            referencedRelation: "alimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_refeicao_item_ingredientes_plano_refeicao_item_id_fkey"
            columns: ["plano_refeicao_item_id"]
            isOneToOne: false
            referencedRelation: "plano_refeicao_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_refeicao_item_ingredientes_receita_item_id_fkey"
            columns: ["receita_item_id"]
            isOneToOne: false
            referencedRelation: "receita_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_refeicao_itens: {
        Row: {
          alimento_id: string | null
          fator_escala: number | null
          id: string
          ordem: number
          plano_refeicao_id: string
          quantidade_g: number | null
          receita_id: string | null
        }
        Insert: {
          alimento_id?: string | null
          fator_escala?: number | null
          id?: string
          ordem?: number
          plano_refeicao_id: string
          quantidade_g?: number | null
          receita_id?: string | null
        }
        Update: {
          alimento_id?: string | null
          fator_escala?: number | null
          id?: string
          ordem?: number
          plano_refeicao_id?: string
          quantidade_g?: number | null
          receita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_refeicao_itens_alimento_id_fkey"
            columns: ["alimento_id"]
            isOneToOne: false
            referencedRelation: "alimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_refeicao_itens_plano_refeicao_id_fkey"
            columns: ["plano_refeicao_id"]
            isOneToOne: false
            referencedRelation: "plano_refeicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_refeicao_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_refeicoes: {
        Row: {
          id: string
          meta_carboidrato_g: number | null
          meta_gordura_g: number | null
          meta_kcal: number | null
          meta_proteina_g: number | null
          nome: string
          observacoes: string | null
          ordem: number
          plano_estruturado_id: string
        }
        Insert: {
          id?: string
          meta_carboidrato_g?: number | null
          meta_gordura_g?: number | null
          meta_kcal?: number | null
          meta_proteina_g?: number | null
          nome: string
          observacoes?: string | null
          ordem?: number
          plano_estruturado_id: string
        }
        Update: {
          id?: string
          meta_carboidrato_g?: number | null
          meta_gordura_g?: number | null
          meta_kcal?: number | null
          meta_proteina_g?: number | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          plano_estruturado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_refeicoes_plano_estruturado_id_fkey"
            columns: ["plano_estruturado_id"]
            isOneToOne: false
            referencedRelation: "planos_estruturados"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_alimentares: {
        Row: {
          ativo: boolean | null
          auth_id: string
          bucket: string | null
          conteudo_html: string | null
          data_envio: string | null
          id: string
          path: string | null
          plano_estruturado_id: string | null
          tipo: string
          titulo: string | null
        }
        Insert: {
          ativo?: boolean | null
          auth_id?: string
          bucket?: string | null
          conteudo_html?: string | null
          data_envio?: string | null
          id?: string
          path?: string | null
          plano_estruturado_id?: string | null
          tipo?: string
          titulo?: string | null
        }
        Update: {
          ativo?: boolean | null
          auth_id?: string
          bucket?: string | null
          conteudo_html?: string | null
          data_envio?: string | null
          id?: string
          path?: string | null
          plano_estruturado_id?: string | null
          tipo?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_alimentares_plano_estruturado_id_fkey"
            columns: ["plano_estruturado_id"]
            isOneToOne: false
            referencedRelation: "planos_estruturados"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_estruturados: {
        Row: {
          auth_id: string
          created_at: string
          gerado_por_ia: boolean
          id: string
          instrucoes_ia: string | null
          meta_carboidrato_g: number | null
          meta_gordura_g: number | null
          meta_kcal: number | null
          meta_proteina_g: number | null
          observacoes: string | null
          protocolo_id: string
          status: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          auth_id: string
          created_at?: string
          gerado_por_ia?: boolean
          id?: string
          instrucoes_ia?: string | null
          meta_carboidrato_g?: number | null
          meta_gordura_g?: number | null
          meta_kcal?: number | null
          meta_proteina_g?: number | null
          observacoes?: string | null
          protocolo_id: string
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          gerado_por_ia?: boolean
          id?: string
          instrucoes_ia?: string | null
          meta_carboidrato_g?: number | null
          meta_gordura_g?: number | null
          meta_kcal?: number | null
          meta_proteina_g?: number | null
          observacoes?: string | null
          protocolo_id?: string
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_estruturados_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      protocolo_receitas_preferidas: {
        Row: {
          id: string
          ordem: number
          protocolo_id: string
          receita_id: string
        }
        Insert: {
          id?: string
          ordem?: number
          protocolo_id: string
          receita_id: string
        }
        Update: {
          id?: string
          ordem?: number
          protocolo_id?: string
          receita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocolo_receitas_preferidas_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocolo_receitas_preferidas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      protocolo_refeicoes: {
        Row: {
          horario_sugerido: string | null
          id: string
          nome: string
          ordem: number
          percentual_kcal: number | null
          protocolo_id: string
        }
        Insert: {
          horario_sugerido?: string | null
          id?: string
          nome: string
          ordem?: number
          percentual_kcal?: number | null
          protocolo_id: string
        }
        Update: {
          horario_sugerido?: string | null
          id?: string
          nome?: string
          ordem?: number
          percentual_kcal?: number | null
          protocolo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocolo_refeicoes_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      protocolo_refeicoes_preferidas: {
        Row: {
          id: string
          ordem: number
          protocolo_refeicao_id: string
          refeicao_modelo_id: string
        }
        Insert: {
          id?: string
          ordem?: number
          protocolo_refeicao_id: string
          refeicao_modelo_id: string
        }
        Update: {
          id?: string
          ordem?: number
          protocolo_refeicao_id?: string
          refeicao_modelo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocolo_refeicoes_preferidas_protocolo_refeicao_id_fkey"
            columns: ["protocolo_refeicao_id"]
            isOneToOne: false
            referencedRelation: "protocolo_refeicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocolo_refeicoes_preferidas_refeicao_modelo_id_fkey"
            columns: ["refeicao_modelo_id"]
            isOneToOne: false
            referencedRelation: "refeicoes_modelo"
            referencedColumns: ["id"]
          },
        ]
      }
      protocolo_regras_macro: {
        Row: {
          gordura_percentual_kcal_max: number | null
          gordura_percentual_kcal_min: number | null
          id: string
          proteina_g_por_kg_max: number | null
          proteina_g_por_kg_min: number | null
          protocolo_id: string
        }
        Insert: {
          gordura_percentual_kcal_max?: number | null
          gordura_percentual_kcal_min?: number | null
          id?: string
          proteina_g_por_kg_max?: number | null
          proteina_g_por_kg_min?: number | null
          protocolo_id: string
        }
        Update: {
          gordura_percentual_kcal_max?: number | null
          gordura_percentual_kcal_min?: number | null
          id?: string
          proteina_g_por_kg_max?: number | null
          proteina_g_por_kg_min?: number | null
          protocolo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocolo_regras_macro_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      protocolos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      receita_itens: {
        Row: {
          alimento_id: string
          componente: string | null
          id: string
          ordem: number
          papel_macro: string
          quantidade_base_g: number
          receita_id: string
        }
        Insert: {
          alimento_id: string
          componente?: string | null
          id?: string
          ordem?: number
          papel_macro?: string
          quantidade_base_g: number
          receita_id: string
        }
        Update: {
          alimento_id?: string
          componente?: string | null
          id?: string
          ordem?: number
          papel_macro?: string
          quantidade_base_g?: number
          receita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receita_itens_alimento_id_fkey"
            columns: ["alimento_id"]
            isOneToOne: false
            referencedRelation: "alimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          modo_preparo: string | null
          nome: string
          origem_receita_id: string | null
          peso_final_g: number | null
          rendimento_porcoes: number | null
          revisado_manualmente: boolean
          tags: string[]
          tempo_preparo_min: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          modo_preparo?: string | null
          nome: string
          origem_receita_id?: string | null
          peso_final_g?: number | null
          rendimento_porcoes?: number | null
          revisado_manualmente?: boolean
          tags?: string[]
          tempo_preparo_min?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          modo_preparo?: string | null
          nome?: string
          origem_receita_id?: string | null
          peso_final_g?: number | null
          rendimento_porcoes?: number | null
          revisado_manualmente?: boolean
          tags?: string[]
          tempo_preparo_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receitas_origem_receita_id_fkey"
            columns: ["origem_receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      refeicao_modelo_opcao_itens: {
        Row: {
          alimento_id: string | null
          id: string
          opcao_id: string
          ordem: number
          quantidade_g: number | null
          receita_id: string | null
        }
        Insert: {
          alimento_id?: string | null
          id?: string
          opcao_id: string
          ordem?: number
          quantidade_g?: number | null
          receita_id?: string | null
        }
        Update: {
          alimento_id?: string | null
          id?: string
          opcao_id?: string
          ordem?: number
          quantidade_g?: number | null
          receita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refeicao_modelo_opcao_itens_alimento_id_fkey"
            columns: ["alimento_id"]
            isOneToOne: false
            referencedRelation: "alimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refeicao_modelo_opcao_itens_opcao_id_fkey"
            columns: ["opcao_id"]
            isOneToOne: false
            referencedRelation: "refeicao_modelo_opcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refeicao_modelo_opcao_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      refeicao_modelo_opcoes: {
        Row: {
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          peso_total_g: number | null
          refeicao_modelo_id: string
          tags: string[]
        }
        Insert: {
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          peso_total_g?: number | null
          refeicao_modelo_id: string
          tags?: string[]
        }
        Update: {
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          peso_total_g?: number | null
          refeicao_modelo_id?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "refeicao_modelo_opcoes_refeicao_modelo_id_fkey"
            columns: ["refeicao_modelo_id"]
            isOneToOne: false
            referencedRelation: "refeicoes_modelo"
            referencedColumns: ["id"]
          },
        ]
      }
      refeicoes_modelo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          meta_carboidrato_g: number | null
          meta_gordura_g: number | null
          meta_kcal: number | null
          meta_proteina_g: number | null
          nome: string
          observacoes: string | null
          tags: string[]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          meta_carboidrato_g?: number | null
          meta_gordura_g?: number | null
          meta_kcal?: number | null
          meta_proteina_g?: number | null
          nome: string
          observacoes?: string | null
          tags?: string[]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          meta_carboidrato_g?: number | null
          meta_gordura_g?: number | null
          meta_kcal?: number | null
          meta_proteina_g?: number | null
          nome?: string
          observacoes?: string | null
          tags?: string[]
        }
        Relationships: []
      }
      treino_sessions: {
        Row: {
          data: Json
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          data: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
