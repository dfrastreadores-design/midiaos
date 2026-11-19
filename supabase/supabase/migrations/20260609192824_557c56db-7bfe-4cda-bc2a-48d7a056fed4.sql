CREATE UNIQUE INDEX IF NOT EXISTS agencias_cnpj_digits_uniq
  ON public.agencias ((regexp_replace(cnpj, '\D', '', 'g')))
  WHERE cnpj IS NOT NULL AND length(regexp_replace(cnpj, '\D', '', 'g')) = 14;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_cnpj_digits_uniq
  ON public.clientes ((regexp_replace(cnpj, '\D', '', 'g')))
  WHERE cnpj IS NOT NULL AND length(regexp_replace(cnpj, '\D', '', 'g')) = 14;

CREATE UNIQUE INDEX IF NOT EXISTS agencias_razao_social_nocnpj_uniq
  ON public.agencias ((lower(btrim(razao_social))))
  WHERE cnpj IS NULL OR length(regexp_replace(cnpj, '\D', '', 'g')) <> 14;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_razao_social_nocnpj_uniq
  ON public.clientes ((lower(btrim(razao_social))))
  WHERE cnpj IS NULL OR length(regexp_replace(cnpj, '\D', '', 'g')) <> 14;