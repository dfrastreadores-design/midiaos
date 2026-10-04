import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TemplatePropostaConfig = {
  id?: string;
  organizacao_id?: string;
  logo_url?: string | null;
  cor_fundo_capa: string;
  cor_destaque_primaria: string;
  cor_destaque_secundaria: string;
  telefone_contato: string;
  email_contato: string;
  instagram_contato: string;
  site_url: string;
  manifesto_titulo: string;
  manifesto_texto: string;
  exibir_overview: boolean;
  exibir_metodologia: boolean;
  exibir_mapa_satelite: boolean;
  incluir_capa: boolean;
  incluir_manifesto: boolean;
  incluir_como_atuamos: boolean;
  incluir_laminas_pontos: boolean;
  fechamento_titulo: string;
  fechamento_subtitulo: string;
  total_populacao_impacto: string;
  total_impactos_mes: string;
  cobertura_pracas: string;
};

export const DEFAULT_NEXO_TEMPLATE_CONFIG: TemplatePropostaConfig = {
  cor_fundo_capa: "#0b0c10",
  cor_destaque_primaria: "#ff6b00", // Laranja Nexo
  cor_destaque_secundaria: "#7928ca", // Roxo/Degradê Nexo
  telefone_contato: "(61) 99125-7245",
  email_contato: "rafaelnexomidia@gmail.com",
  instagram_contato: "nexobrasilmidia",
  site_url: "https://nexomidiaerepresentacao.com.br",
  manifesto_titulo: "O significado de Nexo",
  manifesto_texto:
    "No dicionário, nexo significa conexão, ligação, vínculo entre partes. No mercado de comunicação do Distrito Federal e entorno, a Nexo Mídia e Representação é a ponte estratégica que une marcas, veículos de alto impacto e consumidores em momentos decisivos da sua jornada diária.",
  exibir_overview: true,
  exibir_metodologia: true,
  exibir_mapa_satelite: true,
  incluir_capa: true,
  incluir_manifesto: true,
  incluir_como_atuamos: true,
  incluir_laminas_pontos: true,
  fechamento_titulo: "Vamos criar o próximo nexo?",
  fechamento_subtitulo: "Conectando marcas, veículos e pessoas com inteligência estratégica.",
  total_populacao_impacto: "+5,5 milhões de habitantes",
  total_impactos_mes: "+18,5 milhões de impactos/mês",
  cobertura_pracas: "Distrito Federal + Goiás (Entorno)",
};

export type OrganizacaoInfo = {
  id: string | null;
  nome: string;
  slug: string;
  site_url: string | null;
  logo_url: string | null;
  tagline: string | null;
  termos_proposta: string | null;
  cor_primaria: string;
  isNexo: boolean;
  templateConfig?: TemplatePropostaConfig | null;
};

const DEFAULT_NEUTRAL_ORG: OrganizacaoInfo = {
  id: null,
  nome: "Mídia.OS",
  slug: "midiaos",
  site_url: null,
  logo_url: null,
  tagline: "Sistema Integrado de Inteligência e Gestão Comercial de Mídia 360°",
  termos_proposta: null,
  cor_primaria: "#0f172a",
  isNexo: false,
  templateConfig: null,
};

