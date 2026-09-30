import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const gerarResumoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campanha: z.string().min(1).max(300),
        cliente: z.string().max(300),
        valor_negociado: z.number(),
        total_insercoes: z.number().int(),
        itens_resumo: z.string().max(4000),
        observacao: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const prompt = `Você é redator comercial da TV Brasília. Escreva uma proposta resumida e persuasiva em português para apresentação ao cliente, em texto corrido com no máximo 6 parágrafos curtos. Use linguagem profissional, destaque alcance, força da grade e oportunidade de marca. NÃO use markdown, asteriscos ou listas. NÃO mencione descontos. Foque em valor entregue.

Dados:
- Cliente: ${data.cliente}
- Campanha: ${data.campanha}
- Investimento total: R$ ${data.valor_negociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Total de inserções: ${data.total_insercoes}
- Itens da proposta:
${data.itens_resumo}
${data.observacao ? `- Observações do executivo: ${data.observacao}` : ""}

Estrutura sugerida:
1) Apresentação da oportunidade e contexto da TV Brasília
2) Estratégia de mídia proposta (formatos e programas)
3) Resultados esperados (alcance, frequência, valor de marca)
4) Considerações finais e convite à parceria`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é redator comercial sênior de uma emissora de TV." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!res.ok) throw new Error(`Falha na IA: ${res.status}`);
    const json = await res.json();
    const texto: string = json?.choices?.[0]?.message?.content ?? "";
    return { texto: texto.trim() };
  });
