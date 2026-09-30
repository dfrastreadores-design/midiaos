import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SlideTemplateItem = {
  id: string;
  index: number;
  imageUrl: string;
  tipo: "capa" | "conteudo" | "tabela_produtos" | "estrategia" | "final";
  titulo?: string;
};

export type MapeamentoTemplateConfig = {
  slideCapaIndex: number;
  slideProdutosIndex: number;
  slideEstrategiaIndex?: number | null;
  slideFinalIndex?: number | null;
  tabela: {
    margemSuperiorPct: number;
    margemInferiorPct: number;
    margemEsquerdaPct: number;
    margemDireitaPct: number;
    itensPorSlide: number;
    corHeader: string;
    corTextoHeader: string;
    corTexto: string;
    corLinhaDestaque: string;
    mostrarColunas?: {
      tipo?: boolean;
      programa?: boolean;
      horario?: boolean;
      formato?: boolean;
      modelo?: boolean;
      insercoesDia?: boolean;
      totalInsercoes?: boolean;
      valorUnitario?: boolean;
      valorTabela?: boolean;
      desconto?: boolean;
      valorNegociado?: boolean;
    };
  };
  capa: {
    mostrarLogoCliente: boolean;
    mostrarNomeCliente: boolean;
    mostrarCampanha: boolean;
    mostrarNumeroProposta: boolean;
    mostrarData: boolean;
    posicaoVertical: "topo" | "centro" | "inferior" | "custom";
    posicaoHorizontal: "esquerda" | "centro" | "direita" | "custom";
    corTexto: string;
  };
};

export type ProposalLayoutRow = {
  id: string;
  name: string;
  config: any;
  slides?: SlideTemplateItem[];
  mapeamento?: MapeamentoTemplateConfig;
  is_default: boolean;
  tenant_id?: string | null;
  created_at: string;
  created_by?: string | null;
};

export const listProposalLayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    try {
      let query = context.supabase
        .from("proposta_layouts")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback gracioso
        console.warn("listProposalLayouts:", error.message);
        return [];
      }
      return (data ?? []) as ProposalLayoutRow[];
    } catch {
      return [];
    }
  });

export const upsertProposalLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1, "Informe o nome do modelo de proposta"),
        config: z.any(),
        slides: z.array(z.any()).optional(),
        mapeamento: z.any().optional(),
        is_default: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id ?? null;

    // Se configurado como padrão, desmarca layouts anteriores do mesmo inquilino
    if (rest.is_default) {
      try {
        let qClear: any = supabase.from("proposta_layouts").update({ is_default: false } as never);
        if (tenantId) qClear = qClear.eq("tenant_id", tenantId);
        if (id) qClear = qClear.neq("id", id);
        await qClear;
      } catch (e) {
        console.warn("Aviso ao desmarcar layout default:", e);
      }
    }

    const payload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };

    if (id) {
      const { error } = await supabase
        .from("proposta_layouts")
        .update(payload as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }

    const { data: created, error } = await supabase
      .from("proposta_layouts")
      .insert({ ...payload, created_by: userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteProposalLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("proposta_layouts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
