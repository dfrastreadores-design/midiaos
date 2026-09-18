/**
 * Notificações para o Social Media quando um PI contém entregas de Instagram
 * (Feed, Stories ou Reels). Configuração em SOCIAL_MEDIA_EMAILS.
 *
 * - Notifica ao gerar o PI (evento: "pi_social_criado").
 * - Notifica 2 dias antes de cada data programada de publicação
 *   (evento: "pi_social_lembrete-<data>"). Deduplica via índice único
 *   parcial da tabela notificacoes (user_id, tipo, ref_id, evento).
 */

export const SOCIAL_MEDIA_EMAILS = ["rodriigocarvalhonunes@gmail.com"];

const SOCIAL_REGEX =
  /(instagram|\bfeed\b|\bstories?\b|\breels?\b|redes\s*sociais)/i;

export type PiItemLike = {
  tipo?: string | null;
  programa?: string | null;
  formato?: string | null;
  mes?: number | null;
  ano?: number | null;
  dias_mes?: number[] | null;
};

export function isSocialItem(it: PiItemLike): boolean {
  const hay = `${it.tipo ?? ""} ${it.programa ?? ""} ${it.formato ?? ""}`;
  return SOCIAL_REGEX.test(hay);
}

/** Rótulo curto para descrever a entrega. */
export function labelSocialItem(it: PiItemLike): string {
  return [it.tipo, it.programa, it.formato].filter(Boolean).join(" · ");
}

/** Retorna as datas (YYYY-MM-DD) previstas a partir dos itens sociais. */
export function datasPublicacaoSocial(itens: PiItemLike[], fallbackInicio?: string | null): string[] {
  const out = new Set<string>();
  for (const it of itens) {
    if (!isSocialItem(it)) continue;
    const dias = (it.dias_mes ?? []).filter((d) => d > 0 && d <= 31);
    if (it.mes && it.ano && dias.length > 0) {
      for (const d of dias) {
        const iso = `${it.ano}-${String(it.mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        out.add(iso);
      }
    } else if (fallbackInicio) {
      out.add(fallbackInicio);
    }
  }
  return Array.from(out).sort();
}
