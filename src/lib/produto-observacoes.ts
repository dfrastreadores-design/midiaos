import type { CalcItemOut } from "@/components/PriceCalculator";

type ProdutoLike = {
  tipo?: string | null;
  programa?: string | null;
  formato?: string | null;
  nome?: string | null;
  observacao?: string | null;
  link_modelo?: string | null;
};

/**
 * Coleta observações únicas dos produtos cadastrados que correspondem aos
 * itens selecionados. Atualmente as observações de produtos não são mais
 * incluídas automaticamente em propostas/PIs.
 */
export function buildProdutoObservacoes(
  items: CalcItemOut[],
  produtos: ProdutoLike[],
): string {
  return "";
}

export function mergeObservacao(userText: string, autoText: string): string | null {
  const u = (userText ?? "").trim();
  const a = (autoText ?? "").trim();
  if (!u && !a) return null;
  if (!a) return u;
  if (!u) return a;
  if (u.includes(a)) return u;
  return `${u}\n\n${a}`;
}
