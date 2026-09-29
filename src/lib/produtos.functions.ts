import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MidiaEnum = z.string().min(1).max(80);

const ProdutoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(160),
  midia: MidiaEnum,
  tipo: z.string().max(60).optional().nullable(),
  programa: z.string().max(120).optional().nullable(),
  formato: z.string().max(120).optional().nullable(),
  faixa: z.string().max(120).optional().nullable(),
  duracao_segundos: z.number().int().min(1).max(7200),
  insercoes_padrao: z.number().int().min(1).max(10000),
  valor_unit: z.number().min(0),
  ativo: z.boolean().default(true),
  observacao: z.string().max(1000).optional().nullable(),
  link_modelo: z.string().trim().url().max(500).optional().nullable().or(z.literal("").transform(() => null)),
  requer_producao: z.boolean().default(false),
  emissora_id: z.string().uuid().optional().nullable(),
  veiculacao_tipo: z.enum(["livre", "dias_uteis", "seg_sab", "dias_fixos", "dias_semana"]).default("livre"),
  dias_fixos: z.array(z.number().int().min(1).max(31)).default([]),
  dias_semana_fixos: z.array(z.number().int().min(0).max(6)).default([]),
  endereco_ponto: z.string().max(300).optional().nullable(),
  cep: z.string().max(20).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  quantidade_telas: z.number().int().min(0).max(100000).optional().nullable(),
  ambientes: z.array(z.string().max(60)).default([]),
  formato_tela: z.string().max(120).optional().nullable(),
  resolucao: z.string().max(60).optional().nullable(),
  tempo_exibicao_segundos: z.number().int().min(0).max(3600).optional().nullable(),
  loop_minutos: z.number().int().min(0).max(1440).optional().nullable(),
  insercoes_por_hora: z.number().int().min(0).max(10000).optional().nullable(),
  horas_operacao_dia: z.number().int().min(0).max(24).optional().nullable(),
  detalhes_venda: z.string().max(2000).optional().nullable(),
  parceiro_id: z.string().uuid().optional().nullable(),
  parceiro_cnpj: z.string().max(30).optional().nullable(),
  parceiro_nome: z.string().max(200).optional().nullable(),
  comissao_inquilino_pct: z.number().min(0).max(100).optional().nullable(),
  fotos: z.array(z.string().max(2000)).max(2).optional().default([]),
});

function normalizeProdutoRow(row: any) {
  let parceiro_id = row.parceiro_id || null;
  let parceiro_cnpj = row.parceiro_cnpj || null;
  let parceiro_nome = row.parceiro_nome || null;
  let comissao_inquilino_pct = row.comissao_inquilino_pct !== undefined && row.comissao_inquilino_pct !== null ? Number(row.comissao_inquilino_pct) : null;
  let cep = row.cep || null;
  let fotos: string[] = [];

  if (Array.isArray(row.fotos)) {
    fotos = row.fotos.filter((f: any) => typeof f === "string" && f.trim().length > 0).slice(0, 2);
  } else if (typeof row.fotos === "string") {
    try {
      const parsed = JSON.parse(row.fotos);
      if (Array.isArray(parsed)) fotos = parsed.filter(Boolean).slice(0, 2);
    } catch {
      if (row.fotos.trim()) fotos = [row.fotos.trim()];
    }
  }

  if (row.detalhes_venda) {
    try {
      const parsed = JSON.parse(row.detalhes_venda);
      if (parsed && typeof parsed === "object") {
        if (!parceiro_id && parsed._parceiro_id) {
          parceiro_id = parsed._parceiro_id;
        }
        if (!parceiro_cnpj && parsed._parceiro) {
          parceiro_cnpj = parsed._parceiro.cnpj || null;
          parceiro_nome = parsed._parceiro.nome || null;
        }
        if (comissao_inquilino_pct === null && parsed._comissao_inquilino_pct !== undefined) {
          comissao_inquilino_pct = Number(parsed._comissao_inquilino_pct);
        }
        if (!cep && parsed._cep) {
          cep = parsed._cep;
        }
        if (fotos.length === 0 && Array.isArray(parsed._fotos)) {
          fotos = parsed._fotos.filter((f: any) => typeof f === "string" && f.trim().length > 0).slice(0, 2);
        }
      }
    } catch {
      // ignora caso não seja JSON
    }
  }

  if (!cep && row.endereco_ponto) {
    const m = String(row.endereco_ponto).match(/\b\d{5}-?\d{3}\b/);
    if (m) cep = m[0];
  }

  return {
    ...row,
    cep: cep ? String(cep).trim() : null,
    parceiro_id: parceiro_id || null,
    parceiro_cnpj: parceiro_cnpj ? String(parceiro_cnpj).trim() : null,
    parceiro_nome: parceiro_nome ? String(parceiro_nome).trim() : null,
    comissao_inquilino_pct: comissao_inquilino_pct !== null && !isNaN(comissao_inquilino_pct) ? comissao_inquilino_pct : null,
    fotos: fotos,
  };
}

