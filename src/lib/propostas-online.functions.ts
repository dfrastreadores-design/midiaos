/**
 * SERVER FUNCTIONS DO PORTAL PÚBLICO DA PROPOSTA ONLINE & APROVAÇÃO DIGITAL — MÍDIA.OS
 * Permite que anunciantes visualizem o planejamento, forneçam feedbacks estruturados e aprovem com assinatura digital.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";
import { gerarDefesaComercialPersuasiva } from "@/lib/motor-defesas-comerciais";

export interface PropostaOnlinePublica {
  id: string;
  numero: string;
  public_token: string;
  campanha: string;
  status: string;
  validade: string | null;
  observacao: string | null;
  publico_interesse: string | null;
  valor_tabela: number;
  valor_desconto: number;
  valor_negociado: number;
  total_insercoes: number;
  created_at: string;
  aprovado_digitalmente_em: string | null;
  aprovado_por_nome: string | null;
  aprovado_por_cargo: string | null;
  cliente: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string | null;
    logo_url: string | null;
  } | null;
  agencia: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string | null;
  } | null;
  executivo: {
    nome: string | null;
    email: string | null;
    telefone: string | null;
    cargo: string | null;
  } | null;
  organizacao: {
    nome: string;
    logo_url: string | null;
    site_url: string | null;
    tagline: string | null;
    cor_primaria: string | null;
  } | null;
  itens: Array<{
    id: string;
    tipo: string;
    programa: string | null;
    formato: string | null;
    horario: string | null;
    total_insercoes: number;
    valor_unit: number;
    valor_tabela: number;
    desconto: number;
    valor_negociado: number;
    endereco_ponto: string | null;
    latitude: number | null;
    longitude: number | null;
    link_maps: string | null;
    sentido_via: string | null;
    ponto_referencia: string | null;
    fluxo_veiculos_dia: number | null;
    fotos: string[];
  }>;
  defesaComercial: ReturnType<typeof gerarDefesaComercialPersuasiva>;
}

/**
 * 1. CONSULTA PÚBLICA SEGURA DA PROPOSTA PELO TOKEN
 */
