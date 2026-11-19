import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PublicAsset, CategoriaMidiaSlug, StatusDisponibilidade } from "@/types/public-inventory.types";

function detectarCategoriaSlug(nome: string, tipo: string, midia: string): CategoriaMidiaSlug {
  const texto = `${nome} ${tipo} ${midia}`.toLowerCase();
  if (texto.includes("led") || texto.includes("dooh") || texto.includes("digital de rua") || texto.includes("painel digital")) {
    return "dooh";
  }
  if (texto.includes("frontlight") || texto.includes("empena") || texto.includes("mega painel")) {
    return "ooh";
  }
  if (texto.includes("outdoor") || texto.includes("rodovia") || texto.includes("rodoviário") || texto.includes("painel rodoviario")) {
    return "rodoviario";
  }
  if (texto.includes("totem") || texto.includes("abrigo") || texto.includes("mobiliário") || texto.includes("relogio") || texto.includes("parada")) {
    return "urbano";
  }
  if (texto.includes("indoor") || texto.includes("elevador") || texto.includes("aeroporto") || texto.includes("shopping")) {
    return "digital";
  }
  return "ooh";
}

function validarCoordenadas(lat: any, lng: any): { lat: number | null; lng: number | null } {
  if (lat == null || lng == null) return { lat: null, lng: null };
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!isFinite(nLat) || !isFinite(nLng) || isNaN(nLat) || isNaN(nLng)) {
    return { lat: null, lng: null };
  }
  // Coordenadas válidas no globo e plausíveis no Brasil / América Latina
  if (nLat < -35 || nLat > 6 || nLng < -75 || nLng > -30) {
    // Se estiver fora do Brasil (ex: 0,0 do oceano Atlântico), pode ser coordenada global genérica
    if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180 || (nLat === 0 && nLng === 0)) {
      return { lat: null, lng: null };
    }
  }
  return {
    lat: Number(nLat.toFixed(7)),
    lng: Number(nLng.toFixed(7)),
  };
}

function extrairFotosUrls(rawFotos: any, rawDetalhes: any, fallbackImagemUrl?: string | null): string[] {
  const urls: string[] = [];
  if (Array.isArray(rawFotos)) {
    for (const f of rawFotos) {
      if (typeof f === "string" && f.trim().startsWith("http")) {
        urls.push(f.trim());
      }
    }
  } else if (typeof rawFotos === "string" && rawFotos.trim().startsWith("http")) {
    urls.push(rawFotos.trim());
  }

  if (rawDetalhes && typeof rawDetalhes === "object") {
    if (Array.isArray(rawDetalhes._fotos)) {
      for (const f of rawDetalhes._fotos) {
        if (typeof f === "string" && f.trim().startsWith("http") && !urls.includes(f.trim())) {
          urls.push(f.trim());
        }
      }
    }
  }

  if (fallbackImagemUrl && fallbackImagemUrl.trim().startsWith("http") && !urls.includes(fallbackImagemUrl.trim())) {
    urls.push(fallbackImagemUrl.trim());
  }

  return urls.slice(0, 4);
}

/**
 * Consulta pública de ativos de inventário para visualização split-screen (Flux OOH).
 * REGRA INVIOLÁVEL DE WHITE-LABEL: Nunca expõe parceiro_id, parceiro_nome ou qualquer menção ao proprietário.
 */