export const listProdutos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Obter tenant_id do usuário logado para isolamento estrito
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    let query = context.supabase.from("produtos").select("*");

    // Filtra pelo tenant do usuário caso exista
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query
      .order("midia")
      .order("nome");
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeProdutoRow);
  });

export const upsertProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProdutoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    const parceiroId = data.parceiro_id || null;
    const parceiroCnpj = data.parceiro_cnpj ? data.parceiro_cnpj.trim() : null;
    const parceiroNome = data.parceiro_nome ? data.parceiro_nome.trim() : null;
    const comissaoInquilinoPct = data.comissao_inquilino_pct !== undefined && data.comissao_inquilino_pct !== null ? Number(data.comissao_inquilino_pct) : null;
    const cep = data.cep ? data.cep.trim() : null;
    const fotos = Array.isArray(data.fotos)
      ? data.fotos.filter((f: any) => typeof f === "string" && f.trim().length > 0).slice(0, 2)
      : [];

    let payload: any = {
      ...data,
      created_by: context.userId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      parceiro_id: parceiroId,
      parceiro_cnpj: parceiroCnpj,
      parceiro_nome: parceiroNome,
      comissao_inquilino_pct: comissaoInquilinoPct,
      cep: cep,
      fotos: fotos,
    };

    // Tenta salvar com as colunas dedicadas parceiro_*, comissao_inquilino_pct, cep e fotos
    let q = data.id
      ? context.supabase.from("produtos").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("produtos").insert(payload).select().single();
    let res = await q;

    // Se as colunas parceiro_*, comissao_inquilino_pct, cep ou fotos ainda não existirem na tabela SQL do Supabase:
    if (res.error && (res.error.message.toLowerCase().includes("parceiro") || res.error.message.toLowerCase().includes("cep") || res.error.message.toLowerCase().includes("comissao") || res.error.message.toLowerCase().includes("foto"))) {
      delete payload.parceiro_id;
      delete payload.parceiro_cnpj;
      delete payload.parceiro_nome;
      delete payload.comissao_inquilino_pct;
      delete payload.cep;
      delete payload.fotos;

      let metaObj: any = {};
      if (payload.detalhes_venda) {
        try {
          const parsed = JSON.parse(payload.detalhes_venda);
          if (parsed && typeof parsed === "object") metaObj = parsed;
          else metaObj = { _texto: payload.detalhes_venda };
        } catch {
          metaObj = { _texto: payload.detalhes_venda };
        }
      }
      if (parceiroId) metaObj._parceiro_id = parceiroId;
      metaObj._parceiro = parceiroCnpj ? { cnpj: parceiroCnpj, nome: parceiroNome } : null;
      if (comissaoInquilinoPct !== null) metaObj._comissao_inquilino_pct = comissaoInquilinoPct;
      if (cep) metaObj._cep = cep;
      if (fotos.length > 0) metaObj._fotos = fotos;
      payload.detalhes_venda = JSON.stringify(metaObj);

      q = data.id
        ? context.supabase.from("produtos").update(payload).eq("id", data.id).select().single()
        : context.supabase.from("produtos").insert(payload).select().single();
      res = await q;
    }

    if (res.error) throw new Error(res.error.message);
    return normalizeProdutoRow(res.data);
  });