/** Retorna os dados da organização ativa vinculada ao perfil do utilizador autenticado */
export const getCurrentOrg = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrganizacaoInfo> => {
    try {
      // 1. Obter o perfil do usuário
      const { data: prof, error: profError } = await context.supabase
        .from("profiles")
        .select("id, email, tenant_id, organizacao_id")
        .eq("id", context.userId)
        .maybeSingle();

      if (profError || !prof) {
        return DEFAULT_NEUTRAL_ORG;
      }

      const userEmail = (prof.email || "").toLowerCase();
      let orgData: any = null;

      // 2. Tentar buscar diretamente por organizacao_id se cadastrado
      if (prof.organizacao_id) {
        const { data: o } = await (context.supabase.from("organizacoes") as any)
          .select("id, nome, slug, site_url, logo_url, tagline, termos_proposta, cor_primaria")
          .eq("id", prof.organizacao_id)
          .maybeSingle();
        if (o) orgData = o;
      }

      // 3. Fallback: Se não encontrou por organizacao_id, tentar por tenant_id
      if (!orgData && prof.tenant_id) {
        const { data: o } = await (context.supabase.from("organizacoes") as any)
          .select("id, nome, slug, site_url, logo_url, tagline, termos_proposta, cor_primaria")
          .eq("id", prof.tenant_id)
          .maybeSingle();
        if (o) orgData = o;
      }

      // 4. Reconhecimento automático da Nexo (email institucional ou tenant Nexo)
      if (!orgData && (userEmail.includes("nexo") || userEmail.includes("rafaelnexomidia@gmail.com"))) {
        const { data: nexoOrg } = await (context.supabase.from("organizacoes") as any)
          .select("id, nome, slug, site_url, logo_url, tagline, termos_proposta, cor_primaria")
          .eq("slug", "nexo")
          .maybeSingle();

        if (nexoOrg) {
          orgData = nexoOrg;
          // Auto-vincular organizacao_id no perfil para consistência permanente
          try {
            await context.supabase
              .from("profiles")
              .update({ organizacao_id: nexoOrg.id } as any)
              .eq("id", context.userId);
          } catch {
            /* ignore background auto-sync */
          }
        }
      }

      if (!orgData) {
        return DEFAULT_NEUTRAL_ORG;
      }

      const isNexo = orgData.slug === "nexo" || orgData.nome?.toLowerCase().includes("nexo");

      // Buscar configurações de template da proposta
      let templateConfig: TemplatePropostaConfig | null = null;
      try {
        const { data: tpl } = await (context.supabase.from("template_proposta_config") as any)
          .select("*")
          .eq("organizacao_id", orgData.id)
          .maybeSingle();
        if (tpl) {
          templateConfig = tpl;
        } else if (isNexo) {
          templateConfig = DEFAULT_NEXO_TEMPLATE_CONFIG;
        }
      } catch {
        if (isNexo) templateConfig = DEFAULT_NEXO_TEMPLATE_CONFIG;
      }

      return {
        id: orgData.id,
        nome: orgData.nome || (isNexo ? "NEXO Mídia e Representação" : "Mídia.OS"),
        slug: orgData.slug || (isNexo ? "nexo" : "midiaos"),
        site_url:
          orgData.site_url || (isNexo ? "https://nexomidiaerepresentacao.com.br" : null),
        logo_url: orgData.logo_url || null,
        tagline:
          orgData.tagline ||
          (isNexo
            ? "Hub de Negócios & Soluções Estratégicas em Mídia"
            : "Sistema Integrado de Gestão Comercial e Mídia 360°"),
        termos_proposta:
          orgData.termos_proposta ||
          (isNexo
            ? "A Nexo Mídia e Representação atua como um Hub de Negócios especializado em conectar marcas a oportunidades de alto impacto no Distrito Federal e entorno. Combinamos veículos de mídia consolidados, inteligência geográfica regional e soluções estratégicas personalizadas para garantir máxima lembrança e retorno para o seu investimento."
            : null),
        cor_primaria: orgData.cor_primaria || (isNexo ? "#ff6b00" : "#0f172a"),
        isNexo,
        templateConfig,
      };
    } catch (err) {
      console.warn("Aviso ao obter organização atual:", err);
      return DEFAULT_NEUTRAL_ORG;
    }
  });

/** Busca organização por ID ou slug (usado para renderização pública de propostas) */
export const getOrganizacaoPublica = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), slug: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<OrganizacaoInfo | null> => {
    try {
      let query = (context.supabase.from("organizacoes") as any).select(
        "id, nome, slug, site_url, logo_url, tagline, termos_proposta, cor_primaria",
      );

      if (data.id) {
        query = query.eq("id", data.id);
      } else if (data.slug) {
        query = query.eq("slug", data.slug);
      } else {
        return DEFAULT_NEUTRAL_ORG;
      }

      const { data: o } = await query.maybeSingle();
      if (!o) return DEFAULT_NEUTRAL_ORG;

      const isNexo = o.slug === "nexo";

      let templateConfig: TemplatePropostaConfig | null = null;
      try {
        const { data: tpl } = await (context.supabase.from("template_proposta_config") as any)
          .select("*")
          .eq("organizacao_id", o.id)
          .maybeSingle();
        if (tpl) {
          templateConfig = tpl;
        } else if (isNexo) {
          templateConfig = DEFAULT_NEXO_TEMPLATE_CONFIG;
        }
      } catch {
        if (isNexo) templateConfig = DEFAULT_NEXO_TEMPLATE_CONFIG;
      }

      return {
        id: o.id,
        nome: o.nome,
        slug: o.slug,
        site_url: o.site_url,
        logo_url: o.logo_url,
        tagline: o.tagline,
        termos_proposta: o.termos_proposta,
        cor_primaria: o.cor_primaria || (isNexo ? "#ff6b00" : "#0f172a"),
        isNexo,
        templateConfig,
      };
    } catch {
      return DEFAULT_NEUTRAL_ORG;
    }
  });

/** Atualiza ou cria configurações de template de proposta para a organização */
export const upsertTemplatePropostaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        organizacao_id: z.string().uuid(),
        logo_url: z.string().nullable().optional(),
        cor_fundo_capa: z.string().optional(),
        cor_destaque_primaria: z.string().optional(),
        cor_destaque_secundaria: z.string().optional(),
        telefone_contato: z.string().optional(),
        email_contato: z.string().optional(),
        instagram_contato: z.string().optional(),
        site_url: z.string().optional(),
        manifesto_titulo: z.string().optional(),
        manifesto_texto: z.string().optional(),
        exibir_overview: z.boolean().optional(),
        exibir_metodologia: z.boolean().optional(),
        exibir_mapa_satelite: z.boolean().optional(),
        incluir_capa: z.boolean().optional(),
        incluir_manifesto: z.boolean().optional(),
        incluir_como_atuamos: z.boolean().optional(),
        incluir_laminas_pontos: z.boolean().optional(),
        fechamento_titulo: z.string().optional(),
        fechamento_subtitulo: z.string().optional(),
        total_populacao_impacto: z.string().optional(),
        total_impactos_mes: z.string().optional(),
        cobertura_pracas: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("template_proposta_config") as any).upsert(
      {
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organizacao_id" },
    );
    if (error) throw new Error(error.message);
    return { success: true };
  });
