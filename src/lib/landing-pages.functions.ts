import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type LandingProductItem = {
  produto_id?: string;
  nome: string;
  categoria?: string;
  descricao?: string;
  imagem_url?: string;
  endereco?: string;
  cta_label?: string;
};

export type LandingSection =
  | { type: "hero"; title: string; subtitle?: string; ctaLabel?: string; ctaAnchor?: string; imageUrl?: string }
  | { type: "features"; title?: string; items: { title: string; description?: string; icon?: string }[] }
  | { type: "stats"; items: { value: string; label: string }[] }
  | { type: "testimonials"; items: { quote: string; author: string; role?: string }[] }
  | { type: "rich_text"; content: string }
  | { type: "cta"; title: string; description?: string; buttonLabel: string; buttonAnchor?: string }
  | {
      type: "products";
      title?: string;
      description?: string;
      ctaLabel?: string;
      items: LandingProductItem[];
    }
  | {
      type: "form";
      id?: string;
      title?: string;
      description?: string;
      fields: { key: "nome" | "email" | "telefone" | "empresa" | "mensagem"; label: string; required?: boolean }[];
      submitLabel?: string;
      successMessage?: string;
    };

export type LandingPage = {
  id: string;
  tenant_id: string;
  slug: string;
  titulo: string;
  status: "rascunho" | "publicada" | "arquivada";
  sections: LandingSection[];
  template: "modern" | "minimal" | "bold" | "elegant";
  cor_primaria: string | null;
  cor_texto: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_og_image: string | null;
  executivo_id: string | null;
  views_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const SectionSchema: z.ZodType<LandingSection> = z.any();

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hifens"),
  titulo: z.string().min(1).max(200),
  status: z.enum(["rascunho", "publicada", "arquivada"]).default("rascunho"),
  sections: z.array(SectionSchema).default([]),
  template: z.enum(["modern", "minimal", "bold", "elegant"]).default("modern"),
  cor_primaria: z.string().nullable().optional(),
  cor_texto: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  hero_image_url: z.string().nullable().optional(),
  meta_title: z.string().max(200).nullable().optional(),
  meta_description: z.string().max(300).nullable().optional(),
  meta_og_image: z.string().nullable().optional(),
  executivo_id: z.string().uuid().nullable().optional(),
});

export const listLandingPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: pages, error }, { data: leadCounts }] = await Promise.all([
      supabase.from("landing_pages").select("*").order("updated_at", { ascending: false }),
      supabase.from("landing_page_leads").select("landing_page_id"),
    ]);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    (leadCounts ?? []).forEach((l: any) => counts.set(l.landing_page_id, (counts.get(l.landing_page_id) ?? 0) + 1));
    return (pages ?? []).map((p: any) => ({ ...(p as LandingPage), leads_count: counts.get(p.id) ?? 0 }));
  });

export const getLandingPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase
      .from("landing_pages")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return page as unknown as LandingPage | null;
  });

const RESERVED_SLUGS = new Set([
  "agencias","api","aprovar-diretoria","assinar","briefings","calendario","clientes","comissoes",
  "configuracoes","crm","documentacao","email","financeiro","historico","historico-veiculacao",
  "influenciadores","landing-pages","layouts","lixeira","login","lovable","lp","materiais-apoio",
  "metas","minha-conta","monitoramento","owner","permuta","pi","pi-anexos","pos-venda","produtos",
  "projetos-especiais","propostas","relatorio-sincronizacao","relatorios","site","sitemap.xml",
  "tarefas","usuarios","veiculos","auth","admin","favicon.ico","robots.txt","assets","public",
]);

export const upsertLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (RESERVED_SLUGS.has(data.slug)) {
      throw new Error(`Slug "${data.slug}" é reservado pelo sistema. Escolha outro.`);
    }
    const payload: any = { ...data };
    if (data.status === "publicada") payload.published_at = new Date().toISOString();
    let res;
    if (data.id) {
      res = await supabase.from("landing_pages").update(payload).eq("id", data.id).select().maybeSingle();
    } else {
      // se slug existe, sufixa
      let slug = data.slug;
      const { data: exists } = await supabase.from("landing_pages").select("id").eq("slug", slug).maybeSingle();
      if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      payload.slug = slug;
      res = await supabase.from("landing_pages").insert(payload).select().maybeSingle();
    }
    if (res.error) throw new Error(res.error.message);
    return res.data as unknown as LandingPage;
  });