export const deleteProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("produtos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProdutoTipos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    if (tenantId) {
      // Obter IDs dos usuários pertencentes a este inquilino
      const { data: tenantUsers } = await context.supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", tenantId);
      const tenantUserIds = (tenantUsers ?? []).map((u: any) => u.id).filter(Boolean);

      // Tenta filtrar pela coluna tenant_id
      let { data, error } = await context.supabase
        .from("produto_tipos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("midia")
        .order("nome");

      // Se a coluna tenant_id ainda não existir no banco SQL, consulta por created_by dos usuários do inquilino
      if (error && error.message.toLowerCase().includes("tenant_id")) {
        const fallback = await context.supabase
          .from("produto_tipos")
          .select("*")
          .in("created_by", tenantUserIds.length ? tenantUserIds : [context.userId])
          .order("midia")
          .order("nome");
        data = fallback.data;
        error = fallback.error;
      } else if (!error && (!data || data.length === 0) && tenantUserIds.length > 0) {
        // Se a coluna existe mas tipos foram criados antes da migration com apenas created_by
        const { data: legacyData } = await context.supabase
          .from("produto_tipos")
          .select("*")
          .in("created_by", tenantUserIds)
          .order("midia")
          .order("nome");
        if (legacyData && legacyData.length > 0) {
          const map = new Map<string, any>();
          for (const item of [...(data ?? []), ...legacyData]) {
            map.set(item.id, item);
          }
          data = Array.from(map.values());
        }
      }

      if (error) return [];

      // Filtra estritamente: NÃO permitir dados globais sem inquilino (created_by IS NULL)
      return (data ?? []).filter((row: any) => {
        if (row.tenant_id && row.tenant_id === tenantId) return true;
        if (row.created_by && tenantUserIds.includes(row.created_by)) return true;
        return false;
      });
    }

    // Super admin ou usuário avulso: apenas os que ele mesmo cadastrou
    const { data, error } = await context.supabase
      .from("produto_tipos")
      .select("*")
      .eq("created_by", context.userId)
      .order("midia")
      .order("nome");
    if (error) return [];
    return data ?? [];
  });

export const upsertProdutoTipo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => 
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().min(1).max(100),
      midia: z.enum(["TV", "Radio", "DOOH"]),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    const payload: any = {
      ...data,
      nome: data.nome.trim(),
      created_by: context.userId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };

    let q = data.id
      ? context.supabase.from("produto_tipos").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("produto_tipos").insert(payload).select().single();
    let res = await q;

    // Se tenant_id ainda não estiver na tabela, tenta sem ele
    if (res.error && res.error.message.toLowerCase().includes("tenant_id")) {
      delete payload.tenant_id;
      q = data.id
        ? context.supabase.from("produto_tipos").update(payload).eq("id", data.id).select().single()
        : context.supabase.from("produto_tipos").insert(payload).select().single();
      res = await q;
    }

    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const deleteProdutoTipo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("produto_tipos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ProdutoImportSchema = ProdutoSchema.partial({
  duracao_segundos: true,
  insercoes_padrao: true,
  valor_unit: true,
  ativo: true,
});