export const getPropostaPublicaOnline = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data: input }): Promise<PropostaOnlinePublica | null> => {
    const client = supabaseAdmin || supabase;

    // Buscar a proposta pelo public_token ou id como fallback
    let query = client
      .from("propostas")
      .select(`
        *,
        itens:proposta_itens(*),
        cliente:clientes(razao_social, nome_fantasia, cnpj, logo_url),
        agencia:agencias(razao_social, nome_fantasia, cnpj),
        executivo:profiles!propostas_executivo_id_fkey(nome, email, telefone, cargo)
      `);

    // Tentar por public_token primeiro
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.token);
    if (isUuid) {
      query = query.or(`public_token.eq.${input.token},id.eq.${input.token}`);
    } else {
      query = query.eq("numero", input.token);
    }

    const { data: prop, error } = await query.maybeSingle();

    if (error || !prop) {
      console.warn("[getPropostaPublicaOnline] Proposta não encontrada com token:", input.token, error?.message);
      return null;
    }

    // Buscar organização emissora (White-label do inquilino)
    let organizacao: any = null;
    if (prop.tenant_id) {
      const { data: orgData } = await client
        .from("tenants")
        .select("nome, logo_url")
        .eq("id", prop.tenant_id)
        .maybeSingle();

      if (orgData) {
        organizacao = {
          nome: orgData.nome || "Mídia.OS",
          logo_url: orgData.logo_url || null,
          site_url: "https://midiaos.online",
          tagline: "Plataforma de Inteligência e Operações de Mídia",
          cor_primaria: "#3B82F6",
        };
      }
    }

    // Se não encontrou no tenants, buscar da tabela organizacoes se houver
    if (!organizacao) {
      organizacao = {
        nome: "Mídia.OS",
        logo_url: null,
        site_url: "https://midiaos.online",
        tagline: "Plataforma de Gestão de Mídia & Inteligência Publicitária",
        cor_primaria: "#3B82F6",
      };
    }

    // Enriquecer fotos reais dos pontos de mídia caso não preenchidas no item
    const itensProcessados = (prop.itens || []).map((it: any) => {
      let fotos: string[] = [];
      if (Array.isArray(it.fotos) && it.fotos.length > 0) {
        fotos = it.fotos;
      } else if (typeof it.fotos === "string") {
        try {
          fotos = JSON.parse(it.fotos);
        } catch {
          if (it.fotos.startsWith("http")) fotos = [it.fotos];
        }
      }

      return {
        id: it.id,
        tipo: it.tipo || "Mídia",
        programa: it.programa || null,
        formato: it.formato || null,
        horario: it.horario || null,
        total_insercoes: Number(it.total_insercoes) || 1,
        valor_unit: Number(it.valor_unit) || 0,
        valor_tabela: Number(it.valor_tabela) || 0,
        desconto: Number(it.desconto) || 0,
        valor_negociado: Number(it.valor_negociado) || 0,
        endereco_ponto: it.endereco_ponto || null,
        latitude: it.latitude ? Number(it.latitude) : null,
        longitude: it.longitude ? Number(it.longitude) : null,
        link_maps: it.link_maps || null,
        sentido_via: it.sentido_via || null,
        ponto_referencia: it.ponto_referencia || null,
        fluxo_veiculos_dia: it.fluxo_veiculos_dia ? Number(it.fluxo_veiculos_dia) : null,
        fotos,
      };
    });

    const meiosUtilizados = Array.from(new Set(itensProcessados.map((it: any) => it.tipo))).filter(Boolean) as string[];
    const clienteNome = prop.cliente?.nome_fantasia || prop.cliente?.razao_social || prop.cliente_avulso || "Cliente";

    const defesa = gerarDefesaComercialPersuasiva({
      clienteNome,
      campanha: prop.campanha,
      publicoInteresse: prop.publico_interesse,
      meiosUtilizados,
      totalInvestimento: Number(prop.valor_negociado) || 0,
      totalInsercoes: Number(prop.total_insercoes) || 0,
    });

    return {
      id: prop.id,
      numero: prop.numero,
      public_token: prop.public_token || prop.id,
      campanha: prop.campanha,
      status: prop.status,
      validade: prop.validade,
      observacao: prop.observacao,
      publico_interesse: prop.publico_interesse,
      valor_tabela: Number(prop.valor_tabela) || 0,
      valor_desconto: Number(prop.valor_desconto) || 0,
      valor_negociado: Number(prop.valor_negociado) || 0,
      total_insercoes: Number(prop.total_insercoes) || 0,
      created_at: prop.created_at,
      aprovado_digitalmente_em: prop.aprovado_digitalmente_em,
      aprovado_por_nome: prop.aprovado_por_nome,
      aprovado_por_cargo: prop.aprovado_por_cargo,
      cliente: prop.cliente,
      agencia: prop.agencia,
      executivo: prop.executivo,
      organizacao,
      itens: itensProcessados,
      defesaComercial: defesa,
    };
  });

/**
 * 2. ENVIAR FEEDBACK / SUGESTÃO DE ALTERAÇÃO DO ANUNCIANTE
 */