export const listPublicInventoryAssets = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        cidade: z.string().optional(),
        tipo_midia: z.string().optional(),
        status: z.string().optional(),
        busca: z.string().optional(),
      })
      .optional()
      .parse(d || {}),
  )
  .handler(async ({ data: filters }) => {
    try {
      // 1. Busca produtos físicos de mídia da tabela public.produtos
      const { data: produtosRows, error: produtosError } = await supabaseAdmin
        .from("produtos")
        .select(
          "id, nome, tipo, midia, formato, formato_ooh, formato_tela, resolucao, dimensao_largura, dimensao_altura, endereco_ponto, latitude, longitude, fotos, valor_unit, ativo, link_maps, sentido_via, ponto_referencia, detalhes_venda, updated_at",
        )
        .eq("ativo", true)
        .order("updated_at", { ascending: false });

      if (produtosError) {
        console.warn("[listPublicInventoryAssets] Erro ao consultar produtos:", produtosError.message);
      }

      // 2. Busca também itens cadastrados no catálogo de serviços de mídia (se houver)
      const { data: catalogRows, error: catalogError } = await (supabaseAdmin.from("media_services_catalog") as any)
        .select(
          "id, nome_produto, categoria_midia, tipo_cobranca, valor_tabela, endereco, bairro, cidade, estado, latitude, longitude, fotos, imagem_url, especificacoes_tecnicas, ativo, updated_at",
        )
        .eq("ativo", true);

      if (catalogError) {
        console.warn("[listPublicInventoryAssets] Aviso ao consultar media_services_catalog:", catalogError.message);
      }

      const assets: PublicAsset[] = [];
      const seenIds = new Set<string>();

      // Normaliza produtos
      for (const p of produtosRows || []) {
        if (seenIds.has(p.id)) continue;
        seenIds.add(p.id);

        let detalhesObj: Record<string, any> = {};
        if (typeof p.detalhes_venda === "string") {
          try {
            detalhesObj = JSON.parse(p.detalhes_venda);
          } catch {}
        } else if (p.detalhes_venda && typeof p.detalhes_venda === "object") {
          detalhesObj = p.detalhes_venda;
        }

        const geo = validarCoordenadas(p.latitude, p.longitude);
        const tipoMidiaStr = p.tipo || p.midia || "Painel OOH";
        const categoriaSlug = detectarCategoriaSlug(p.nome, tipoMidiaStr, p.midia || "");

        // Extrai código do ativo elegante (ex: OOH-DF-014 ou código personalizado)
        const codigo =
          detalhesObj._codigo_ativo ||
          detalhesObj.codigo_ponto ||
          `DF-${categoriaSlug.toUpperCase()}-${p.id.substring(0, 4).toUpperCase()}`;

        // Localização estruturada
        const enderecoCompleto = p.endereco_ponto || detalhesObj._endereco || "Brasília - DF";
        const partesEndereco = enderecoCompleto.split(",");
        const cidadeExtraida = detalhesObj._cidade || (partesEndereco.length > 1 ? partesEndereco[partesEndereco.length - 1].trim().split("-")[0].trim() : "Brasília");
        const bairroExtraido = detalhesObj._bairro || (partesEndereco.length > 1 ? partesEndereco[0].trim() : "Distrito Federal");
        const ufExtraida = detalhesObj._uf || "DF";

        const fotosUrls = extrairFotosUrls(p.fotos, detalhesObj);

        // Status de disponibilidade
        let statusDisp: StatusDisponibilidade = "Disponível";
        if (detalhesObj._status_disponibilidade) {
          statusDisp = detalhesObj._status_disponibilidade as StatusDisponibilidade;
        }

        // Dimensões físicas
        let dimensoesStr: string | null = null;
        if (p.resolucao) dimensoesStr = p.resolucao;
        else if (p.formato_tela) dimensoesStr = p.formato_tela;
        else if (detalhesObj._dimensoes) dimensoesStr = detalhesObj._dimensoes;
        else if (detalhesObj.formato) dimensoesStr = detalhesObj.formato;

        assets.push({
          id: p.id,
          codigo_ativo: String(codigo),
          nome_ponto: String(p.nome),
          tipo_midia: String(tipoMidiaStr),
          categoria_slug: categoriaSlug,
          formato: String(p.formato || p.formato_ooh || "Bi-Semana"),
          dimensoes: dimensoesStr,
          cidade: String(cidadeExtraida || "Brasília"),
          bairro: bairroExtraido || null,
          uf: String(ufExtraida || "DF"),
          endereco: enderecoCompleto,
          latitude: geo.lat,
          longitude: geo.lng,
          fotos_urls: fotosUrls,
          status_disponibilidade: statusDisp,
          valor_tabela: p.valor_unit != null ? Number(p.valor_unit) : null,
          impactos_estimados: detalhesObj._impactos_dia != null ? Number(detalhesObj._impactos_dia) : null,
          fluxo_diario: detalhesObj._fluxo_veiculos_dia != null ? Number(detalhesObj._fluxo_veiculos_dia) : null,
          link_maps: p.link_maps || null,
          sentido_via: p.sentido_via || detalhesObj._sentido_fluxo || null,
          ponto_referencia: p.ponto_referencia || detalhesObj._ponto_referencia || null,
          ativo: true,
          updated_at: p.updated_at,
        });
      }

      // Normaliza itens de media_services_catalog
      for (const item of catalogRows || []) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        const geo = validarCoordenadas(item.latitude, item.longitude);
        const categoriaSlug = detectarCategoriaSlug(item.nome_produto, item.categoria_midia || "", "");
        const codigo = `CAT-${categoriaSlug.toUpperCase()}-${item.id.substring(0, 4).toUpperCase()}`;

        const fotosUrls = extrairFotosUrls(item.fotos, item.especificacoes_tecnicas, item.imagem_url);

        assets.push({
          id: item.id,
          codigo_ativo: codigo,
          nome_ponto: item.nome_produto,
          tipo_midia: item.categoria_midia || "Espaço OOH",
          categoria_slug: categoriaSlug,
          formato: item.tipo_cobranca || "Tabela",
          dimensoes: item.especificacoes_tecnicas?.dimensoes_metros_pixels || item.especificacoes_tecnicas?.resolucao || null,
          cidade: item.cidade || "Brasília",
          bairro: item.bairro || null,
          uf: item.estado || "DF",
          endereco: item.endereco || `${item.cidade || "Brasília"} - ${item.estado || "DF"}`,
          latitude: geo.lat,
          longitude: geo.lng,
          fotos_urls: fotosUrls,
          status_disponibilidade: "Disponível",
          valor_tabela: item.valor_tabela != null ? Number(item.valor_tabela) : null,
          impactos_estimados: item.impactos_estimados_mes != null ? Number(item.impactos_estimados_mes) : null,
          fluxo_diario: null,
          link_maps: null,
          sentido_via: null,
          ponto_referencia: null,
          ativo: true,
          updated_at: item.updated_at,
        });
      }

      // Filtros aplicados no backend
      let filtered = assets;

      if (filters?.busca && filters.busca.trim()) {
        const q = filters.busca.trim().toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.nome_ponto.toLowerCase().includes(q) ||
            a.codigo_ativo.toLowerCase().includes(q) ||
            (a.endereco && a.endereco.toLowerCase().includes(q)) ||
            (a.bairro && a.bairro.toLowerCase().includes(q)) ||
            a.cidade.toLowerCase().includes(q),
        );
      }

      if (filters?.cidade && filters.cidade !== "todas") {
        filtered = filtered.filter((a) => a.cidade.toLowerCase() === filters.cidade!.toLowerCase());
      }

      if (filters?.tipo_midia && filters.tipo_midia !== "todas") {
        filtered = filtered.filter(
          (a) =>
            a.tipo_midia.toLowerCase().includes(filters.tipo_midia!.toLowerCase()) ||
            a.categoria_slug === filters.tipo_midia,
        );
      }

      if (filters?.status && filters.status !== "todos") {
        filtered = filtered.filter((a) => a.status_disponibilidade === filters.status);
      }

      return filtered;
    } catch (err: any) {
      console.error("[listPublicInventoryAssets] Erro fatal:", err);
      return [];
    }
  });