export const deleteLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("landing_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { landingPageId?: string }) => z.object({ landingPageId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("landing_page_leads").select("*").order("created_at", { ascending: false });
    if (data.landingPageId) q = q.eq("landing_page_id", data.landingPageId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Gera uma landing page a partir do cadastro de um cliente: usa a logo do cliente
// e os produtos cadastrados no tenant, exibidos em formato de vitrine (e-commerce)
// com o botão "Consultar disponibilidade" (sem exibir preço).
export const generateLandingFromCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clienteId: string; slug?: string; template?: LandingPage["template"] }) =>
    z
      .object({
        clienteId: z.string().uuid(),
        slug: z.string().min(3).max(80).optional(),
        template: z.enum(["modern", "minimal", "bold", "elegant"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cliente, error: cErr } = await supabase
      .from("clientes")
      .select("id, razao_social, nome_fantasia, logo_url, segmento, cidade, uf, website, endereco")
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { data: produtos, error: pErr } = await supabase
      .from("produtos")
      .select("id, nome, tipo, midia, tipo_midia, formato, endereco_ponto, observacao, programa")
      .eq("ativo", true)
      .order("nome");
    if (pErr) throw new Error(pErr.message);

    const nomeExibicao = cliente.nome_fantasia || cliente.razao_social;
    const items: LandingProductItem[] = (produtos ?? []).map((p: any) => ({
      produto_id: p.id,
      nome: p.nome,
      categoria: p.formato || p.tipo_midia || p.midia || p.tipo || undefined,
      descricao: p.observacao || p.programa || undefined,
      endereco: p.endereco_ponto || undefined,
      cta_label: "Consultar disponibilidade",
    }));

    const baseSlug =
      data.slug ||
      (nomeExibicao || "cliente")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 60) || "cliente";

    if (RESERVED_SLUGS.has(baseSlug)) {
      throw new Error(`Slug "${baseSlug}" é reservado. Informe outro.`);
    }
    let slug = baseSlug;
    const { data: exists } = await supabase.from("landing_pages").select("id").eq("slug", slug).maybeSingle();
    if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const localizacao = [cliente.cidade, cliente.uf].filter(Boolean).join("/");
    const sections: LandingSection[] = [
      {
        type: "hero",
        title: nomeExibicao,
        subtitle: cliente.segmento
          ? `${cliente.segmento}${localizacao ? ` • ${localizacao}` : ""}`
          : localizacao || "Soluções em mídia sob medida",
        ctaLabel: "Ver produtos",
        ctaAnchor: "#produtos",
      },
      {
        type: "products",
        title: "Vitrine de produtos",
        description: "Escolha um produto e clique em consultar disponibilidade — retornaremos com valores personalizados.",
        ctaLabel: "Consultar disponibilidade",
        items,
      },
      {
        type: "form",
        title: "Consultar disponibilidade",
        description: "Deixe seus dados e retornamos com condições e valores.",
        submitLabel: "Solicitar contato",
        fields: [
          { key: "nome", label: "Nome", required: true },
          { key: "email", label: "E-mail", required: true },
          { key: "telefone", label: "Telefone / WhatsApp" },
          { key: "empresa", label: "Empresa" },
          { key: "mensagem", label: "Produtos de interesse / mensagem" },
        ],
      },
    ];

    const payload: any = {
      titulo: nomeExibicao,
      slug,
      status: "rascunho",
      sections,
      template: data.template ?? "modern",
      logo_url: cliente.logo_url ?? null,
      meta_title: `${nomeExibicao} — Vitrine de produtos`,
      meta_description: `Consulte disponibilidade dos produtos de ${nomeExibicao}.`,
    };
    const { data: page, error } = await supabase.from("landing_pages").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return page as unknown as LandingPage;
  });

