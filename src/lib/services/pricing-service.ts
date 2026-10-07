import { findPrice } from "@/lib/price-table";

export type PricingItemInput = {
  tipo: string;
  programa: string;
  formato: string;
};

export type ProductDatabaseItem = {
  id: string;
  nome?: string;
  tipo: string;
  programa: string;
  formato: string;
  valor_unit: number;
  faixa?: string;
  insercoes_padrao?: number;
  link_modelo?: string;
  ativo: boolean;
  parceiro_id?: string | null;
  parceiro_nome?: string | null;
  parceiro_cnpj?: string | null;
  comissao_inquilino_pct?: number | null;
  canal_macro?: "OFF" | "ON" | "HIBRIDO" | string | null;
  plataforma_rede?: string | null;
  metricas_digitais?: Record<string, any> | null;
  latitude?: number | null;
  longitude?: number | null;
  link_maps?: string | null;
  sentido_via?: string | null;
  sentido_fluxo?: string | null;
  ponto_referencia?: string | null;
  endereco_ponto?: string | null;
  detalhes_venda?: string | null;
  fotos?: string[] | null;
  [key: string]: any;
};

export function findDatabaseProduct(item: PricingItemInput, products: ProductDatabaseItem[]) {
  const normalize = (s: string) => (s || "").trim().toLowerCase();
  const tipoNorm = normalize(item.tipo);
  const progNorm = normalize(item.programa);
  const formNorm = normalize(item.formato);

  return products.find((p) => {
    if (p?.ativo === false) return false;

    const pTipo = normalize(p.tipo);
    const pProg = normalize(p.programa);
    const pNome = normalize(p.nome);
    const pForm = normalize(p.formato);

    const matchTipo = !tipoNorm || pTipo === tipoNorm;
    const matchProg = pProg === progNorm || (pNome && pNome === progNorm);
    const matchForm = !pForm || !formNorm || pForm === formNorm;

    return matchTipo && matchProg && matchForm;
  });
}

export function calculateUnitPrice(
  item: PricingItemInput,
  products: ProductDatabaseItem[],
  manualOverride?: number | null,
) {
  if (manualOverride != null && Number.isFinite(manualOverride)) {
    return Math.max(0, manualOverride);
  }

  const dbProduct = findDatabaseProduct(item, products);
  if (dbProduct && Number.isFinite(dbProduct.valor_unit) && dbProduct.valor_unit > 0) {
    return dbProduct.valor_unit;
  }

  const tableRow =
    item.programa && item.formato
      ? findPrice(item.tipo as any, item.programa, item.formato)
      : undefined;
  return tableRow?.valorUnit ?? 0;
}

export function getItemTotals(
  totalInsercoes: number,
  unitPrice: number,
  descontoPct: number,
  negociadoOverride?: number | null,
) {
  const valorTabela = Math.round(unitPrice * totalInsercoes * 100) / 100;
  let valorNegociado: number;
  let descontoVal: number;
  let currentDescontoPct: number;

  if (negociadoOverride != null && Number.isFinite(negociadoOverride)) {
    valorNegociado = Math.round(Math.max(0, Math.min(negociadoOverride, valorTabela)) * 100) / 100;
    descontoVal = Math.round((valorTabela - valorNegociado) * 100) / 100;
    currentDescontoPct =
      valorTabela > 0 ? Math.round((descontoVal / valorTabela) * 10000) / 100 : 0;
  } else {
    currentDescontoPct = Math.min(100, Math.max(0, descontoPct || 0));
    descontoVal = Math.round(valorTabela * (currentDescontoPct / 100) * 100) / 100;
    valorNegociado = Math.round((valorTabela - descontoVal) * 100) / 100;
  }

  return {
    valorTabela,
    valorNegociado,
    descontoVal,
    descontoPct: currentDescontoPct,
  };
}