export const enviarFeedbackPropostaOnline = createServerFn({ method: "POST" })
  .validator(
    (d: {
      token: string;
      tipo: "troca_ponto" | "ajuste_periodo" | "revisao_valores" | "outro";
      mensagem: string;
      autorNome?: string;
      autorContato?: string;
    }) =>
      z
        .object({
          token: z.string().min(1),
          tipo: z.enum(["troca_ponto", "ajuste_periodo", "revisao_valores", "outro"]),
          mensagem: z.string().min(3).max(2000),
          autorNome: z.string().max(120).optional(),
          autorContato: z.string().max(120).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data: input }) => {
    const client = supabaseAdmin || supabase;

    // Resgatar a proposta
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.token);
    let q = client.from("propostas").select("id, tenant_id, executivo_id, created_by, campanha, numero");
    if (isUuid) {
      q = q.or(`public_token.eq.${input.token},id.eq.${input.token}`);
    } else {
      q = q.eq("numero", input.token);
    }

    const { data: prop, error: pErr } = await q.maybeSingle();
    if (pErr || !prop) throw new Error("Proposta não encontrada.");

    // Gravar o feedback na tabela proposta_feedbacks
    const { error: fErr } = await client.from("proposta_feedbacks").insert({
      tenant_id: prop.tenant_id,
      proposta_id: prop.id,
      tipo: input.tipo,
      mensagem: input.mensagem.trim(),
      autor_nome: input.autorNome?.trim() || "Anunciante",
      autor_contato: input.autorContato?.trim() || null,
      status: "pendente",
    } as any);

    if (fErr) {
      console.warn("[enviarFeedbackPropostaOnline] Erro ao gravar feedback:", fErr.message);
    }

    // Notificar o executivo responsável
    const destUser = prop.executivo_id || prop.created_by;
    if (destUser) {
      await client.from("notificacoes").insert({
        user_id: destUser,
        tipo: "proposta",
        titulo: `Novo Feedback na Proposta ${prop.numero}`,
        mensagem: `${input.autorNome || "O cliente"} sugeriu alteração na proposta "${prop.campanha}": "${input.mensagem.slice(0, 80)}..."`,
        link: `/propostas?id=${prop.id}`,
        metadata: { proposta_id: prop.id, tipo: input.tipo },
      } as any).catch(() => null);
    }

    return { ok: true, message: "Sugestão recebida com sucesso! Nossa equipe comercial avaliará os ajustes." };
  });

/**
 * 3. APROVAÇÃO DIGITAL FORMAL DA PROPOSTA PELO CLIENTE
 */
export const aprovarPropostaOnline = createServerFn({ method: "POST" })
  .validator(
    (d: {
      token: string;
      nome: string;
      cargo: string;
      documento?: string;
    }) =>
      z
        .object({
          token: z.string().min(1),
          nome: z.string().min(2).max(120),
          cargo: z.string().min(2).max(80),
          documento: z.string().max(40).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data: input }) => {
    const client = supabaseAdmin || supabase;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.token);
    let q = client.from("propostas").select("id, status, tenant_id, executivo_id, created_by, campanha, numero");
    if (isUuid) {
      q = q.or(`public_token.eq.${input.token},id.eq.${input.token}`);
    } else {
      q = q.eq("numero", input.token);
    }

    const { data: prop, error: pErr } = await q.maybeSingle();
    if (pErr || !prop) throw new Error("Proposta não encontrada.");

    const agora = new Date().toISOString();

    // Atualizar proposta para Aprovada com carimbo de aceite digital
    const { error: updErr } = await client
      .from("propostas")
      .update({
        status: "aprovada",
        aprovado_digitalmente_em: agora,
        aprovado_por_nome: input.nome.trim(),
        aprovado_por_cargo: input.cargo.trim(),
        aprovado_por_documento: input.documento?.trim() || null,
        updated_at: agora,
      } as any)
      .eq("id", prop.id);

    if (updErr) throw new Error("Falha ao registrar aprovação: " + updErr.message);

    // Gravar no histórico de propostas
    await client.from("proposal_history").insert({
      proposal_id: prop.id,
      change_type: "aprovacao_digital",
      details: {
        aprovador: input.nome,
        cargo: input.cargo,
        documento: input.documento,
        data: agora,
      },
    } as any).catch(() => null);

    // Notificar equipe comercial
    const destUser = prop.executivo_id || prop.created_by;
    if (destUser) {
      await client.from("notificacoes").insert({
        user_id: destUser,
        tipo: "proposta_aprovada",
        titulo: `🎉 Proposta ${prop.numero} Aprovada!`,
        mensagem: `${input.nome} (${input.cargo}) formalizou a aprovação digital da proposta "${prop.campanha}". Já pode ser emitido o PI!`,
        link: `/propostas?id=${prop.id}`,
        metadata: { proposta_id: prop.id },
      } as any).catch(() => null);
    }

    return {
      ok: true,
      dataAprovacao: agora,
      message: "Proposta aprovada com sucesso! A ordem de veiculação e o Pedido de Inserção já estão sendo providenciados.",
    };
  });
