export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agencias: {
        Row: {
          apelido: string | null;
          cep: string | null;
          cidade: string | null;
          cnae: string | null;
          cnpj: string | null;
          cnpj_sync_at: string | null;
          contatos: Json;
          created_at: string;
          created_by: string | null;
          data_aniversario: string | null;
          endereco: string | null;
          executivo_id: string | null;
          facebook: string | null;
          id: string;
          inscricao_estadual: string | null;
          inscricao_municipal: string | null;
          instagram: string | null;
          linkedin: string | null;
          logo_url: string | null;
          nome_fantasia: string | null;
          observacao: string | null;
          razao_social: string;
          situacao_cadastral: string | null;
          status: string | null;
          tenant_id: string | null;
          uf: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          apelido?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cnae?: string | null;
          cnpj?: string | null;
          cnpj_sync_at?: string | null;
          contatos?: Json;
          created_at?: string;
          created_by?: string | null;
          data_aniversario?: string | null;
          endereco?: string | null;
          executivo_id?: string | null;
          facebook?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          instagram?: string | null;
          linkedin?: string | null;
          logo_url?: string | null;
          nome_fantasia?: string | null;
          observacao?: string | null;
          razao_social: string;
          situacao_cadastral?: string | null;
          status?: string | null;
          tenant_id?: string | null;
          uf?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          apelido?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cnae?: string | null;
          cnpj?: string | null;
          cnpj_sync_at?: string | null;
          contatos?: Json;
          created_at?: string;
          created_by?: string | null;
          data_aniversario?: string | null;
          endereco?: string | null;
          executivo_id?: string | null;
          facebook?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          instagram?: string | null;
          linkedin?: string | null;
          logo_url?: string | null;
          nome_fantasia?: string | null;
          observacao?: string | null;
          razao_social?: string;
          situacao_cadastral?: string | null;
          status?: string | null;
          tenant_id?: string | null;
          uf?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agencias_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      auditoria_acessos: {
        Row: {
          acao: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          detalhes: Json | null;
          id: string;
          role: string | null;
          target_email: string | null;
          target_user_id: string | null;
        };
        Insert: {
          acao: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          detalhes?: Json | null;
          id?: string;
          role?: string | null;
          target_email?: string | null;
          target_user_id?: string | null;
        };
        Update: {
          acao?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          detalhes?: Json | null;
          id?: string;
          role?: string | null;
          target_email?: string | null;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      auditoria_alteracoes: {
        Row: {
          alteracoes: Json | null;
          created_at: string;
          id: string;
          operacao: string;
          registro_id: string | null;
          tabela: string;
          user_id: string | null;
          valor_anterior: Json | null;
          valor_novo: Json | null;
        };
        Insert: {
          alteracoes?: Json | null;
          created_at?: string;
          id?: string;
          operacao: string;
          registro_id?: string | null;
          tabela: string;
          user_id?: string | null;
          valor_anterior?: Json | null;
          valor_novo?: Json | null;
        };
        Update: {
          alteracoes?: Json | null;
          created_at?: string;
          id?: string;
          operacao?: string;
          registro_id?: string | null;
          tabela?: string;
          user_id?: string | null;
          valor_anterior?: Json | null;
          valor_novo?: Json | null;
        };
        Relationships: [];
      };
      briefing_anexos: {
        Row: {
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho: number | null;
          arquivo_tipo: string | null;
          briefing_id: string;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          id: string;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          briefing_id: string;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          arquivo_nome?: string;
          arquivo_path?: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          briefing_id?: string;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "briefing_anexos_briefing_id_fkey";
            columns: ["briefing_id"];
            isOneToOne: false;
            referencedRelation: "briefings";
            referencedColumns: ["id"];
          },
        ];
      };
      briefings: {
        Row: {
          campanha: string;
          cnpj: string | null;
          concorrentes: string | null;
          contato_email: string | null;
          contato_nome: string | null;
          contato_telefone: string | null;
          created_at: string;
          created_by: string;
          detalhes_adicionais: string | null;
          distribuicao_entregas: string | null;
          expectativa_resultado: string | null;
          historico_cliente: string | null;
          id: string;
          motivo_recusa: string | null;
          nome_fantasia: string | null;
          objetivo: string | null;
          peças_disponiveis: string | null;
          perfil_audiencia: string | null;
          periodo_estimado: string | null;
          produto_interesse: string | null;
          produtos: string[] | null;
          proposta_id: string | null;
          razao_social: string;
          segmento_cliente: string | null;
          status: string;
          tempo_contrato: string | null;
          tenant_id: string | null;
          tipo_entidade: string;
          tom_comunicacao: string | null;
          updated_at: string;
          verba_estimada: number | null;
        };
        Insert: {
          campanha: string;
          cnpj?: string | null;
          concorrentes?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          created_at?: string;
          created_by: string;
          detalhes_adicionais?: string | null;
          distribuicao_entregas?: string | null;
          expectativa_resultado?: string | null;
          historico_cliente?: string | null;
          id?: string;
          motivo_recusa?: string | null;
          nome_fantasia?: string | null;
          objetivo?: string | null;
          peças_disponiveis?: string | null;
          perfil_audiencia?: string | null;
          periodo_estimado?: string | null;
          produto_interesse?: string | null;
          produtos?: string[] | null;
          proposta_id?: string | null;
          razao_social: string;
          segmento_cliente?: string | null;
          status?: string;
          tempo_contrato?: string | null;
          tenant_id?: string | null;
          tipo_entidade: string;
          tom_comunicacao?: string | null;
          updated_at?: string;
          verba_estimada?: number | null;
        };
        Update: {
          campanha?: string;
          cnpj?: string | null;
          concorrentes?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          created_at?: string;
          created_by?: string;
          detalhes_adicionais?: string | null;
          distribuicao_entregas?: string | null;
          expectativa_resultado?: string | null;
          historico_cliente?: string | null;
          id?: string;
          motivo_recusa?: string | null;
          nome_fantasia?: string | null;
          objetivo?: string | null;
          peças_disponiveis?: string | null;
          perfil_audiencia?: string | null;
          periodo_estimado?: string | null;
          produto_interesse?: string | null;
          produtos?: string[] | null;
          proposta_id?: string | null;
          razao_social?: string;
          segmento_cliente?: string | null;
          status?: string;
          tempo_contrato?: string | null;
          tenant_id?: string | null;
          tipo_entidade?: string;
          tom_comunicacao?: string | null;
          updated_at?: string;
          verba_estimada?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "briefings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "briefings_proposta_id_fkey";
            columns: ["proposta_id"];
            isOneToOne: false;
            referencedRelation: "propostas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "briefings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          agencia_id: string | null;
          apelido: string | null;
          cep: string | null;
          cidade: string | null;
          cnae: string | null;
          cnpj: string | null;
          cnpj_sync_at: string | null;
          contatos: Json;
          created_at: string;
          created_by: string | null;
          data_aniversario: string | null;
          endereco: string | null;
          executivo_id: string | null;
          facebook: string | null;
          id: string;
          inscricao_estadual: string | null;
          inscricao_municipal: string | null;
          instagram: string | null;
          linkedin: string | null;
          logo_url: string | null;
          nome_fantasia: string | null;
          observacao: string | null;
          razao_social: string;
          segmento: string | null;
          situacao_cadastral: string | null;
          status: string | null;
          tenant_id: string | null;
          uf: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          agencia_id?: string | null;
          apelido?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cnae?: string | null;
          cnpj?: string | null;
          cnpj_sync_at?: string | null;
          contatos?: Json;
          created_at?: string;
          created_by?: string | null;
          data_aniversario?: string | null;
          endereco?: string | null;
          executivo_id?: string | null;
          facebook?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          instagram?: string | null;
          linkedin?: string | null;
          logo_url?: string | null;
          nome_fantasia?: string | null;
          observacao?: string | null;
          razao_social: string;
          segmento?: string | null;
          situacao_cadastral?: string | null;
          status?: string | null;
          tenant_id?: string | null;
          uf?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          agencia_id?: string | null;
          apelido?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cnae?: string | null;
          cnpj?: string | null;
          cnpj_sync_at?: string | null;
          contatos?: Json;
          created_at?: string;
          created_by?: string | null;
          data_aniversario?: string | null;
          endereco?: string | null;
          executivo_id?: string | null;
          facebook?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          instagram?: string | null;
          linkedin?: string | null;
          logo_url?: string | null;
          nome_fantasia?: string | null;
          observacao?: string | null;
          razao_social?: string;
          segmento?: string | null;
          situacao_cadastral?: string | null;
          status?: string | null;
          tenant_id?: string | null;
          uf?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_agencia_id_fkey";
            columns: ["agencia_id"];
            isOneToOne: false;
            referencedRelation: "agencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      comissoes_apuracao: {
        Row: {
          base_calculo: number;
          cliente_id: string | null;
          competencia: string | null;
          comprovante_path: string | null;
          created_at: string;
          executivo_id: string | null;
          fornecedor_id: string | null;
          id: string;
          observacao: string | null;
          pago_em: string | null;
          percentual: number;
          pi_id: string;
          regra_id: string | null;
          status: Database["public"]["Enums"]["comissao_status"];
          tenant_id: string;
          updated_at: string;
          valor: number;
        };
        Insert: {
          base_calculo?: number;
          cliente_id?: string | null;
          competencia?: string | null;
          comprovante_path?: string | null;
          created_at?: string;
          executivo_id?: string | null;
          fornecedor_id?: string | null;
          id?: string;
          observacao?: string | null;
          pago_em?: string | null;
          percentual?: number;
          pi_id: string;
          regra_id?: string | null;
          status?: Database["public"]["Enums"]["comissao_status"];
          tenant_id: string;
          updated_at?: string;
          valor?: number;
        };
        Update: {
          base_calculo?: number;
          cliente_id?: string | null;
          competencia?: string | null;
          comprovante_path?: string | null;
          created_at?: string;
          executivo_id?: string | null;
          fornecedor_id?: string | null;
          id?: string;
          observacao?: string | null;
          pago_em?: string | null;
          percentual?: number;
          pi_id?: string;
          regra_id?: string | null;
          status?: Database["public"]["Enums"]["comissao_status"];
          tenant_id?: string;
          updated_at?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "comissoes_apuracao_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comissoes_apuracao_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "emissoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comissoes_apuracao_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comissoes_apuracao_regra_id_fkey";
            columns: ["regra_id"];
            isOneToOne: false;
            referencedRelation: "comissoes_regras";
            referencedColumns: ["id"];
          },
        ];
      };
      comissoes_regras: {
        Row: {
          ativa: boolean;
          cliente_id: string | null;
          created_at: string;
          created_by: string | null;
          escopo: Database["public"]["Enums"]["comissao_escopo"];
          fornecedor_id: string | null;
          id: string;
          observacao: string | null;
          percentual: number;
          pi_id: string | null;
          prioridade: number;
          tenant_id: string;
          tipo_midia: Database["public"]["Enums"]["tipo_midia"] | null;
          updated_at: string;
          vigencia_fim: string | null;
          vigencia_inicio: string | null;
        };
        Insert: {
          ativa?: boolean;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          escopo: Database["public"]["Enums"]["comissao_escopo"];
          fornecedor_id?: string | null;
          id?: string;
          observacao?: string | null;
          percentual: number;
          pi_id?: string | null;
          prioridade?: number;
          tenant_id: string;
          tipo_midia?: Database["public"]["Enums"]["tipo_midia"] | null;
          updated_at?: string;
          vigencia_fim?: string | null;
          vigencia_inicio?: string | null;
        };
        Update: {
          ativa?: boolean;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          escopo?: Database["public"]["Enums"]["comissao_escopo"];
          fornecedor_id?: string | null;
          id?: string;
          observacao?: string | null;
          percentual?: number;
          pi_id?: string | null;
          prioridade?: number;
          tenant_id?: string;
          tipo_midia?: Database["public"]["Enums"]["tipo_midia"] | null;
          updated_at?: string;
          vigencia_fim?: string | null;
          vigencia_inicio?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comissoes_regras_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comissoes_regras_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "emissoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comissoes_regras_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      datas_comemorativas: {
        Row: {
          ativo: boolean;
          categoria: string;
          created_at: string;
          dia: number;
          id: string;
          mes: number;
          nome: string;
          segmentos_alvo: string[];
          sugestoes_projetos: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          categoria?: string;
          created_at?: string;
          dia: number;
          id?: string;
          mes: number;
          nome: string;
          segmentos_alvo?: string[];
          sugestoes_projetos?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          categoria?: string;
          created_at?: string;
          dia?: number;
          id?: string;
          mes?: number;
          nome?: string;
          segmentos_alvo?: string[];
          sugestoes_projetos?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_send_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email?: string;
          status?: string;
          template_name?: string;
        };
        Relationships: [];
      };
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number;
          batch_size: number;
          id: number;
          retry_after_until: string | null;
          send_delay_ms: number;
          transactional_email_ttl_minutes: number;
          updated_at: string;
        };
        Insert: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Update: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_unsubscribe_tokens: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      emissoras: {
        Row: {
          ativo: boolean;
          cep: string | null;
          cidade: string | null;
          cnpj: string | null;
          comissao_padrao_pct: number | null;
          cpf: string | null;
          created_at: string;
          email: string | null;
          endereco: string | null;
          entrega_material: string | null;
          id: string;
          inscricao_estadual: string | null;
          inscricao_municipal: string | null;
          logo_url: string | null;
          nome: string;
          nome_artistico: string | null;
          nome_fantasia: string | null;
          observacoes: string | null;
          padrao: boolean;
          pessoa_tipo: Database["public"]["Enums"]["pessoa_tipo"];
          razao_social: string | null;
          telefone: string | null;
          tenant_id: string;
          tipo_midia: Database["public"]["Enums"]["tipo_midia"] | null;
          uf: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          comissao_padrao_pct?: number | null;
          cpf?: string | null;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          entrega_material?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          logo_url?: string | null;
          nome: string;
          nome_artistico?: string | null;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          padrao?: boolean;
          pessoa_tipo?: Database["public"]["Enums"]["pessoa_tipo"];
          razao_social?: string | null;
          telefone?: string | null;
          tenant_id: string;
          tipo_midia?: Database["public"]["Enums"]["tipo_midia"] | null;
          uf?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          comissao_padrao_pct?: number | null;
          cpf?: string | null;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          entrega_material?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          logo_url?: string | null;
          nome?: string;
          nome_artistico?: string | null;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          padrao?: boolean;
          pessoa_tipo?: Database["public"]["Enums"]["pessoa_tipo"];
          razao_social?: string | null;
          telefone?: string | null;
          tenant_id?: string;
          tipo_midia?: Database["public"]["Enums"]["tipo_midia"] | null;
          uf?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emissoras_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos_calendario: {
        Row: {
          agencia_id: string | null;
          cliente_id: string | null;
          cor: string | null;
          created_at: string;
          descricao: string | null;
          dia_inteiro: boolean;
          fim: string;
          google_event_id: string | null;
          id: string;
          inicio: string;
          local: string | null;
          origem: Database["public"]["Enums"]["evento_origem"];
          origem_id: string | null;
          origem_subtipo: string | null;
          tenant_id: string | null;
          titulo: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          cor?: string | null;
          created_at?: string;
          descricao?: string | null;
          dia_inteiro?: boolean;
          fim: string;
          google_event_id?: string | null;
          id?: string;
          inicio: string;
          local?: string | null;
          origem?: Database["public"]["Enums"]["evento_origem"];
          origem_id?: string | null;
          origem_subtipo?: string | null;
          tenant_id?: string | null;
          titulo: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          cor?: string | null;
          created_at?: string;
          descricao?: string | null;
          dia_inteiro?: boolean;
          fim?: string;
          google_event_id?: string | null;
          id?: string;
          inicio?: string;
          local?: string | null;
          origem?: Database["public"]["Enums"]["evento_origem"];
          origem_id?: string | null;
          origem_subtipo?: string | null;
          tenant_id?: string | null;
          titulo?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_calendario_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      google_calendar_tokens: {
        Row: {
          access_token: string;
          created_at: string;
          expires_at: string;
          google_email: string | null;
          refresh_token: string;
          scope: string | null;
          sync_token: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          expires_at: string;
          google_email?: string | null;
          refresh_token: string;
          scope?: string | null;
          sync_token?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          expires_at?: string;
          google_email?: string | null;
          refresh_token?: string;
          scope?: string | null;
          sync_token?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      influenciadores: {
        Row: {
          ativo: boolean;
          cache_valor: number | null;
          cidade: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          estado: string | null;
          facebook: string | null;
          id: string;
          instagram: string | null;
          nicho: string | null;
          nome: string;
          observacoes: string | null;
          outras_redes: string | null;
          seguidores_total: number | null;
          telefone: string | null;
          tenant_id: string | null;
          tiktok: string | null;
          tipo: string;
          twitter: string | null;
          updated_at: string;
          whatsapp: string | null;
          youtube: string | null;
        };
        Insert: {
          ativo?: boolean;
          cache_valor?: number | null;
          cidade?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          estado?: string | null;
          facebook?: string | null;
          id?: string;
          instagram?: string | null;
          nicho?: string | null;
          nome: string;
          observacoes?: string | null;
          outras_redes?: string | null;
          seguidores_total?: number | null;
          telefone?: string | null;
          tenant_id?: string | null;
          tiktok?: string | null;
          tipo?: string;
          twitter?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          youtube?: string | null;
        };
        Update: {
          ativo?: boolean;
          cache_valor?: number | null;
          cidade?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          estado?: string | null;
          facebook?: string | null;
          id?: string;
          instagram?: string | null;
          nicho?: string | null;
          nome?: string;
          observacoes?: string | null;
          outras_redes?: string | null;
          seguidores_total?: number | null;
          telefone?: string | null;
          tenant_id?: string | null;
          tiktok?: string | null;
          tipo?: string;
          twitter?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          youtube?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "influenciadores_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      landing_page_leads: {
        Row: {
          campos_extras: Json | null;
          cliente_id: string | null;
          converted_at: string | null;
          created_at: string;
          email: string | null;
          empresa: string | null;
          id: string;
          landing_page_id: string;
          mensagem: string | null;
          nome: string;
          origem: string | null;
          status: string;
          telefone: string | null;
          tenant_id: string;
          updated_at: string;
          utm_campaign: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          campos_extras?: Json | null;
          cliente_id?: string | null;
          converted_at?: string | null;
          created_at?: string;
          email?: string | null;
          empresa?: string | null;
          id?: string;
          landing_page_id: string;
          mensagem?: string | null;
          nome: string;
          origem?: string | null;
          status?: string;
          telefone?: string | null;
          tenant_id: string;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          campos_extras?: Json | null;
          cliente_id?: string | null;
          converted_at?: string | null;
          created_at?: string;
          email?: string | null;
          empresa?: string | null;
          id?: string;
          landing_page_id?: string;
          mensagem?: string | null;
          nome?: string;
          origem?: string | null;
          status?: string;
          telefone?: string | null;
          tenant_id?: string;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "landing_page_leads_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "landing_page_leads_landing_page_id_fkey";
            columns: ["landing_page_id"];
            isOneToOne: false;
            referencedRelation: "landing_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      landing_pages: {
        Row: {
          cor_primaria: string | null;
          cor_texto: string | null;
          created_at: string;
          created_by: string | null;
          executivo_id: string | null;
          hero_image_url: string | null;
          id: string;
          logo_url: string | null;
          meta_description: string | null;
          meta_og_image: string | null;
          meta_title: string | null;
          published_at: string | null;
          sections: Json;
          slug: string;
          status: string;
          template: string;
          tenant_id: string;
          titulo: string;
          updated_at: string;
          views_count: number;
        };
        Insert: {
          cor_primaria?: string | null;
          cor_texto?: string | null;
          created_at?: string;
          created_by?: string | null;
          executivo_id?: string | null;
          hero_image_url?: string | null;
          id?: string;
          logo_url?: string | null;
          meta_description?: string | null;
          meta_og_image?: string | null;
          meta_title?: string | null;
          published_at?: string | null;
          sections?: Json;
          slug: string;
          status?: string;
          template?: string;
          tenant_id: string;
          titulo: string;
          updated_at?: string;
          views_count?: number;
        };
        Update: {
          cor_primaria?: string | null;
          cor_texto?: string | null;
          created_at?: string;
          created_by?: string | null;
          executivo_id?: string | null;
          hero_image_url?: string | null;
          id?: string;
          logo_url?: string | null;
          meta_description?: string | null;
          meta_og_image?: string | null;
          meta_title?: string | null;
          published_at?: string | null;
          sections?: Json;
          slug?: string;
          status?: string;
          template?: string;
          tenant_id?: string;
          titulo?: string;
          updated_at?: string;
          views_count?: number;
        };
        Relationships: [];
      };
      lgpd_solicitacoes: {
        Row: {
          created_at: string;
          id: string;
          observacoes: string | null;
          processado_em: string | null;
          processado_por: string | null;
          resposta: string | null;
          status: string;
          tipo: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          observacoes?: string | null;
          processado_em?: string | null;
          processado_por?: string | null;
          resposta?: string | null;
          status?: string;
          tipo: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          observacoes?: string | null;
          processado_em?: string | null;
          processado_por?: string | null;
          resposta?: string | null;
          status?: string;
          tipo?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      links_uteis: {
        Row: {
          categoria: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          icone: string | null;
          id: string;
          tenant_id: string | null;
          titulo: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          categoria?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          icone?: string | null;
          id?: string;
          tenant_id?: string | null;
          titulo: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          categoria?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          icone?: string | null;
          id?: string;
          tenant_id?: string | null;
          titulo?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "links_uteis_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      materiais_apoio: {
        Row: {
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho: number | null;
          arquivo_tipo: string | null;
          categoria: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          id: string;
          tenant_id: string | null;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          categoria?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          tenant_id?: string | null;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          arquivo_nome?: string;
          arquivo_path?: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          categoria?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          tenant_id?: string | null;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materiais_apoio_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      metas_executivo: {
        Row: {
          ano: number;
          created_at: string;
          created_by: string | null;
          executivo_id: string;
          id: string;
          mes: number;
          observacao: string | null;
          tenant_id: string | null;
          updated_at: string;
          valor_meta: number;
        };
        Insert: {
          ano: number;
          created_at?: string;
          created_by?: string | null;
          executivo_id: string;
          id?: string;
          mes: number;
          observacao?: string | null;
          tenant_id?: string | null;
          updated_at?: string;
          valor_meta?: number;
        };
        Update: {
          ano?: number;
          created_at?: string;
          created_by?: string | null;
          executivo_id?: string;
          id?: string;
          mes?: number;
          observacao?: string | null;
          tenant_id?: string | null;
          updated_at?: string;
          valor_meta?: number;
        };
        Relationships: [
          {
            foreignKeyName: "metas_executivo_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      midia_config: {
        Row: {
          cep: string | null;
          cidade: string | null;
          cnpj: string | null;
          email: string | null;
          endereco: string | null;
          inscricao_estadual: string | null;
          inscricao_municipal: string | null;
          logo_url: string | null;
          midia: string;
          nome_fantasia: string | null;
          observacao: string | null;
          razao_social: string | null;
          site: string | null;
          telefone: string | null;
          tenant_id: string | null;
          uf: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          email?: string | null;
          endereco?: string | null;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          logo_url?: string | null;
          midia: string;
          nome_fantasia?: string | null;
          observacao?: string | null;
          razao_social?: string | null;
          site?: string | null;
          telefone?: string | null;
          tenant_id?: string | null;
          uf?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cep?: string | null;
          cidade?: string | null;
          cnpj?: string | null;
          email?: string | null;
          endereco?: string | null;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          logo_url?: string | null;
          midia?: string;
          nome_fantasia?: string | null;
          observacao?: string | null;
          razao_social?: string | null;
          site?: string | null;
          telefone?: string | null;
          tenant_id?: string | null;
          uf?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "midia_config_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacao_config: {
        Row: {
          ativo_fim: boolean;
          ativo_inicio: boolean;
          ativo_progresso: boolean;
          ativo_validade: boolean;
          dias_antes_fim: number;
          dias_antes_inicio: number;
          dias_antes_validade: number;
          id: boolean;
          marcos_percentual: number[];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ativo_fim?: boolean;
          ativo_inicio?: boolean;
          ativo_progresso?: boolean;
          ativo_validade?: boolean;
          dias_antes_fim?: number;
          dias_antes_inicio?: number;
          dias_antes_validade?: number;
          id?: boolean;
          marcos_percentual?: number[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ativo_fim?: boolean;
          ativo_inicio?: boolean;
          ativo_progresso?: boolean;
          ativo_validade?: boolean;
          dias_antes_fim?: number;
          dias_antes_inicio?: number;
          dias_antes_validade?: number;
          id?: boolean;
          marcos_percentual?: number[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      notificacoes: {
        Row: {
          created_at: string;
          id: string;
          lida: boolean;
          link: string | null;
          mensagem: string | null;
          metadata: Json | null;
          tenant_id: string | null;
          tipo: Database["public"]["Enums"]["notificacao_tipo"];
          titulo: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lida?: boolean;
          link?: string | null;
          mensagem?: string | null;
          metadata?: Json | null;
          tenant_id?: string | null;
          tipo: Database["public"]["Enums"]["notificacao_tipo"];
          titulo: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          lida?: boolean;
          link?: string | null;
          mensagem?: string | null;
          metadata?: Json | null;
          tenant_id?: string | null;
          tipo?: Database["public"]["Enums"]["notificacao_tipo"];
          titulo?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notificacoes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          description: string | null;
          key: string;
          label: string;
        };
        Insert: {
          description?: string | null;
          key: string;
          label: string;
        };
        Update: {
          description?: string | null;
          key?: string;
          label?: string;
        };
        Relationships: [];
      };
      permuta_recebimentos: {
        Row: {
          agencia_id: string | null;
          cliente_id: string | null;
          created_at: string;
          criado_por: string | null;
          data_recebimento: string;
          descricao: string;
          id: string;
          pi_id: string | null;
          tenant_id: string | null;
          updated_at: string;
          valor: number;
        };
        Insert: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          data_recebimento?: string;
          descricao: string;
          id?: string;
          pi_id?: string | null;
          tenant_id?: string | null;
          updated_at?: string;
          valor?: number;
        };
        Update: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          data_recebimento?: string;
          descricao?: string;
          id?: string;
          pi_id?: string | null;
          tenant_id?: string | null;
          updated_at?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "permuta_recebimentos_agencia_id_fkey";
            columns: ["agencia_id"];
            isOneToOne: false;
            referencedRelation: "agencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permuta_recebimentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permuta_recebimentos_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permuta_recebimentos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      permuta_saldos: {
        Row: {
          entidade_id: string;
          razao_social: string | null;
          saldo: number | null;
          tenant_id: string | null;
          tipo: string | null;
          total_pi: number | null;
          total_recebido: number | null;
          updated_at: string | null;
        };
        Insert: {
          entidade_id: string;
          razao_social?: string | null;
          saldo?: number | null;
          tenant_id?: string | null;
          tipo?: string | null;
          total_pi?: number | null;
          total_recebido?: number | null;
          updated_at?: string | null;
        };
        Update: {
          entidade_id?: string;
          razao_social?: string | null;
          saldo?: number | null;
          tenant_id?: string | null;
          tipo?: string | null;
          total_pi?: number | null;
          total_recebido?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "permuta_saldos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      pi_anexos: {
        Row: {
          agencia_id: string | null;
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho: number | null;
          arquivo_tipo: string | null;
          cliente_id: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          id: string;
          periodo_referencia: string | null;
          pi_id: string | null;
          titulo: string;
          updated_at: string;
          valor_bruto: number | null;
          valor_liquido: number | null;
        };
        Insert: {
          agencia_id?: string | null;
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          periodo_referencia?: string | null;
          pi_id?: string | null;
          titulo: string;
          updated_at?: string;
          valor_bruto?: number | null;
          valor_liquido?: number | null;
        };
        Update: {
          agencia_id?: string | null;
          arquivo_nome?: string;
          arquivo_path?: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          periodo_referencia?: string | null;
          pi_id?: string | null;
          titulo?: string;
          updated_at?: string;
          valor_bruto?: number | null;
          valor_liquido?: number | null;
        };
        Relationships: [];
      };
      pi_aprovacoes_diretoria: {
        Row: {
          aprovador_cargo: string | null;
          aprovador_nome: string | null;
          assinatura_url: string | null;
          created_at: string;
          criado_por: string | null;
          decidido_em: string | null;
          id: string;
          ip: string | null;
          motivo_reprovacao: string | null;
          pi_id: string;
          status: string;
          tenant_id: string | null;
          token: string;
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          aprovador_cargo?: string | null;
          aprovador_nome?: string | null;
          assinatura_url?: string | null;
          created_at?: string;
          criado_por?: string | null;
          decidido_em?: string | null;
          id?: string;
          ip?: string | null;
          motivo_reprovacao?: string | null;
          pi_id: string;
          status?: string;
          tenant_id?: string | null;
          token: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          aprovador_cargo?: string | null;
          aprovador_nome?: string | null;
          assinatura_url?: string | null;
          created_at?: string;
          criado_por?: string | null;
          decidido_em?: string | null;
          id?: string;
          ip?: string | null;
          motivo_reprovacao?: string | null;
          pi_id?: string;
          status?: string;
          tenant_id?: string | null;
          token?: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pi_aprovacoes_diretoria_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      pi_assinaturas_cliente: {
        Row: {
          assinado_em: string | null;
          assinatura_url: string | null;
          cpf: string | null;
          created_at: string;
          criado_por: string | null;
          documento_mime: string | null;
          documento_tipo: string | null;
          documento_url: string | null;
          email: string | null;
          id: string;
          ip: string | null;
          nome_assinante: string | null;
          pi_id: string;
          status: string;
          token: string;
          user_agent: string | null;
        };
        Insert: {
          assinado_em?: string | null;
          assinatura_url?: string | null;
          cpf?: string | null;
          created_at?: string;
          criado_por?: string | null;
          documento_mime?: string | null;
          documento_tipo?: string | null;
          documento_url?: string | null;
          email?: string | null;
          id?: string;
          ip?: string | null;
          nome_assinante?: string | null;
          pi_id: string;
          status?: string;
          token: string;
          user_agent?: string | null;
        };
        Update: {
          assinado_em?: string | null;
          assinatura_url?: string | null;
          cpf?: string | null;
          created_at?: string;
          criado_por?: string | null;
          documento_mime?: string | null;
          documento_tipo?: string | null;
          documento_url?: string | null;
          email?: string | null;
          id?: string;
          ip?: string | null;
          nome_assinante?: string | null;
          pi_id?: string;
          status?: string;
          token?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pi_assinaturas_cliente_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      pi_financeiro: {
        Row: {
          boleto_path: string | null;
          created_at: string;
          criado_por: string | null;
          data_pagamento: string | null;
          id: string;
          nota_fiscal_numero: string | null;
          nota_fiscal_path: string | null;
          observacoes: string | null;
          pi_id: string;
          status_pagamento: string;
          updated_at: string;
          valor: number | null;
          vencimento_boleto: string | null;
        };
        Insert: {
          boleto_path?: string | null;
          created_at?: string;
          criado_por?: string | null;
          data_pagamento?: string | null;
          id?: string;
          nota_fiscal_numero?: string | null;
          nota_fiscal_path?: string | null;
          observacoes?: string | null;
          pi_id: string;
          status_pagamento?: string;
          updated_at?: string;
          valor?: number | null;
          vencimento_boleto?: string | null;
        };
        Update: {
          boleto_path?: string | null;
          created_at?: string;
          criado_por?: string | null;
          data_pagamento?: string | null;
          id?: string;
          nota_fiscal_numero?: string | null;
          nota_fiscal_path?: string | null;
          observacoes?: string | null;
          pi_id?: string;
          status_pagamento?: string;
          updated_at?: string;
          valor?: number | null;
          vencimento_boleto?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pi_financeiro_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      pi_historico: {
        Row: {
          acao: string;
          agencia_id: string | null;
          cliente_id: string | null;
          created_at: string;
          detalhes: Json | null;
          id: string;
          pi_id: string;
          user_id: string | null;
        };
        Insert: {
          acao: string;
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          detalhes?: Json | null;
          id?: string;
          pi_id: string;
          user_id?: string | null;
        };
        Update: {
          acao?: string;
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          detalhes?: Json | null;
          id?: string;
          pi_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pi_historico_agencia_id_fkey";
            columns: ["agencia_id"];
            isOneToOne: false;
            referencedRelation: "agencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pi_historico_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pi_historico_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      pi_itens: {
        Row: {
          ano: number | null;
          created_at: string;
          desconto: number;
          dias_mes: number[];
          dias_semana: string[];
          formato: string | null;
          horario: string | null;
          id: string;
          insercoes_dia: number;
          mes: number | null;
          pi_id: string;
          programa: string | null;
          tipo: string;
          total_insercoes: number;
          valor_negociado: number;
          valor_tabela: number;
          valor_unit: number;
        };
        Insert: {
          ano?: number | null;
          created_at?: string;
          desconto?: number;
          dias_mes?: number[];
          dias_semana?: string[];
          formato?: string | null;
          horario?: string | null;
          id?: string;
          insercoes_dia?: number;
          mes?: number | null;
          pi_id: string;
          programa?: string | null;
          tipo: string;
          total_insercoes?: number;
          valor_negociado?: number;
          valor_tabela?: number;
          valor_unit?: number;
        };
        Update: {
          ano?: number | null;
          created_at?: string;
          desconto?: number;
          dias_mes?: number[];
          dias_semana?: string[];
          formato?: string | null;
          horario?: string | null;
          id?: string;
          insercoes_dia?: number;
          mes?: number | null;
          pi_id?: string;
          programa?: string | null;
          tipo?: string;
          total_insercoes?: number;
          valor_negociado?: number;
          valor_tabela?: number;
          valor_unit?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pi_itens_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      pi_share_links: {
        Row: {
          access_count: number;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          last_access_at: string | null;
          pi_id: string;
          signed_url: string;
          storage_path: string | null;
          token: string;
        };
        Insert: {
          access_count?: number;
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          last_access_at?: string | null;
          pi_id: string;
          signed_url: string;
          storage_path?: string | null;
          token: string;
        };
        Update: {
          access_count?: number;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          last_access_at?: string | null;
          pi_id?: string;
          signed_url?: string;
          storage_path?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pi_share_links_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      pis: {
        Row: {
          agencia_id: string | null;
          ano_meta: number | null;
          ano_veiculacao: number;
          aprovado_em: string | null;
          aprovado_por: string | null;
          campanha: string;
          cliente_id: string | null;
          created_at: string;
          created_by: string | null;
          data_envio_nota: string | null;
          data_faturamento: string | null;
          data_vencimento_nota: string | null;
          email_faturamento: string | null;
          emissora_id: string | null;
          enviado_aprovacao_em: string | null;
          executivo_execucao_id: string | null;
          executivo_id: string | null;
          faturado: boolean | null;
          faturamento_contra: string;
          faturamento_tipo: string;
          id: string;
          investimentos_mensais: Json;
          mes_meta: number | null;
          mes_veiculacao: number;
          motivo_cancelamento: string | null;
          motivo_reprovacao: string | null;
          numero: string;
          observacao: string | null;
          origem: string;
          pdf_url: string | null;
          periodo_fim: string | null;
          periodo_inicio: string | null;
          permuta: boolean;
          permuta_detalhes: string | null;
          permuta_uso: string | null;
          permuta_valor_faturado: number;
          producao_contato: string | null;
          producao_data: string | null;
          producao_email: string | null;
          producao_localizacao: string | null;
          producao_material_tipo: string | null;
          producao_observacoes: string | null;
          producao_tipo: string | null;
          responsavel_negociacao_id: string | null;
          sem_comissao: boolean;
          status: Database["public"]["Enums"]["pi_status"];
          substitui_pi_id: string | null;
          tenant_id: string | null;
          total_insercoes: number;
          updated_at: string;
          valor_desconto: number;
          valor_manual: number | null;
          valor_negociado: number;
          valor_opec: number | null;
          valor_tabela: number;
          vencimento_tipo: string | null;
        };
        Insert: {
          agencia_id?: string | null;
          ano_meta?: number | null;
          ano_veiculacao: number;
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          campanha: string;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_envio_nota?: string | null;
          data_faturamento?: string | null;
          data_vencimento_nota?: string | null;
          email_faturamento?: string | null;
          emissora_id?: string | null;
          enviado_aprovacao_em?: string | null;
          executivo_execucao_id?: string | null;
          executivo_id?: string | null;
          faturado?: boolean | null;
          faturamento_contra?: string;
          faturamento_tipo?: string;
          id?: string;
          investimentos_mensais?: Json;
          mes_meta?: number | null;
          mes_veiculacao: number;
          motivo_cancelamento?: string | null;
          motivo_reprovacao?: string | null;
          numero: string;
          observacao?: string | null;
          origem?: string;
          pdf_url?: string | null;
          periodo_fim?: string | null;
          periodo_inicio?: string | null;
          permuta?: boolean;
          permuta_detalhes?: string | null;
          permuta_uso?: string | null;
          permuta_valor_faturado?: number;
          producao_contato?: string | null;
          producao_data?: string | null;
          producao_email?: string | null;
          producao_localizacao?: string | null;
          producao_material_tipo?: string | null;
          producao_observacoes?: string | null;
          producao_tipo?: string | null;
          responsavel_negociacao_id?: string | null;
          sem_comissao?: boolean;
          status?: Database["public"]["Enums"]["pi_status"];
          substitui_pi_id?: string | null;
          tenant_id?: string | null;
          total_insercoes?: number;
          updated_at?: string;
          valor_desconto?: number;
          valor_manual?: number | null;
          valor_negociado?: number;
          valor_opec?: number | null;
          valor_tabela?: number;
          vencimento_tipo?: string | null;
        };
        Update: {
          agencia_id?: string | null;
          ano_meta?: number | null;
          ano_veiculacao?: number;
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          campanha?: string;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_envio_nota?: string | null;
          data_faturamento?: string | null;
          data_vencimento_nota?: string | null;
          email_faturamento?: string | null;
          emissora_id?: string | null;
          enviado_aprovacao_em?: string | null;
          executivo_execucao_id?: string | null;
          executivo_id?: string | null;
          faturado?: boolean | null;
          faturamento_contra?: string;
          faturamento_tipo?: string;
          id?: string;
          investimentos_mensais?: Json;
          mes_meta?: number | null;
          mes_veiculacao?: number;
          motivo_cancelamento?: string | null;
          motivo_reprovacao?: string | null;
          numero?: string;
          observacao?: string | null;
          origem?: string;
          pdf_url?: string | null;
          periodo_fim?: string | null;
          periodo_inicio?: string | null;
          permuta?: boolean;
          permuta_detalhes?: string | null;
          permuta_uso?: string | null;
          permuta_valor_faturado?: number;
          producao_contato?: string | null;
          producao_data?: string | null;
          producao_email?: string | null;
          producao_localizacao?: string | null;
          producao_material_tipo?: string | null;
          producao_observacoes?: string | null;
          producao_tipo?: string | null;
          responsavel_negociacao_id?: string | null;
          sem_comissao?: boolean;
          status?: Database["public"]["Enums"]["pi_status"];
          substitui_pi_id?: string | null;
          tenant_id?: string | null;
          total_insercoes?: number;
          updated_at?: string;
          valor_desconto?: number;
          valor_manual?: number | null;
          valor_negociado?: number;
          valor_opec?: number | null;
          valor_tabela?: number;
          vencimento_tipo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pis_agencia_id_fkey";
            columns: ["agencia_id"];
            isOneToOne: false;
            referencedRelation: "agencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pis_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pis_emissora_id_fkey";
            columns: ["emissora_id"];
            isOneToOne: false;
            referencedRelation: "emissoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pis_executivo_execucao_id_fkey";
            columns: ["executivo_execucao_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pis_responsavel_negociacao_id_fkey";
            columns: ["responsavel_negociacao_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pis_substitui_pi_id_fkey";
            columns: ["substitui_pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pis_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      planos: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          id: string;
          is_default: boolean;
          max_usuarios: number | null;
          modulos: string[];
          nome: string;
          preco_mensal: number;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          is_default?: boolean;
          max_usuarios?: number | null;
          modulos?: string[];
          nome: string;
          preco_mensal?: number;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          is_default?: boolean;
          max_usuarios?: number | null;
          modulos?: string[];
          nome?: string;
          preco_mensal?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      pos_venda_anexos: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          mime: string | null;
          nome: string;
          path: string;
          pos_venda_id: string;
          tamanho: number | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          mime?: string | null;
          nome: string;
          path: string;
          pos_venda_id: string;
          tamanho?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          mime?: string | null;
          nome?: string;
          path?: string;
          pos_venda_id?: string;
          tamanho?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_venda_anexos_pos_venda_id_fkey";
            columns: ["pos_venda_id"];
            isOneToOne: false;
            referencedRelation: "pos_vendas";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_vendas: {
        Row: {
          created_at: string;
          created_by: string | null;
          enviada_em: string | null;
          gerado_automaticamente: boolean;
          id: string;
          link_provas: string | null;
          mensagem: string | null;
          pi_id: string;
          status: string;
          tenant_id: string | null;
          token: string;
          updated_at: string;
          visualizada_em: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          enviada_em?: string | null;
          gerado_automaticamente?: boolean;
          id?: string;
          link_provas?: string | null;
          mensagem?: string | null;
          pi_id: string;
          status?: string;
          tenant_id?: string | null;
          token: string;
          updated_at?: string;
          visualizada_em?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          enviada_em?: string | null;
          gerado_automaticamente?: boolean;
          id?: string;
          link_provas?: string | null;
          mensagem?: string | null;
          pi_id?: string;
          status?: string;
          tenant_id?: string | null;
          token?: string;
          updated_at?: string;
          visualizada_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_vendas_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
        ];
      };
      produto_tipos: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          midia: string;
          nome: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          midia: string;
          nome: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          midia?: string;
          nome?: string;
        };
        Relationships: [];
      };
      produtos: {
        Row: {
          ambientes: string[] | null;
          ativo: boolean;
          created_at: string;
          created_by: string | null;
          detalhes_venda: string | null;
          dias_fixos: number[];
          dias_semana_fixos: number[];
          duracao_segundos: number;
          emissora_id: string | null;
          endereco_ponto: string | null;
          engajamento_pct: number | null;
          entregaveis_default: Json | null;
          faixa: string | null;
          formato: string | null;
          formato_ooh: string | null;
          formato_tela: string | null;
          horas_operacao_dia: number | null;
          id: string;
          insercoes_padrao: number;
          insercoes_por_hora: number | null;
          latitude: number | null;
          link_modelo: string | null;
          longitude: number | null;
          loop_minutos: number | null;
          midia: Database["public"]["Enums"]["midia_tipo"];
          nome: string;
          observacao: string | null;
          plataforma_social: string | null;
          programa: string | null;
          quantidade_faces: number | null;
          quantidade_telas: number | null;
          requer_producao: boolean;
          resolucao: string | null;
          seguidores: number | null;
          tempo_exibicao_segundos: number | null;
          tenant_id: string | null;
          tipo: string | null;
          canal_macro: "ON" | "OFF" | "HIBRIDO" | null;
          plataforma_rede: string | null;
          metricas_digitais: Json | null;
          updated_at: string;
          valor_unit: number;
          veiculacao_tipo: string;
        };
        Insert: {
          ambientes?: string[] | null;
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          detalhes_venda?: string | null;
          dias_fixos?: number[];
          dias_semana_fixos?: number[];
          duracao_segundos?: number;
          emissora_id?: string | null;
          endereco_ponto?: string | null;
          engajamento_pct?: number | null;
          entregaveis_default?: Json | null;
          faixa?: string | null;
          formato?: string | null;
          formato_ooh?: string | null;
          formato_tela?: string | null;
          horas_operacao_dia?: number | null;
          id?: string;
          insercoes_padrao?: number;
          insercoes_por_hora?: number | null;
          latitude?: number | null;
          link_modelo?: string | null;
          longitude?: number | null;
          loop_minutos?: number | null;
          midia: Database["public"]["Enums"]["midia_tipo"];
          nome: string;
          observacao?: string | null;
          plataforma_social?: string | null;
          programa?: string | null;
          quantidade_faces?: number | null;
          quantidade_telas?: number | null;
          requer_producao?: boolean;
          resolucao?: string | null;
          seguidores?: number | null;
          tempo_exibicao_segundos?: number | null;
          tenant_id?: string | null;
          tipo?: string | null;
          canal_macro?: "ON" | "OFF" | "HIBRIDO" | null;
          plataforma_rede?: string | null;
          metricas_digitais?: Json | null;
          updated_at?: string;
          valor_unit?: number;
          veiculacao_tipo?: string;
        };
        Update: {
          ambientes?: string[] | null;
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          detalhes_venda?: string | null;
          dias_fixos?: number[];
          dias_semana_fixos?: number[];
          duracao_segundos?: number;
          emissora_id?: string | null;
          endereco_ponto?: string | null;
          engajamento_pct?: number | null;
          entregaveis_default?: Json | null;
          faixa?: string | null;
          formato?: string | null;
          formato_ooh?: string | null;
          formato_tela?: string | null;
          horas_operacao_dia?: number | null;
          id?: string;
          insercoes_padrao?: number;
          insercoes_por_hora?: number | null;
          latitude?: number | null;
          link_modelo?: string | null;
          longitude?: number | null;
          loop_minutos?: number | null;
          midia?: Database["public"]["Enums"]["midia_tipo"];
          nome?: string;
          observacao?: string | null;
          plataforma_social?: string | null;
          programa?: string | null;
          quantidade_faces?: number | null;
          quantidade_telas?: number | null;
          requer_producao?: boolean;
          resolucao?: string | null;
          seguidores?: number | null;
          tempo_exibicao_segundos?: number | null;
          tenant_id?: string | null;
          tipo?: string | null;
          canal_macro?: "ON" | "OFF" | "HIBRIDO" | null;
          plataforma_rede?: string | null;
          metricas_digitais?: Json | null;
          updated_at?: string;
          valor_unit?: number;
          veiculacao_tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_emissora_id_fkey";
            columns: ["emissora_id"];
            isOneToOne: false;
            referencedRelation: "emissoras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          assinatura_url: string | null;
          ativo: boolean;
          cargo: string | null;
          consentimento_lgpd_at: string | null;
          consentimento_versao: string | null;
          created_at: string;
          email: string;
          id: string;
          last_active_at: string | null;
          nome: string;
          telefone: string | null;
          tenant_id: string | null;
          trial_ends_at: string | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          assinatura_url?: string | null;
          ativo?: boolean;
          cargo?: string | null;
          consentimento_lgpd_at?: string | null;
          consentimento_versao?: string | null;
          created_at?: string;
          email: string;
          id: string;
          last_active_at?: string | null;
          nome: string;
          telefone?: string | null;
          tenant_id?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          assinatura_url?: string | null;
          ativo?: boolean;
          cargo?: string | null;
          consentimento_lgpd_at?: string | null;
          consentimento_versao?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          last_active_at?: string | null;
          nome?: string;
          telefone?: string | null;
          tenant_id?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      projetos_especiais: {
        Row: {
          agencia_id: string | null;
          arquivo_nome: string | null;
          arquivo_url: string | null;
          cliente_alvo: string | null;
          cliente_id: string | null;
          comercializacao_fim: string;
          comercializacao_inicio: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          id: string;
          materiais: string | null;
          nome: string;
          observacao: string | null;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["projeto_status"];
          tenant_id: string | null;
          updated_at: string;
          valor_estimado: number | null;
        };
        Insert: {
          agencia_id?: string | null;
          arquivo_nome?: string | null;
          arquivo_url?: string | null;
          cliente_alvo?: string | null;
          cliente_id?: string | null;
          comercializacao_fim: string;
          comercializacao_inicio?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          materiais?: string | null;
          nome: string;
          observacao?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["projeto_status"];
          tenant_id?: string | null;
          updated_at?: string;
          valor_estimado?: number | null;
        };
        Update: {
          agencia_id?: string | null;
          arquivo_nome?: string | null;
          arquivo_url?: string | null;
          cliente_alvo?: string | null;
          cliente_id?: string | null;
          comercializacao_fim?: string;
          comercializacao_inicio?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          materiais?: string | null;
          nome?: string;
          observacao?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["projeto_status"];
          tenant_id?: string | null;
          updated_at?: string;
          valor_estimado?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "projetos_especiais_agencia_id_fkey";
            columns: ["agencia_id"];
            isOneToOne: false;
            referencedRelation: "agencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projetos_especiais_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projetos_especiais_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      proposal_history: {
        Row: {
          action_type: string;
          changes: Json | null;
          created_at: string;
          id: string;
          modified_by: string;
          proposal_id: string;
        };
        Insert: {
          action_type: string;
          changes?: Json | null;
          created_at?: string;
          id?: string;
          modified_by: string;
          proposal_id: string;
        };
        Update: {
          action_type?: string;
          changes?: Json | null;
          created_at?: string;
          id?: string;
          modified_by?: string;
          proposal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "proposal_history_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: false;
            referencedRelation: "propostas";
            referencedColumns: ["id"];
          },
        ];
      };
      proposta_anexos: {
        Row: {
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho: number | null;
          arquivo_tipo: string | null;
          created_at: string;
          created_by: string;
          descricao: string | null;
          id: string;
          proposta_id: string;
          updated_at: string;
        };
        Insert: {
          arquivo_nome: string;
          arquivo_path: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          created_at?: string;
          created_by: string;
          descricao?: string | null;
          id?: string;
          proposta_id: string;
          updated_at?: string;
        };
        Update: {
          arquivo_nome?: string;
          arquivo_path?: string;
          arquivo_tamanho?: number | null;
          arquivo_tipo?: string | null;
          created_at?: string;
          created_by?: string;
          descricao?: string | null;
          id?: string;
          proposta_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "proposta_anexos_proposta_id_fkey";
            columns: ["proposta_id"];
            isOneToOne: false;
            referencedRelation: "propostas";
            referencedColumns: ["id"];
          },
        ];
      };
      proposta_itens: {
        Row: {
          ano: number | null;
          created_at: string;
          desconto: number;
          dias_mes: number[];
          dias_semana: string[];
          dias_veiculacao: number | null;
          formato: string | null;
          horario: string | null;
          id: string;
          insercoes_dia: number;
          link_modelo: string | null;
          mes: number | null;
          programa: string | null;
          proposta_id: string;
          tipo: string;
          total_insercoes: number;
          valor_negociado: number;
          valor_tabela: number;
          valor_unit: number;
        };
        Insert: {
          ano?: number | null;
          created_at?: string;
          desconto?: number;
          dias_mes?: number[];
          dias_semana?: string[];
          dias_veiculacao?: number | null;
          formato?: string | null;
          horario?: string | null;
          id?: string;
          insercoes_dia?: number;
          link_modelo?: string | null;
          mes?: number | null;
          programa?: string | null;
          proposta_id: string;
          tipo: string;
          total_insercoes?: number;
          valor_negociado?: number;
          valor_tabela?: number;
          valor_unit?: number;
        };
        Update: {
          ano?: number | null;
          created_at?: string;
          desconto?: number;
          dias_mes?: number[];
          dias_semana?: string[];
          dias_veiculacao?: number | null;
          formato?: string | null;
          horario?: string | null;
          id?: string;
          insercoes_dia?: number;
          link_modelo?: string | null;
          mes?: number | null;
          programa?: string | null;
          proposta_id?: string;
          tipo?: string;
          total_insercoes?: number;
          valor_negociado?: number;
          valor_tabela?: number;
          valor_unit?: number;
        };
        Relationships: [
          {
            foreignKeyName: "proposta_itens_proposta_id_fkey";
            columns: ["proposta_id"];
            isOneToOne: false;
            referencedRelation: "propostas";
            referencedColumns: ["id"];
          },
        ];
      };
      proposta_layouts: {
        Row: {
          config: Json;
          created_at: string | null;
          created_by: string | null;
          id: string;
          is_default: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          config: Json;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_default?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          config?: Json;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_default?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      propostas: {
        Row: {
          agencia_id: string | null;
          briefing_id: string | null;
          campanha: string;
          cliente_avulso: string | null;
          cliente_id: string | null;
          comissao_pct: number;
          created_at: string;
          created_by: string | null;
          custom_config: Json | null;
          executivo_id: string | null;
          executivo_parceiro_id: string | null;
          id: string;
          layout_id: string | null;
          logo_data_url: string | null;
          numero: string;
          observacao: string | null;
          pi_id: string | null;
          status: Database["public"]["Enums"]["proposta_status"];
          tenant_id: string | null;
          total_insercoes: number;
          updated_at: string;
          validade: string | null;
          valor_desconto: number;
          valor_negociado: number;
          valor_tabela: number;
        };
        Insert: {
          agencia_id?: string | null;
          briefing_id?: string | null;
          campanha: string;
          cliente_avulso?: string | null;
          cliente_id?: string | null;
          comissao_pct?: number;
          created_at?: string;
          created_by?: string | null;
          custom_config?: Json | null;
          executivo_id?: string | null;
          executivo_parceiro_id?: string | null;
          id?: string;
          layout_id?: string | null;
          logo_data_url?: string | null;
          numero: string;
          observacao?: string | null;
          pi_id?: string | null;
          status?: Database["public"]["Enums"]["proposta_status"];
          tenant_id?: string | null;
          total_insercoes?: number;
          updated_at?: string;
          validade?: string | null;
          valor_desconto?: number;
          valor_negociado?: number;
          valor_tabela?: number;
        };
        Update: {
          agencia_id?: string | null;
          briefing_id?: string | null;
          campanha?: string;
          cliente_avulso?: string | null;
          cliente_id?: string | null;
          comissao_pct?: number;
          created_at?: string;
          created_by?: string | null;
          custom_config?: Json | null;
          executivo_id?: string | null;
          executivo_parceiro_id?: string | null;
          id?: string;
          layout_id?: string | null;
          logo_data_url?: string | null;
          numero?: string;
          observacao?: string | null;
          pi_id?: string | null;
          status?: Database["public"]["Enums"]["proposta_status"];
          tenant_id?: string | null;
          total_insercoes?: number;
          updated_at?: string;
          validade?: string | null;
          valor_desconto?: number;
          valor_negociado?: number;
          valor_tabela?: number;
        };
        Relationships: [
          {
            foreignKeyName: "propostas_agencia_id_fkey";
            columns: ["agencia_id"];
            isOneToOne: false;
            referencedRelation: "agencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propostas_briefing_id_fkey";
            columns: ["briefing_id"];
            isOneToOne: false;
            referencedRelation: "briefings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propostas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propostas_executivo_id_fkey";
            columns: ["executivo_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propostas_layout_id_fkey";
            columns: ["layout_id"];
            isOneToOne: false;
            referencedRelation: "proposta_layouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propostas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      reunioes: {
        Row: {
          agencia_id: string | null;
          cliente_id: string | null;
          created_at: string;
          created_by: string | null;
          data_fim: string;
          data_inicio: string;
          descricao: string | null;
          executivo_id: string | null;
          id: string;
          link_video: string | null;
          local: string | null;
          observacao: string | null;
          proposta_id: string | null;
          resultado: string | null;
          status: Database["public"]["Enums"]["reuniao_status"];
          tenant_id: string | null;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_fim: string;
          data_inicio: string;
          descricao?: string | null;
          executivo_id?: string | null;
          id?: string;
          link_video?: string | null;
          local?: string | null;
          observacao?: string | null;
          proposta_id?: string | null;
          resultado?: string | null;
          status?: Database["public"]["Enums"]["reuniao_status"];
          tenant_id?: string | null;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_fim?: string;
          data_inicio?: string;
          descricao?: string | null;
          executivo_id?: string | null;
          id?: string;
          link_video?: string | null;
          local?: string | null;
          observacao?: string | null;
          proposta_id?: string | null;
          resultado?: string | null;
          status?: Database["public"]["Enums"]["reuniao_status"];
          tenant_id?: string | null;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reunioes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission_key: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          permission_key: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          permission_key?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      solicitacoes_producao: {
        Row: {
          contato: string | null;
          created_at: string;
          data_producao: string | null;
          email: string | null;
          id: string;
          localizacao: string | null;
          material_tipo: string | null;
          observacoes: string | null;
          pi_id: string;
          solicitado_por: string;
          status: string;
          tenant_id: string | null;
          updated_at: string;
        };
        Insert: {
          contato?: string | null;
          created_at?: string;
          data_producao?: string | null;
          email?: string | null;
          id?: string;
          localizacao?: string | null;
          material_tipo?: string | null;
          observacoes?: string | null;
          pi_id: string;
          solicitado_por: string;
          status?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          contato?: string | null;
          created_at?: string;
          data_producao?: string | null;
          email?: string | null;
          id?: string;
          localizacao?: string | null;
          material_tipo?: string | null;
          observacoes?: string | null;
          pi_id?: string;
          solicitado_por?: string;
          status?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "solicitacoes_producao_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "solicitacoes_producao_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      suppressed_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          metadata: Json | null;
          reason: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          metadata?: Json | null;
          reason: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          metadata?: Json | null;
          reason?: string;
        };
        Relationships: [];
      };
      sync_cnpj_log: {
        Row: {
          campos_alterados: Json | null;
          cnpj: string | null;
          created_at: string;
          entidade_id: string;
          entidade_tipo: string;
          id: string;
          mensagem: string | null;
          razao_social: string | null;
          status: string;
        };
        Insert: {
          campos_alterados?: Json | null;
          cnpj?: string | null;
          created_at?: string;
          entidade_id: string;
          entidade_tipo: string;
          id?: string;
          mensagem?: string | null;
          razao_social?: string | null;
          status: string;
        };
        Update: {
          campos_alterados?: Json | null;
          cnpj?: string | null;
          created_at?: string;
          entidade_id?: string;
          entidade_tipo?: string;
          id?: string;
          mensagem?: string | null;
          razao_social?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      system_announcements: {
        Row: {
          ativo: boolean;
          created_at: string;
          created_by: string | null;
          emoji: string | null;
          id: string;
          mensagem: string;
          titulo: string;
          updated_at: string;
          versao: string | null;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          emoji?: string | null;
          id?: string;
          mensagem: string;
          titulo: string;
          updated_at?: string;
          versao?: string | null;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          emoji?: string | null;
          id?: string;
          mensagem?: string;
          titulo?: string;
          updated_at?: string;
          versao?: string | null;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      tarefas: {
        Row: {
          agencia_id: string | null;
          cliente_id: string | null;
          created_at: string;
          descricao: string | null;
          id: string;
          ordem: number;
          pi_id: string | null;
          prazo: string | null;
          prioridade: string;
          projeto_id: string | null;
          proposta_id: string | null;
          responsavel: string | null;
          status: string;
          tenant_id: string | null;
          titulo: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          pi_id?: string | null;
          prazo?: string | null;
          prioridade?: string;
          projeto_id?: string | null;
          proposta_id?: string | null;
          responsavel?: string | null;
          status?: string;
          tenant_id?: string | null;
          titulo: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          agencia_id?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          pi_id?: string | null;
          prazo?: string | null;
          prioridade?: string;
          projeto_id?: string | null;
          proposta_id?: string | null;
          responsavel?: string | null;
          status?: string;
          tenant_id?: string | null;
          titulo?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tarefas_agencia_id_fkey";
            columns: ["agencia_id"];
            isOneToOne: false;
            referencedRelation: "agencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_pi_id_fkey";
            columns: ["pi_id"];
            isOneToOne: false;
            referencedRelation: "pis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "projetos_especiais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_proposta_id_fkey";
            columns: ["proposta_id"];
            isOneToOne: false;
            referencedRelation: "propostas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          bloqueado: boolean;
          bloqueado_em: string | null;
          bloqueado_motivo: string | null;
          categorias_servicos: string[];
          ciclo: string;
          cnpj: string | null;
          contato_email: string | null;
          contato_nome: string | null;
          contato_whatsapp: string | null;
          cor_primaria: string | null;
          created_at: string;
          created_by: string | null;
          data_inicio: string;
          dominio_proprio: string | null;
          id: string;
          logo_url: string | null;
          max_usuarios: number;
          max_usuarios_override: number | null;
          mensagem_alerta: string | null;
          modulos_override: string[] | null;
          nome_fantasia: string | null;
          observacoes: string | null;
          plano: string;
          plano_id: string | null;
          produto_marca: string;
          proposta_layout_padrao: string | null;
          proximo_vencimento: string | null;
          razao_social: string;
          status: string;
          updated_at: string;
          valor_mensal: number;
        };
        Insert: {
          bloqueado?: boolean;
          bloqueado_em?: string | null;
          bloqueado_motivo?: string | null;
          categorias_servicos?: string[];
          ciclo?: string;
          cnpj?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_whatsapp?: string | null;
          cor_primaria?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_inicio?: string;
          dominio_proprio?: string | null;
          id?: string;
          logo_url?: string | null;
          max_usuarios?: number;
          max_usuarios_override?: number | null;
          mensagem_alerta?: string | null;
          modulos_override?: string[] | null;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          plano?: string;
          plano_id?: string | null;
          produto_marca?: string;
          proposta_layout_padrao?: string | null;
          proximo_vencimento?: string | null;
          razao_social: string;
          status?: string;
          updated_at?: string;
          valor_mensal?: number;
        };
        Update: {
          bloqueado?: boolean;
          bloqueado_em?: string | null;
          bloqueado_motivo?: string | null;
          categorias_servicos?: string[];
          ciclo?: string;
          cnpj?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_whatsapp?: string | null;
          cor_primaria?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_inicio?: string;
          dominio_proprio?: string | null;
          id?: string;
          logo_url?: string | null;
          max_usuarios?: number;
          max_usuarios_override?: number | null;
          mensagem_alerta?: string | null;
          modulos_override?: string[] | null;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          plano?: string;
          plano_id?: string | null;
          produto_marca?: string;
          proposta_layout_padrao?: string | null;
          proximo_vencimento?: string | null;
          razao_social?: string;
          status?: string;
          updated_at?: string;
          valor_mensal?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_plano_id_fkey";
            columns: ["plano_id"];
            isOneToOne: false;
            referencedRelation: "planos";
            referencedColumns: ["id"];
          },
        ];
      };
      trash_items: {
        Row: {
          deleted_at: string;
          deleted_by: string | null;
          descricao: string | null;
          expires_at: string;
          id: string;
          payload: Json;
          registro_id: string;
          restored_at: string | null;
          tabela: string;
          tenant_id: string | null;
        };
        Insert: {
          deleted_at?: string;
          deleted_by?: string | null;
          descricao?: string | null;
          expires_at?: string;
          id?: string;
          payload: Json;
          registro_id: string;
          restored_at?: string | null;
          tabela: string;
          tenant_id?: string | null;
        };
        Update: {
          deleted_at?: string;
          deleted_by?: string | null;
          descricao?: string | null;
          expires_at?: string;
          id?: string;
          payload?: Json;
          registro_id?: string;
          restored_at?: string | null;
          tabela?: string;
          tenant_id?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_cron_runs: {
        Args: { _limit?: number };
        Returns: {
          end_time: string;
          jobid: number;
          jobname: string;
          return_message: string;
          start_time: string;
          status: string;
        }[];
      };
      calcular_comissao_pi: {
        Args: { _fornecedor_id: string; _pi_id: string };
        Returns: {
          base: number;
          percentual: number;
          regra_id: string;
          valor: number;
        }[];
      };
      can_access_briefing: {
        Args: { _briefing_id: string; _user_id: string };
        Returns: boolean;
      };
      can_access_pi: {
        Args: { _pi_id: string; _user_id: string };
        Returns: boolean;
      };
      can_access_storage_material: {
        Args: { _name: string; _uid: string };
        Returns: boolean;
      };
      can_access_storage_pi_anexo: {
        Args: { _name: string; _uid: string };
        Returns: boolean;
      };
      can_access_storage_projeto: {
        Args: { _name: string; _uid: string };
        Returns: boolean;
      };
      can_access_storage_proposta_anexo: {
        Args: { _name: string; _uid: string };
        Returns: boolean;
      };
      current_tenant_id: { Args: never; Returns: string };
      delete_email: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      email_queue_dispatch: { Args: never; Returns: undefined };
      enqueue_email: {
        Args: { payload: Json; queue_name: string };
        Returns: number;
      };
      gerar_pos_vendas_pendentes: { Args: never; Returns: number };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      is_demo_user: { Args: { _user_id: string }; Returns: boolean };
      is_super_admin: { Args: { _user_id: string }; Returns: boolean };
      is_trial_expired: { Args: { _user_id: string }; Returns: boolean };
      landing_page_increment_view: {
        Args: { _slug: string };
        Returns: undefined;
      };
      move_to_dlq: {
        Args: {
          dlq_name: string;
          message_id: number;
          payload: Json;
          source_queue: string;
        };
        Returns: number;
      };
      notificar_datas_comemorativas: { Args: never; Returns: number };
      purge_expired_trash: { Args: never; Returns: number };
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number };
        Returns: {
          message: Json;
          msg_id: number;
          read_ct: number;
        }[];
      };
      restore_trash_item: { Args: { _id: string }; Returns: undefined };
      tenant_has_modulo: {
        Args: { _modulo: string; _tenant_id: string };
        Returns: boolean;
      };
      tenant_modulos: { Args: { _tenant_id: string }; Returns: string[] };
      tenant_user_count: { Args: { _tenant_id: string }; Returns: number };
      tenant_user_limit: { Args: { _tenant_id: string }; Returns: number };
      trigger_sync_cnpj_burst: { Args: never; Returns: undefined };
    };
    Enums: {
      app_role:
        | "admin"
        | "executivo"
        | "opec"
        | "financeiro"
        | "diretoria"
        | "producao"
        | "parceiro_comercial"
        | "super_admin"
        | "teste";
      comissao_escopo: "global" | "fornecedor" | "cliente" | "campanha" | "tipo_midia";
      comissao_status: "prevista" | "confirmada" | "paga" | "cancelada";
      evento_origem: "reuniao" | "proposta" | "pi" | "google" | "manual";
      midia_tipo: "TV" | "Radio" | "DOOH";
      notificacao_tipo:
        | "novo_pi"
        | "pi_anexado"
        | "campanha_finalizando"
        | "projeto_finalizando"
        | "outro"
        | "campanha_iniciando"
        | "campanha_progresso"
        | "proposta_vencendo"
        | "pi_aguardando_aprovacao"
        | "pi_aprovado"
        | "pi_reprovado"
        | "producao_solicitada"
        | "pi_renovado";
      pessoa_tipo: "pj" | "cpf";
      pi_status:
        | "rascunho"
        | "enviado"
        | "aprovado"
        | "faturado"
        | "cancelado"
        | "substituido"
        | "aguardando_aprovacao"
        | "reprovado"
        | "aguardando_assinatura"
        | "assinado"
        | "enviar_opec"
        | "veiculado"
        | "encerrado"
        | "finalizado";
      projeto_status: "em_comercializacao" | "vendido" | "encerrado";
      proposta_status: "rascunho" | "enviada" | "aprovada" | "recusada" | "convertida";
      reuniao_status: "agendada" | "realizada" | "cancelada" | "remarcada";
      tipo_midia:
        | "tv"
        | "radio"
        | "portal"
        | "ooh"
        | "dooh"
        | "influencer"
        | "redes_sociais"
        | "outros"
        | "agencia_publicidade"
        | "produtora"
        | "grafica"
        | "estudio"
        | "assessoria_imprensa"
        | "marketing_digital"
        | "evento"
        | "editora";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "executivo",
        "opec",
        "financeiro",
        "diretoria",
        "producao",
        "parceiro_comercial",
        "super_admin",
        "teste",
      ],
      comissao_escopo: ["global", "fornecedor", "cliente", "campanha", "tipo_midia"],
      comissao_status: ["prevista", "confirmada", "paga", "cancelada"],
      evento_origem: ["reuniao", "proposta", "pi", "google", "manual"],
      midia_tipo: ["TV", "Radio", "DOOH"],
      notificacao_tipo: [
        "novo_pi",
        "pi_anexado",
        "campanha_finalizando",
        "projeto_finalizando",
        "outro",
        "campanha_iniciando",
        "campanha_progresso",
        "proposta_vencendo",
        "pi_aguardando_aprovacao",
        "pi_aprovado",
        "pi_reprovado",
        "producao_solicitada",
        "pi_renovado",
      ],
      pessoa_tipo: ["pj", "cpf"],
      pi_status: [
        "rascunho",
        "enviado",
        "aprovado",
        "faturado",
        "cancelado",
        "substituido",
        "aguardando_aprovacao",
        "reprovado",
        "aguardando_assinatura",
        "assinado",
        "enviar_opec",
        "veiculado",
        "encerrado",
        "finalizado",
      ],
      projeto_status: ["em_comercializacao", "vendido", "encerrado"],
      proposta_status: ["rascunho", "enviada", "aprovada", "recusada", "convertida"],
      reuniao_status: ["agendada", "realizada", "cancelada", "remarcada"],
      tipo_midia: [
        "tv",
        "radio",
        "portal",
        "ooh",
        "dooh",
        "influencer",
        "redes_sociais",
        "outros",
        "agencia_publicidade",
        "produtora",
        "grafica",
        "estudio",
        "assessoria_imprensa",
        "marketing_digital",
        "evento",
        "editora",
      ],
    },
  },
} as const;
