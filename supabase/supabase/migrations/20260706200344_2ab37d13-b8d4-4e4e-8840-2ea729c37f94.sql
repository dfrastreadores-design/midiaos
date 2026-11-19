WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        pi_id,
        tipo,
        coalesce(programa, ''),
        coalesce(formato, ''),
        coalesce(horario, ''),
        coalesce(mes, 0),
        coalesce(ano, 0),
        insercoes_dia,
        coalesce(desconto, 0),
        coalesce(valor_unit, 0),
        coalesce(valor_tabela, 0),
        coalesce(valor_negociado, 0),
        total_insercoes,
        coalesce(dias_mes, '{}'::integer[]),
        coalesce(dias_semana, '{}'::text[])
      ORDER BY created_at NULLS LAST, id
    ) AS rn
  FROM public.pi_itens
)
DELETE FROM public.pi_itens i
USING ranked r
WHERE i.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pi_itens_no_exact_duplicates_idx
ON public.pi_itens (
  pi_id,
  tipo,
  coalesce(programa, ''),
  coalesce(formato, ''),
  coalesce(horario, ''),
  coalesce(mes, 0),
  coalesce(ano, 0),
  insercoes_dia,
  coalesce(desconto, 0),
  coalesce(valor_unit, 0),
  coalesce(valor_tabela, 0),
  coalesce(valor_negociado, 0),
  total_insercoes,
  coalesce(dias_mes, '{}'::integer[]),
  coalesce(dias_semana, '{}'::text[])
);