import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  texto: z.string().min(20).max(200000),
});

export type PiExtraido = {
  campanha: string | null;
  cliente: { razao_social: string | null; cnpj: string | null } | null;
  agencia: { razao_social: string | null; cnpj: string | null } | null;
  mes_veiculacao: number | null;
  ano_veiculacao: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  valor_negociado: number | null;
  valor_bruto: number | null;
  valor_liquido: number | null;
  faturamento_tipo: "bruto" | "liquido" | null;
  faturamento_contra: "cliente" | "agencia" | null;
  data_faturamento: string | null;
  data_envio_nota: string | null;
  data_vencimento_nota: string | null;
  prazo_pagamento_dias: number | null;
  total_insercoes: number | null;
  permuta: boolean | null;
  observacao: string | null;
  itens: Array<{
    tipo: string | null;
    programa: string | null;
    horario: string | null;
    formato: string | null;
    insercoes_dia: number | null;
    dias_semana: string[] | null;
    dias_mes: number[] | null;
    desconto: number | null;
    valor_unit: number | null;
    valor_tabela: number | null;
    valor_negociado: number | null;
    total_insercoes: number | null;
  }>;
};


export const extrairPiDePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<PiExtraido> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const system = `Você é um extrator de dados de Pedidos de Inserção (PI) brasileiros para emissoras de TV.
Retorne SOMENTE JSON válido seguindo o schema. Use null para campos ausentes (nunca invente).
Datas em ISO (YYYY-MM-DD). Valores numéricos puros (sem "R$", sem separador de milhar, ponto como decimal). Inserções inteiras.
Mês 1-12, ano 4 dígitos. CNPJ somente dígitos.
EXTRAIA TODOS OS ITENS DE PROGRAMAÇÃO (uma linha do mapa de mídia = um item). Não resuma.
Para cada item, capture: tipo, programa, horario (horário do programa), formato, insercoes_dia, dias_semana, dias_mes, desconto, valor_unit, valor_tabela, valor_negociado, total_insercoes.

CAMPOS FINANCEIROS / FATURAMENTO (extremamente importantes):
  - valor_bruto: valor total bruto do PI (antes da comissão de agência)
  - valor_liquido: valor total líquido (após desconto de comissão da agência, normalmente 20%)
  - valor_negociado: o valor que efetivamente será faturado (pode ser igual a bruto ou líquido)
  - faturamento_tipo: "bruto" ou "liquido" — identifique no PI se a cobrança é em valor bruto ou líquido. Quando há agência, normalmente é líquido; quando é direto com cliente, normalmente é bruto.
  - faturamento_contra: "cliente" ou "agencia" — quem será faturado. Se houver agência, geralmente "agencia"; senão "cliente".
  - data_faturamento: data em que a nota fiscal deve ser emitida (procure por "data de faturamento", "emissão da NF", "faturar em")
  - data_envio_nota: data de envio da nota (se mencionada)
  - data_vencimento_nota: data de vencimento da nota fiscal / pagamento (procure por "vencimento", "pagamento em", "vence em")
  - prazo_pagamento_dias: prazo em dias entre emissão e vencimento (ex.: 30, 60, 90). Útil quando a data específica não está, mas o prazo está (ex.: "30 dias após emissão", "30 ddl", "30/60/90 dias")
  - permuta: true ou false — identifique se o PI menciona ser uma permuta, troca de serviços, compensação ou similar.`;

    const userPrompt = `Extraia os dados do PI abaixo e retorne JSON com este schema exato:
{
  "campanha": string|null,
  "cliente": {"razao_social": string|null, "cnpj": string|null}|null,
  "agencia": {"razao_social": string|null, "cnpj": string|null}|null,
  "mes_veiculacao": number|null,
  "ano_veiculacao": number|null,
  "periodo_inicio": "YYYY-MM-DD"|null,
  "periodo_fim": "YYYY-MM-DD"|null,
  "valor_negociado": number|null,
  "valor_bruto": number|null,
  "valor_liquido": number|null,
  "faturamento_tipo": "bruto"|"liquido"|null,
  "faturamento_contra": "cliente"|"agencia"|null,
  "data_faturamento": "YYYY-MM-DD"|null,
  "data_envio_nota": "YYYY-MM-DD"|null,
  "data_vencimento_nota": "YYYY-MM-DD"|null,
  "prazo_pagamento_dias": number|null,
  "total_insercoes": number|null,
  "permuta": boolean|null,
  "observacao": string|null,
  "itens": [{
    "tipo": string|null, "programa": string|null, "horario": string|null, "formato": string|null,
    "insercoes_dia": number|null,
    "dias_semana": string[]|null, "dias_mes": number[]|null,
    "desconto": number|null,
    "valor_unit": number|null, "valor_tabela": number|null,
    "valor_negociado": number|null, "total_insercoes": number|null
  }]
}

TEXTO DO PI:
"""
${data.texto}
"""`;


    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Configurações.");
    if (!res.ok) throw new Error(`Falha na IA: ${res.status} ${await res.text()}`);

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content) as PiExtraido;
    } catch {
      throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }
  });
