import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { traduzirErro } from "./error-translator";
import {
  gerarImagemComercial,
  type TenantBrandingConfig,
} from "./imagem-comercial.service";

const TenantBrandingSchema = z.object({
  id: z.string().uuid().optional(),
  nome_comercial: z.string().min(1, "Nome comercial é obrigatório").max(200),
  logo: z.string().max(2000).optional().nullable(),
  marca_dagua: z.string().max(200).optional().nullable(),
  posicao_marca_dagua: z
    .enum(["bottom-right", "bottom-left", "center", "top-right"])
    .default("bottom-right"),
  opacidade_marca_dagua: z.number().min(0.05).max(1.0).default(0.65),
  remover_identificacao_fornecedor: z.boolean().default(true),
});

/**
 * Obter configuração de Tenant Branding do inquilino logado
 */
export const obterTenantBranding = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      let brandingData: TenantBrandingConfig | null = null;

      if (tenantId) {
        const { data, error } = await (supabaseAdmin as any)
          .from("tenant_branding")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (!error && data) {
          brandingData = data;
        }
      }

      // Se não encontrou na tabela tenant_branding, busca dados no cadastro do tenant
      if (!brandingData && tenantId) {
        const { data: tenant } = await (supabaseAdmin as any)
          .from("tenants")
          .select("nome_fantasia, razao_social, logo_url")
          .eq("id", tenantId)
          .maybeSingle();

        if (tenant) {
          brandingData = {
            tenant_id: tenantId,
            nome_comercial: tenant.nome_fantasia || tenant.razao_social || "Mídia.OS",
            logo: tenant.logo_url || null,
            marca_dagua: tenant.nome_fantasia || "Exibição Comercial Homologada",
            posicao_marca_dagua: "bottom-right",
            opacidade_marca_dagua: 0.65,
            remover_identificacao_fornecedor: true,
          };
        }
      }

      return (
        brandingData || {
          nome_comercial: "Mídia.OS Publicidade",
          logo: null,
          marca_dagua: "Exibição Comercial Homologada",
          posicao_marca_dagua: "bottom-right",
          opacidade_marca_dagua: 0.65,
          remover_identificacao_fornecedor: true,
        }
      );
    } catch (err: any) {
      console.error("[obterTenantBranding] Erro:", err);
      return {
        nome_comercial: "Mídia.OS Publicidade",
        logo: null,
        marca_dagua: "Exibição Comercial Homologada",
        posicao_marca_dagua: "bottom-right",
        opacidade_marca_dagua: 0.65,
        remover_identificacao_fornecedor: true,
      };
    }
  });

/**
 * Salvar configurações de Tenant Branding
 */
export const salvarTenantBranding = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof TenantBrandingSchema>) => TenantBrandingSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      const payload: Record<string, any> = {
        tenant_id: tenantId,
        nome_comercial: data.nome_comercial.trim(),
        logo: data.logo?.trim() || null,
        marca_dagua: data.marca_dagua?.trim() || null,
        posicao_marca_dagua: data.posicao_marca_dagua,
        opacidade_marca_dagua: data.opacidade_marca_dagua,
        remover_identificacao_fornecedor: data.remover_identificacao_fornecedor,
        updated_at: new Date().toISOString(),
      };

      if (data.id) {
        payload.id = data.id;
      }

      const { data: saved, error } = await (supabaseAdmin as any)
        .from("tenant_branding")
        .upsert(payload, { onConflict: "tenant_id" })
        .select()
        .single();

      if (error) {
        console.error("[salvarTenantBranding] Erro:", error.message);
        throw new Error(`Falha ao salvar identidade visual comercial: ${error.message}`);
      }

      return {
        success: true,
        branding: saved as TenantBrandingConfig,
      };
    } catch (err: any) {
      console.error("[salvarTenantBranding] Falha:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Processar imagem de produto aplicando identidade visual comercial do inquilino
 */
export const processarImagemProdutoComBranding = createServerFn({ method: "POST" })
  .validator((d: { produto_id?: string; imagem_original: string }) => d)
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      // 1. Obter branding do tenant
      let branding: TenantBrandingConfig = {
        nome_comercial: "Mídia.OS Publicidade",
        logo: null,
        marca_dagua: "Exibição Comercial Homologada",
        posicao_marca_dagua: "bottom-right",
        opacidade_marca_dagua: 0.65,
        remover_identificacao_fornecedor: true,
      };

      if (tenantId) {
        const { data: tb } = await (supabaseAdmin as any)
          .from("tenant_branding")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (tb) {
          branding = tb;
        } else {
          const { data: t } = await (supabaseAdmin as any)
            .from("tenants")
            .select("nome_fantasia, razao_social, logo_url")
            .eq("id", tenantId)
            .maybeSingle();

          if (t) {
            branding.nome_comercial = t.nome_fantasia || t.razao_social || branding.nome_comercial;
            branding.logo = t.logo_url || null;
            branding.marca_dagua = t.nome_fantasia || branding.marca_dagua;
          }
        }
      }

      // 2. Processar imagem gerando a versão comercial blindada
      const resultado = gerarImagemComercial({
        imagem_original: data.imagem_original,
        branding,
      });

      // 3. Se um produto_id foi fornecido, salvar na base
      if (data.produto_id) {
        await (supabaseAdmin as any)
          .from("produtos")
          .update({
            imagem_original: resultado.imagem_original,
            imagem_comercial: resultado.imagem_comercial,
            branding_aplicado: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.produto_id);
      }

      return {
        success: true,
        imagem_original: resultado.imagem_original,
        imagem_comercial: resultado.imagem_comercial,
        branding_aplicado: true,
      };
    } catch (err: any) {
      console.error("[processarImagemProdutoComBranding] Erro:", err);
      throw new Error(traduzirErro(err));
    }
  });