export const importProdutosBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ produtos: z.array(ProdutoImportSchema).min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    // Registra novos tipos detectados na planilha para este inquilino
    const uniqueTipos = new Map<string, { nome: string; midia: "TV" | "Radio" | "DOOH" }>();
    for (const p of data.produtos) {
      if (p.tipo && p.tipo.trim() && p.midia) {
        const key = `${p.midia}:${p.tipo.trim().toLowerCase()}`;
        if (!uniqueTipos.has(key)) {
          uniqueTipos.set(key, { nome: p.tipo.trim(), midia: p.midia as any });
        }
      }
    }
    for (const item of uniqueTipos.values()) {
      try {
        const tipoPayload: any = {
          nome: item.nome,
          midia: item.midia,
          created_by: userId,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        };
        const { error } = await supabase.from("produto_tipos").insert(tipoPayload);
        if (error && error.message.toLowerCase().includes("tenant_id")) {
          delete tipoPayload.tenant_id;
          await supabase.from("produto_tipos").insert(tipoPayload);
        }
      } catch {
        // Ignora caso já esteja cadastrado
      }
    }

    const payloads = data.produtos.map(({ id: _id, ...rest }) => ({
      duracao_segundos: 30,
      insercoes_padrao: 1,
      valor_unit: 0,
      ativo: true,
      ...rest,
      fotos: Array.isArray(rest.fotos)
        ? rest.fotos.filter((f: any) => typeof f === "string" && f.trim().length > 0).slice(0, 2)
        : [],
      created_by: userId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      parceiro_id: rest.parceiro_id || null,
      parceiro_cnpj: rest.parceiro_cnpj ? rest.parceiro_cnpj.trim() : null,
      parceiro_nome: rest.parceiro_nome ? rest.parceiro_nome.trim() : null,
      comissao_inquilino_pct: rest.comissao_inquilino_pct !== undefined && rest.comissao_inquilino_pct !== null ? Number(rest.comissao_inquilino_pct) : null,
    }));

    const errors: { nome: string; message: string }[] = [];
    let ok = 0;

    // Helper para inserir uma linha com fallback
    const insertRow = async (row: any) => {
      let r = await supabase.from("produtos").insert(row as never);
      if (r.error && (r.error.message.toLowerCase().includes("parceiro") || r.error.message.toLowerCase().includes("cep") || r.error.message.toLowerCase().includes("comissao") || r.error.message.toLowerCase().includes("foto"))) {
        const rowFallback = { ...row };
        const pId = rowFallback.parceiro_id;
        const pCnpj = rowFallback.parceiro_cnpj;
        const pNome = rowFallback.parceiro_nome;
        const pComissao = rowFallback.comissao_inquilino_pct;
        const pCep = rowFallback.cep;
        const pFotos = rowFallback.fotos;
        delete rowFallback.parceiro_id;
        delete rowFallback.parceiro_cnpj;
        delete rowFallback.parceiro_nome;
        delete rowFallback.comissao_inquilino_pct;
        delete rowFallback.cep;
        delete rowFallback.fotos;

        let metaObj: any = {};
        if (rowFallback.detalhes_venda) {
          try {
            const p = JSON.parse(rowFallback.detalhes_venda);
            if (p && typeof p === "object") metaObj = p;
            else metaObj = { _texto: rowFallback.detalhes_venda };
          } catch {
            metaObj = { _texto: rowFallback.detalhes_venda };
          }
        }
        if (pId) metaObj._parceiro_id = pId;
        metaObj._parceiro = pCnpj ? { cnpj: pCnpj, nome: pNome } : null;
        if (pComissao !== null && pComissao !== undefined) metaObj._comissao_inquilino_pct = pComissao;
        if (pCep) metaObj._cep = pCep;
        if (Array.isArray(pFotos) && pFotos.length > 0) metaObj._fotos = pFotos.slice(0, 2);
        rowFallback.detalhes_venda = JSON.stringify(metaObj);
        r = await supabase.from("produtos").insert(rowFallback as never);
      }
      return r;
    };

    // Insere linha a linha ou em lotes
    for (const row of payloads) {
      const { error } = await insertRow(row);
      if (error) {
        errors.push({ nome: row.nome, message: error.message });
      } else {
        ok++;
      }
    }

    return { ok, fail: errors.length, errors };
  });
