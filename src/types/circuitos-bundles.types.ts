import { z } from "zod";
import { Partner } from "./representacao-comercial.types";

export type CircuitPricingType = "fixed_price" | "discount_percentage" | "discount_nominal";

export const CIRCUIT_PRICING_TYPES: { value: CircuitPricingType; label: string; desc: string }[] = [
  {
    value: "discount_percentage",
    label: "Desconto Percentual (%)",
    desc: "Aplica uma porcentagem de desconto sobre a soma dos valores de tabela dos itens.",
  },
  {
    value: "fixed_price",
    label: "Preço Fixo Fechado (R$)",
    desc: "Define um valor fixo promocional para o circuito completo, independente da soma unitária.",
  },
  {
    value: "discount_nominal",
    label: "Desconto Nominal (R$)",
    desc: "Deduz um valor fixo em reais da soma dos preços unitários do pacote.",
  },
];

export interface CircuitBundleItem {
  id?: string;
  bundle_id?: string;
  produto_id?: string | null;
  media_service_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  is_mandatory: boolean;
  order_index: number;
  created_at?: string;
}

export interface CircuitBundle {
  id: string;
  tenant_id?: string | null;
  partner_id?: string | null;
  name: string;
  code: string;
  description?: string | null;
  media_type?: string | null;
  pricing_type: CircuitPricingType;
  discount_value: number;
  fixed_price?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;

  // Relações
  items?: CircuitBundleItem[];
  partner?: Partner | null;
  allowed_partner_ids?: string[];
}

export interface CircuitBundleInput {
  id?: string;
  tenant_id?: string | null;
  partner_id?: string | null;
  name: string;
  code: string;
  description?: string | null;
  media_type?: string | null;
  pricing_type: CircuitPricingType;
  discount_value: number;
  fixed_price?: number | null;
  is_active?: boolean;
  items: Omit<CircuitBundleItem, "id" | "bundle_id" | "created_at">[];
  allowed_partner_ids?: string[];
}

export interface BundleItemCalculation {
  media_service_id?: string | null;
  product_name: string;
  quantity: number;
  regularUnitPrice: number;
  regularGross: number;
  effectiveUnitPrice: number;
  effectiveGross: number;
  discountVal: number;
  discountPercent: number;
  isMandatory: boolean;
}

export interface CircuitBundlePricingResult {
  bundleApplied: boolean;
  reason?: string;
  bundleId?: string;
  bundleName?: string;
  totalRegularGross: number;
  bundleFinalPrice: number;
  discountAmount: number;
  discountPercent: number;
  savings: number;
  itemsCalculation: BundleItemCalculation[];
}

/**
 * Validação e cálculo estrito de precificação de Circuito / Combo.
 *
 * Regras:
 * 1. O parceiro deve ser elegível (allows_circuit_bundles === true ou explicitamente listado em allowed_partner_ids).
 * 2. Todos os itens obrigatórios (is_mandatory: true) do circuito devem estar presentes na lista de itens avaliados com a quantidade necessária.
 * 3. Se qualquer item obrigatório faltar ou for removido, o desconto do circuito é imediatamente DESARMADO,
 *    e os itens restantes são calculados com seus preços normais de tabela unitária.
 */
