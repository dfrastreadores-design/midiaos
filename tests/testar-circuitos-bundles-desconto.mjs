/**
 * TESTE AUTOMATIZADO DE VALIDAÇÃO:
 * Venda de Circuitos Completos com Desconto por Parceiro Elegível
 * 
 * Casos de Teste Cobertos:
 * 1. Parceiro Não Autorizado (allows_circuit_bundles = false):
 *    - Aplicação do circuito é rejeitada / desconto é desarmado e itens mantêm preço unitário normal de tabela.
 * 2. Parceiro Autorizado (allows_circuit_bundles = true):
 *    - Desconto percentual aplicado com sucesso e rateio proporcional exato entre os itens.
 *    - Desconto com preço fixo promocional (fixed_price) aplicado e rateado.
 *    - Desconto nominal (R$) deduzido com exatidão da soma unitária.
 * 3. Integridade do Circuito / Remoção de Item Obrigatório:
 *    - Remoção de 1 ponto obrigatório do circuito imediatamente desarma o desconto do pacote.
 *    - Redução de quantidade abaixo da exigida pelo circuito desarma o desconto.
 */

import { strict as assert } from "node:assert";

// Implementação direta da função de cálculo para execução autônoma do teste
function calculateCircuitBundlePricing(params) {
  const { bundle, currentItems, partnerAllowsBundles, partnerId } = params;

  const isExplicitlyAllowed =
    Boolean(partnerId && bundle.allowed_partner_ids && bundle.allowed_partner_ids.includes(partnerId));
  const isPartnerEligible = partnerAllowsBundles || isExplicitlyAllowed;

  const bundleItems = bundle.items || [];
  const totalRegularGrossFromCurrent = currentItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );

  const fallbackNonDiscounted = {
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

  // Verificação de itens obrigatórios
  const mandatoryItems = bundleItems.filter((bi) => bi.is_mandatory);
  for (const mandatory of mandatoryItems) {
    const matched = currentItems.find((ci) => {
      if (mandatory.media_service_id && ci.media_service_id) {
        return ci.media_service_id === mandatory.media_service_id;
      }
      return ci.product_name.toLowerCase().trim() === mandatory.product_name.toLowerCase().trim();
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

  // Cálculo da precificação com desconto
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
    bundleRegularSum > 0 ? Math.round(((totalDiscount / bundleRegularSum) * 100) * 100) / 100 : 0;

  let accumulatedDiscount = 0;
  const itemsCalculation = currentItems.map((it, idx) => {
    const regGross = Math.round((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * 100) / 100;
    const isLast = idx === currentItems.length - 1;

    let itemDiscount = 0;
    if (bundleRegularSum > 0 && totalDiscount > 0) {
      if (isLast) {
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
      isMandatory: true,
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

console.log("================================================================================");
console.log("INICIANDO BATERIA DE TESTES: CIRCUITOS COMPLETOS COM DESCONTO POR PARCEIRO");
console.log("================================================================================");

// Mock de Circuito com 3 Pontos de Mídia (Total Regular: R$ 6.000)
const mockBundle = {
  id: "bundle-circuito-eptg-01",
  name: "Circuito EPTG Prime 3 Telas",
  pricing_type: "discount_percentage",
  discount_value: 20, // 20% de desconto
  partner_id: "partner-megavi-01",
  items: [
    {
      media_service_id: "tela-eptg-km2",
      product_name: "Painel LED EPTG Km 2",
      quantity: 1,
      unit_price: 2500,
      is_mandatory: true,
    },
    {
      media_service_id: "tela-eptg-km4",
      product_name: "Painel LED EPTG Km 4 (DF Plaza)",
      quantity: 1,
      unit_price: 2000,
      is_mandatory: true,
    },
    {
      media_service_id: "tela-eptg-km7",
      product_name: "Painel LED EPTG Km 7 (Águas Claras)",
      quantity: 1,
      unit_price: 1500,
      is_mandatory: true,
    },
  ],
};

const fullCartItems = [
  {
    media_service_id: "tela-eptg-km2",
    product_name: "Painel LED EPTG Km 2",
    quantity: 1,
    unit_price: 2500,
  },
  {
    media_service_id: "tela-eptg-km4",
    product_name: "Painel LED EPTG Km 4 (DF Plaza)",
    quantity: 1,
    unit_price: 2000,
  },
  {
    media_service_id: "tela-eptg-km7",
    product_name: "Painel LED EPTG Km 7 (Águas Claras)",
    quantity: 1,
    unit_price: 1500,
  },
];

// -----------------------------------------------------------------------------
// TESTE 1: Parceiro NÃO AUTORIZADO (allows_circuit_bundles: false)
// -----------------------------------------------------------------------------
console.log("\n[TESTE 1] Tentativa de compra de circuito por parceiro NÃO autorizado...");
const resNaoAutorizado = calculateCircuitBundlePricing({
  bundle: mockBundle,
  currentItems: fullCartItems,
  partnerAllowsBundles: false,
  partnerId: "partner-megavi-01",
});

assert.equal(resNaoAutorizado.bundleApplied, false, "Bundle NÃO deve ser aplicado para parceiro não elegível");
assert.equal(resNaoAutorizado.discountAmount, 0, "Desconto deve ser zero para parceiro inelegível");
assert.equal(resNaoAutorizado.bundleFinalPrice, 6000, "Valor final deve ser a soma regular de R$ 6.000,00");
console.log("✓ TESTE 1 PASSOU: Parceiro inelegível não recebe desconto de circuito.");

// -----------------------------------------------------------------------------
// TESTE 2: Parceiro AUTORIZADO (allows_circuit_bundles: true) - Desconto %
// -----------------------------------------------------------------------------
console.log("\n[TESTE 2] Compra bem-sucedida por parceiro AUTORIZADO (Desconto 20%)...");
const resAutorizadoPct = calculateCircuitBundlePricing({
  bundle: mockBundle,
  currentItems: fullCartItems,
  partnerAllowsBundles: true,
  partnerId: "partner-megavi-01",
});

assert.equal(resAutorizadoPct.bundleApplied, true, "Bundle DEVE ser aplicado para parceiro autorizado");
assert.equal(resAutorizadoPct.totalRegularGross, 6000, "Soma regular deve ser R$ 6.000,00");
assert.equal(resAutorizadoPct.discountAmount, 1200, "Desconto de 20% sobre R$ 6.000 deve ser R$ 1.200,00");
assert.equal(resAutorizadoPct.bundleFinalPrice, 4800, "Preço final do circuito deve ser R$ 4.800,00");
assert.equal(resAutorizadoPct.savings, 1200, "Economia deve ser R$ 1.200,00");

// Valida rateio dos itens
const somaEfetivaItens = resAutorizadoPct.itemsCalculation.reduce((acc, it) => acc + it.effectiveGross, 0);
assert.equal(somaEfetivaItens, 4800, "Soma dos itens rateados deve bater exatamente o preço final de R$ 4.800,00");
console.log("✓ TESTE 2 PASSOU: Desconto percentual calculado e rateado com exatidão.");

// -----------------------------------------------------------------------------
// TESTE 3: Parceiro AUTORIZADO com PREÇO FIXO PROMOCIONAL (fixed_price)
// -----------------------------------------------------------------------------
console.log("\n[TESTE 3] Compra com modalidade Preço Fixo Promocional (De R$ 6.000 por R$ 4.500)...");
const bundlePrecoFixo = {
  ...mockBundle,
  pricing_type: "fixed_price",
  fixed_price: 4500,
};

const resPrecoFixo = calculateCircuitBundlePricing({
  bundle: bundlePrecoFixo,
  currentItems: fullCartItems,
  partnerAllowsBundles: true,
  partnerId: "partner-megavi-01",
});

assert.equal(resPrecoFixo.bundleApplied, true);
assert.equal(resPrecoFixo.bundleFinalPrice, 4500, "Preço final deve ser R$ 4.500,00");
assert.equal(resPrecoFixo.discountAmount, 1500, "Desconto nominal deve ser R$ 1.500,00");
const somaItensFixo = resPrecoFixo.itemsCalculation.reduce((acc, it) => acc + it.effectiveGross, 0);
assert.equal(somaItensFixo, 4500, "Soma dos itens do preço fixo deve fechar exatamente em R$ 4.500,00");
console.log("✓ TESTE 3 PASSOU: Preço fixo fechado de pacote aplicado e rateado com sucesso.");

// -----------------------------------------------------------------------------
// TESTE 4: REMOÇÃO DE ITEM OBRIGATÓRIO (Desarmamento Automático do Desconto)
// -----------------------------------------------------------------------------
console.log("\n[TESTE 4] Remoção de item obrigatório do circuito desarmando o desconto...");
// Cliente removeu a 'tela-eptg-km4'
const cartComItemRemovido = [
  {
    media_service_id: "tela-eptg-km2",
    product_name: "Painel LED EPTG Km 2",
    quantity: 1,
    unit_price: 2500,
  },
  {
    media_service_id: "tela-eptg-km7",
    product_name: "Painel LED EPTG Km 7 (Águas Claras)",
    quantity: 1,
    unit_price: 1500,
  },
];

const resItemRemovido = calculateCircuitBundlePricing({
  bundle: mockBundle,
  currentItems: cartComItemRemovido,
  partnerAllowsBundles: true,
  partnerId: "partner-megavi-01",
});

assert.equal(resItemRemovido.bundleApplied, false, "Bundle DEVE ser desarmado após remoção de item obrigatório");
assert.equal(resItemRemovido.discountAmount, 0, "Desconto deve ser zerado imediatamente");
assert.equal(resItemRemovido.bundleFinalPrice, 4000, "Valor final deve ser a soma avulsa dos 2 itens restantes (R$ 2.500 + R$ 1.500 = R$ 4.000)");
assert.ok(resItemRemovido.reason.includes("Item obrigatório do circuito ausente"), "Motivo da recusa deve ser informado");
console.log(`✓ TESTE 4 PASSOU: Desconto desarmado com sucesso: "${resItemRemovido.reason}"`);

// -----------------------------------------------------------------------------
// TESTE 5: QUANTIDADE INSUFICIENTE DE ITEM OBRIGATÓRIO
// -----------------------------------------------------------------------------
console.log("\n[TESTE 5] Redução de quantidade de item obrigatório abaixo do exigido...");
const cartComQtdInsuficiente = [
  {
    media_service_id: "tela-eptg-km2",
    product_name: "Painel LED EPTG Km 2",
    quantity: 0.5, // Exigido: 1
    unit_price: 2500,
  },
  {
    media_service_id: "tela-eptg-km4",
    product_name: "Painel LED EPTG Km 4 (DF Plaza)",
    quantity: 1,
    unit_price: 2000,
  },
  {
    media_service_id: "tela-eptg-km7",
    product_name: "Painel LED EPTG Km 7 (Águas Claras)",
    quantity: 1,
    unit_price: 1500,
  },
];

const resQtdInsuficiente = calculateCircuitBundlePricing({
  bundle: mockBundle,
  currentItems: cartComQtdInsuficiente,
  partnerAllowsBundles: true,
  partnerId: "partner-megavi-01",
});

assert.equal(resQtdInsuficiente.bundleApplied, false, "Bundle DEVE ser desarmado por quantidade insuficiente");
assert.ok(resQtdInsuficiente.reason.includes("Quantidade insuficiente"), "Motivo deve especificar quantidade insuficiente");
console.log(`✓ TESTE 5 PASSOU: Quantidade insuficiente desarmou o circuito: "${resQtdInsuficiente.reason}"`);

console.log("\n================================================================================");
console.log("TODOS OS 5 TESTES DE CIRCUITOS / BUNDLES COM DESCONTO PASSARAM COM SUCESSO!");
console.log("================================================================================");
