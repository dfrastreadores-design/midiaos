import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPropostaCompleta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("propostas")
      .select(
        "*, cliente:clientes!propostas_cliente_id_fkey(*), agencia:agencias!propostas_agencia_id_fkey(*), itens:proposta_itens!proposta_itens_proposta_id_fkey(*)",
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return p;
  });

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
        veiculo_nome: z.string().max(300).optional(),
        observacao: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const nomeVeiculo = data.veiculo_nome?.trim() || "Mídia.OS";
    const prompt = `Você é redator comercial sênior e estrategista de mídia de ${nomeVeiculo}. Escreva uma proposta executiva resumida e altamente persuasiva em português para apresentação ao cliente anunciante, em texto corrido com no máximo 6 parágrafos curtos. Use linguagem profissional, destaque alcance de audiência, autoridade da grade de veiculação e oportunidade de posicionamento da marca. NÃO use markdown, asteriscos ou listas. NÃO mencione descontos. Foque em valor entregue e retorno sobre o investimento.

Dados:
- Cliente: ${data.cliente}
- Campanha: ${data.campanha}
- Investimento total: R$ ${data.valor_negociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Total de inserções: ${data.total_insercoes}
- Itens da proposta:
${data.itens_resumo}
${data.observacao ? `- Observações do executivo: ${data.observacao}` : ""}

Estrutura sugerida:
1) Apresentação da oportunidade estratégica e contexto do veículo (${nomeVeiculo})
2) Estratégia de mídia proposta (formatos e sinergia de veiculação)
3) Resultados e impactos esperados (alcance, frequência, lembrança e valor de marca)
4) Considerações finais e convite à consolidação da parceria`;

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