export function calculateCircuitBundlePricing(params: {
  bundle: Pick<CircuitBundle, "id" | "name" | "pricing_type" | "discount_value" | "fixed_price" | "items" | "partner_id" | "allowed_partner_ids">;
  currentItems: Array<{
    media_service_id?: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  partnerAllowsBundles: boolean;
  partnerId?: string | null;
}): CircuitBundlePricingResult {
  const { bundle, currentItems, partnerAllowsBundles, partnerId } = params;

  // 1. Verificação de Elegibilidade do Parceiro
  const isExplicitlyAllowed =
    Boolean(partnerId && bundle.allowed_partner_ids && bundle.allowed_partner_ids.includes(partnerId));
  const isPartnerEligible = partnerAllowsBundles || isExplicitlyAllowed;

  const bundleItems = bundle.items || [];
  const totalRegularGrossFromCurrent = currentItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );

  const fallbackNonDiscounted: CircuitBundlePricingResult = {
    bundleApplied: false,
    reason: !isPartnerEligible
      ? "Parceiro não possui permissão para comercializar circuitos com desconto."
      : "Condições do circuito não atendidas.",
    bundleId: bundle.id,
    bundleName: bundle.name,
    totalRegularGross: Math.round(totalRegularGrossFromCurrent * 100) / 100,
    bundleFinalPrice: Math.round(totalRegularGrossFromCurrent * 100) / 100,
    discountAmount: 0,
    discountPercent: 0,
    savings: 0,
    itemsCalculation: currentItems.map((it) => {
      const regGross = Math.round((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * 100) / 100;
      return {
        media_service_id: it.media_service_id,
        product_name: it.product_name,
        quantity: it.quantity,
        regularUnitPrice: it.unit_price,
        regularGross: regGross,
        effectiveUnitPrice: it.unit_price,
        effectiveGross: regGross,
        discountVal: 0,
        discountPercent: 0,
        isMandatory: false,
      };
    }),
  };

  if (!isPartnerEligible) {
    return fallbackNonDiscounted;
  }

  // 2. Verificação de Itens Obrigatórios do Circuito
  const mandatoryItems = bundleItems.filter((bi) => bi.is_mandatory);
  for (const mandatory of mandatoryItems) {
    const matched = currentItems.find((ci) => {
      if (mandatory.media_service_id && ci.media_service_id) {
        return ci.media_service_id === mandatory.media_service_id;
      }
      return (
        ci.product_name.toLowerCase().trim() === mandatory.product_name.toLowerCase().trim()
      );
    });

    if (!matched) {
      return {
        ...fallbackNonDiscounted,
        reason: `Item obrigatório do circuito ausente: "${mandatory.product_name}". Desconto desarmado.`,
      };
    }

    if ((Number(matched.quantity) || 0) < (Number(mandatory.quantity) || 1)) {
      return {
        ...fallbackNonDiscounted,
        reason: `Quantidade insuficiente do item obrigatório "${mandatory.product_name}" (exigido: ${mandatory.quantity}, atual: ${matched.quantity}). Desconto desarmado.`,
      };
    }
  }

  // 3. Cálculo da Precificação com Desconto
  // Soma o valor regular bruto baseado nos itens da composição do circuito
  let bundleRegularSum = 0;
  bundleItems.forEach((bi) => {
    bundleRegularSum += (Number(bi.quantity) || 1) * (Number(bi.unit_price) || 0);
  });
  if (bundleRegularSum === 0) {
    bundleRegularSum = totalRegularGrossFromCurrent;
  }

  let finalBundlePrice = bundleRegularSum;
  let totalDiscount = 0;

  if (bundle.pricing_type === "fixed_price") {
    const fixed = Number(bundle.fixed_price) || 0;
    finalBundlePrice = Math.max(0, Math.min(bundleRegularSum, fixed));
    totalDiscount = Math.max(0, bundleRegularSum - finalBundlePrice);
  } else if (bundle.pricing_type === "discount_percentage") {
    const pct = Math.min(100, Math.max(0, Number(bundle.discount_value) || 0));
    totalDiscount = Math.round(((bundleRegularSum * pct) / 100) * 100) / 100;
    finalBundlePrice = Math.max(0, Math.round((bundleRegularSum - totalDiscount) * 100) / 100);
  } else if (bundle.pricing_type === "discount_nominal") {
    const nominal = Math.max(0, Number(bundle.discount_value) || 0);
    totalDiscount = Math.min(bundleRegularSum, nominal);
    finalBundlePrice = Math.max(0, Math.round((bundleRegularSum - totalDiscount) * 100) / 100);
  }

  const overallDiscountPercent =
    bundleRegularSum > 0
      ? Math.round(((totalDiscount / bundleRegularSum) * 100) * 100) / 100
      : 0;

  // 4. Rateio do desconto proporcional por item
  let accumulatedDiscount = 0;
  const itemsCalculation: BundleItemCalculation[] = currentItems.map((it, idx) => {
    const regGross = Math.round((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * 100) / 100;
    const isLast = idx === currentItems.length - 1;

    let itemDiscount = 0;
    if (bundleRegularSum > 0 && totalDiscount > 0) {
      if (isLast) {
        // Ajuste no último item para evitar dízima periódica
        itemDiscount = Math.max(0, Math.round((totalDiscount - accumulatedDiscount) * 100) / 100);
      } else {
        const proportion = regGross / bundleRegularSum;
        itemDiscount = Math.round(totalDiscount * proportion * 100) / 100;
        accumulatedDiscount += itemDiscount;
      }
    }

    const effectiveGross = Math.max(0, Math.round((regGross - itemDiscount) * 100) / 100);
    const qty = Math.max(0.001, Number(it.quantity) || 1);
    const effectiveUnitPrice = Math.round((effectiveGross / qty) * 100) / 100;
    const itemDiscountPercent =
      regGross > 0 ? Math.round(((itemDiscount / regGross) * 100) * 100) / 100 : 0;

    const isMandatory = bundleItems.some((bi) => {
      if (bi.media_service_id && it.media_service_id) {
        return bi.media_service_id === it.media_service_id;
      }
      return bi.product_name.toLowerCase().trim() === it.product_name.toLowerCase().trim();
    });

    return {
      media_service_id: it.media_service_id,
      product_name: it.product_name,
      quantity: it.quantity,
      regularUnitPrice: it.unit_price,
      regularGross: regGross,
      effectiveUnitPrice,
      effectiveGross,
      discountVal: itemDiscount,
      discountPercent: itemDiscountPercent,
      isMandatory,
    };
  });

  return {
    bundleApplied: true,
    bundleId: bundle.id,
    bundleName: bundle.name,
    totalRegularGross: Math.round(bundleRegularSum * 100) / 100,
    bundleFinalPrice: finalBundlePrice,
    discountAmount: totalDiscount,
    discountPercent: overallDiscountPercent,
    savings: totalDiscount,
    itemsCalculation,
  };
}