export const convertLeadToCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadId: string }) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lead, error: lErr } = await supabase
      .from("landing_page_leads")
      .select("*, landing_pages!inner(slug, executivo_id)")
      .eq("id", data.leadId)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!lead) throw new Error("Lead não encontrado");
    if (lead.cliente_id) return { cliente_id: lead.cliente_id, alreadyConverted: true };

    const contatos = [
      { nome: lead.nome, email: lead.email ?? "", telefone: lead.telefone ?? "", cargo: lead.empresa ?? "", whatsapp: lead.telefone ?? "", ativo: true },
    ];
    const executivoId = (lead as any).landing_pages?.executivo_id ?? null;
    const { data: cliente, error: cErr } = await supabase
      .from("clientes")
      .insert({
        razao_social: lead.empresa || lead.nome,
        nome_fantasia: lead.empresa || lead.nome,
        contatos,
        observacao: `Lead da landing /lp/${(lead as any).landing_pages?.slug ?? ""}\n${lead.mensagem ?? ""}`,
        executivo_id: executivoId,
        status: "ativo",
      })
      .select()
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);

    await supabase
      .from("landing_page_leads")
      .update({ cliente_id: cliente!.id, converted_at: new Date().toISOString(), status: "convertido" })
      .eq("id", data.leadId);

    return { cliente_id: cliente!.id, alreadyConverted: false };
  });

// ============================================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================================
function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getPublicLandingPageBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supa = publicClient();
    const { data: page, error } = await supa
      .from("landing_pages")
      .select(
        "id, tenant_id, slug, titulo, status, sections, template, cor_primaria, cor_texto, logo_url, hero_image_url, meta_title, meta_description, meta_og_image",
      )
      .eq("slug", data.slug)
      .eq("status", "publicada")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!page) return null;
    // incrementa view (best-effort)
    await supa.rpc("landing_page_increment_view", { _slug: data.slug });
    return page as unknown as LandingPage;
  });

const SubmitLeadSchema = z.object({
  slug: z.string().min(1).max(100),
  nome: z.string().min(1).max(150),
  email: z.string().email().max(200).optional().or(z.literal("")),
  telefone: z.string().max(40).optional().or(z.literal("")),
  empresa: z.string().max(200).optional().or(z.literal("")),
  mensagem: z.string().max(1000).optional().or(z.literal("")),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitLeadSchema.parse(d))
  .handler(async ({ data }) => {
    const supa = publicClient();
    const { data: page, error: pErr } = await supa
      .from("landing_pages")
      .select("id, tenant_id, slug, titulo, executivo_id, status")
      .eq("slug", data.slug)
      .eq("status", "publicada")
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!page) throw new Error("Landing page não encontrada");

    const { data: lead, error: lErr } = await supa
      .from("landing_page_leads")
      .insert({
        landing_page_id: page.id,
        tenant_id: page.tenant_id,
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        empresa: data.empresa || null,
        mensagem: data.mensagem || null,
        utm_source: data.utm_source ?? null,
        utm_medium: data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        origem: `landing:${data.slug}`,
      })
      .select()
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);

    // Notifica executivo (best-effort, via admin client — sem PII sensível)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const executivoId =
        (page as any).executivo_id ??
        (
          await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("tenant_id", page.tenant_id)
            .limit(1)
            .maybeSingle()
        ).data?.id;
      if (executivoId) {
        await supabaseAdmin.from("notificacoes").insert({
          user_id: executivoId,
          tenant_id: page.tenant_id,
          tipo: "outro",
          titulo: `Novo lead — ${page.titulo}`,
          mensagem: `${data.nome} preencheu o formulário da landing /lp/${data.slug}.${
            data.email ? ` E-mail: ${data.email}.` : ""
          }${data.telefone ? ` Tel: ${data.telefone}.` : ""}`,
          link: `/landing-pages`,
          metadata: { landing_page_id: page.id, lead_id: lead!.id },
        });
      }
    } catch (e) {
      console.warn("[submitLead] notificação falhou:", e);
    }

    return { ok: true };
  });
