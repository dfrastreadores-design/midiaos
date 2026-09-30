import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ContratoModelo {
  id: string;
  tenant_id?: string;
  titulo: string;
  tipo: "cliente" | "agencia" | "parceiro" | "prestacao_servicos" | "outro";
  conteudo: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contrato {
  id: string;
  tenant_id?: string;
  numero: string;
  tipo: string;
  titulo: string;
  modelo_id?: string | null;
  cliente_id?: string | null;
  agencia_id?: string | null;
  parceiro_id?: string | null;
  pi_id?: string | null;
  proposta_id?: string | null;
  valor: number;
  comissao_pct: number;
  comissao_valor: number;
  repasse_valor: number;
  data_inicio?: string | null;
  data_fim?: string | null;
  status: "rascunho" | "em_aprovacao" | "aguardando_assinatura" | "assinado" | "recusado" | "cancelado";
  conteudo_gerado?: string | null;
  arquivo_url?: string | null;
  observacoes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Relações
  cliente?: { razao_social: string; nome_fantasia: string; cnpj: string } | null;
  agencia?: { razao_social: string; nome_fantasia: string; cnpj: string } | null;
  parceiro?: { razao_social: string; nome_fantasia: string; cnpj: string } | null;
  pi?: { numero: string; campanha: string } | null;
}

export const VARIAVEIS_CONTRATO = [
  { key: "NOME_EMPRESA", label: "Nome da Empresa / Veículo Principal" },
  { key: "CNPJ_EMPRESA", label: "CNPJ da Empresa" },
  { key: "ENDERECO_EMPRESA", label: "Endereço Completo da Empresa" },
  { key: "CLIENTE", label: "Nome / Razão Social do Cliente (Anunciante)" },
  { key: "CNPJ_CLIENTE", label: "CNPJ / CPF do Cliente" },
  { key: "AGENCIA", label: "Nome da Agência de Publicidade" },
  { key: "CNPJ_AGENCIA", label: "CNPJ da Agência" },
  { key: "PARCEIRO", label: "Nome do Parceiro / Veículo de Mídia" },
  { key: "CNPJ_PARCEIRO", label: "CNPJ do Parceiro" },
  { key: "CAMPANHA", label: "Título da Campanha Publicitária" },
  { key: "VALOR", label: "Valor Total Comercializado (R$)" },
  { key: "COMISSAO", label: "Valor / Percentual da Comissão de Mídia" },
  { key: "REPASSE", label: "Valor Líquido do Repasse ao Veículo / Parceiro" },
  { key: "DATA_INICIO", label: "Data de Início da Veiculação" },
  { key: "DATA_FIM", label: "Data de Término da Veiculação" },
  { key: "RESPONSAVEL", label: "Responsável Comercial / Executivo" },
] as const;

/**
 * Substitui as variáveis {{TAG}} pelos dados reais da negociação
 */
export function preencherVariaveisContrato(
  template: string,
  dados: Record<string, string | number | undefined | null>,
): string {
  let resultado = template;
  for (const [k, v] of Object.entries(dados)) {
    const valStr = v !== undefined && v !== null ? String(v) : "—";
    const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
    resultado = resultado.replace(regex, valStr);
  }
  return resultado;
}

/**
 * Lista os modelos de contrato disponíveis no tenant
 */
export const listContratoModelos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("contrato_modelos")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Aviso ao listar modelos de contratos:", error.message);
      return [] as ContratoModelo[];
    }
    return (data || []) as ContratoModelo[];
  });

/**
 * Salva ou atualiza um modelo de contrato
 */
export const upsertContratoModelo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      titulo: string;
      tipo: ContratoModelo["tipo"];
      conteudo: string;
      variaveis_disponiveis?: string[];
      ativo?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("contrato_modelos")
        .update({
          titulo: data.titulo.trim(),
          tipo: data.tipo,
          conteudo: data.conteudo,
          variaveis_disponiveis: data.variaveis_disponiveis || [],
          ativo: data.ativo ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as ContratoModelo;
    }

    const { data: created, error } = await supabase
      .from("contrato_modelos")
      .insert({
        titulo: data.titulo.trim(),
        tipo: data.tipo,
        conteudo: data.conteudo,
        variaveis_disponiveis: data.variaveis_disponiveis || [],
        ativo: data.ativo ?? true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as ContratoModelo;
  });

/**
 * Lista todos os contratos emitidos
 */
export const listContratos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("contratos")
      .select(`
        *,
        cliente:clientes(razao_social, nome_fantasia, cnpj),
        agencia:agencias(razao_social, nome_fantasia, cnpj),
        parceiro:parceiros(razao_social, nome_fantasia, cnpj),
        pi:pis(numero, campanha)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao listar contratos:", error.message);
      return [] as Contrato[];
    }
    return (data || []) as Contrato[];
  });

/**
 * Cria ou atualiza um contrato preenchido
 */
export const upsertContrato = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      numero?: string;
      tipo: string;
      titulo: string;
      modelo_id?: string | null;
      cliente_id?: string | null;
      agencia_id?: string | null;
      parceiro_id?: string | null;
      pi_id?: string | null;
      proposta_id?: string | null;
      valor: number;
      comissao_pct?: number;
      comissao_valor?: number;
      repasse_valor?: number;
      data_inicio?: string | null;
      data_fim?: string | null;
      status?: Contrato["status"];
      conteudo_gerado?: string | null;
      observacoes?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const ano = new Date().getFullYear();
    const numero = data.numero || `CTR-${ano}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("contratos")
        .update({
          titulo: data.titulo.trim(),
          tipo: data.tipo,
          modelo_id: data.modelo_id || null,
          cliente_id: data.cliente_id || null,
          agencia_id: data.agencia_id || null,
          parceiro_id: data.parceiro_id || null,
          pi_id: data.pi_id || null,
          proposta_id: data.proposta_id || null,
          valor: data.valor,
          comissao_pct: data.comissao_pct || 0,
          comissao_valor: data.comissao_valor || 0,
          repasse_valor: data.repasse_valor || 0,
          data_inicio: data.data_inicio || null,
          data_fim: data.data_fim || null,
          status: data.status || "rascunho",
          conteudo_gerado: data.conteudo_gerado || null,
          observacoes: data.observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as Contrato;
    }

    const { data: created, error } = await supabase
      .from("contratos")
      .insert({
        numero,
        tipo: data.tipo,
        titulo: data.titulo.trim(),
        modelo_id: data.modelo_id || null,
        cliente_id: data.cliente_id || null,
        agencia_id: data.agencia_id || null,
        parceiro_id: data.parceiro_id || null,
        pi_id: data.pi_id || null,
        proposta_id: data.proposta_id || null,
        valor: data.valor,
        comissao_pct: data.comissao_pct || 0,
        comissao_valor: data.comissao_valor || 0,
        repasse_valor: data.repasse_valor || 0,
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
        status: data.status || "rascunho",
        conteudo_gerado: data.conteudo_gerado || null,
        observacoes: data.observacoes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as Contrato;
  });

/**
 * Exclui um contrato
 */
export const deleteContrato = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("contratos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
