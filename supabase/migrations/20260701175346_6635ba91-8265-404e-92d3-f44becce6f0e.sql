
-- 1) Tabela de datas comemorativas
CREATE TABLE IF NOT EXISTS public.datas_comemorativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 31),
  mes smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  categoria text NOT NULL DEFAULT 'comemorativa',
  segmentos_alvo text[] NOT NULL DEFAULT '{}',
  sugestoes_projetos text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nome, dia, mes)
);

GRANT SELECT ON public.datas_comemorativas TO authenticated;
GRANT ALL ON public.datas_comemorativas TO service_role;

ALTER TABLE public.datas_comemorativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datas_read_all" ON public.datas_comemorativas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "datas_admin_write" ON public.datas_comemorativas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_datas_comemorativas_updated
  BEFORE UPDATE ON public.datas_comemorativas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Seed de datas brasileiras principais
INSERT INTO public.datas_comemorativas (nome, dia, mes, categoria, segmentos_alvo, sugestoes_projetos) VALUES
('Ano Novo', 1, 1, 'sazonal', ARRAY['varejo','alimentacao','turismo'], 'Campanhas de retrospectiva, saudação de ano novo e promoções de recomeço.'),
('Dia do Consumidor', 15, 3, 'sazonal', ARRAY['varejo','ecommerce','servicos'], 'Ofertas relâmpago, cashback, cupons e descontos exclusivos.'),
('Páscoa', 20, 4, 'sazonal', ARRAY['alimentacao','varejo','confeitaria'], 'Kits de páscoa, chocolates, cestas e ações infantis.'),
('Dia das Mães', 12, 5, 'sazonal', ARRAY['varejo','moda','beleza','joias','floricultura','alimentacao'], 'Combos presente, campanhas emocionais e brindes especiais.'),
('Dia dos Namorados', 12, 6, 'sazonal', ARRAY['moda','joias','restaurantes','turismo','beleza'], 'Ações de casal, jantares, hotéis, joias e experiências.'),
('Festa Junina', 24, 6, 'sazonal', ARRAY['alimentacao','varejo','eventos'], 'Ativações regionais, kits temáticos e ações em bairros.'),
('Dia dos Pais', 10, 8, 'sazonal', ARRAY['varejo','automotivo','tecnologia','moda'], 'Ferramentas, tech, moda masculina e experiências para o pai.'),
('Dia do Cliente', 15, 9, 'sazonal', ARRAY['varejo','servicos','ecommerce'], 'Campanhas de fidelização, brindes e descontos exclusivos.'),
('Dia das Crianças', 12, 10, 'sazonal', ARRAY['brinquedos','varejo','alimentacao','entretenimento'], 'Brinquedos, parques, kits infantis e ações lúdicas.'),
('Black Friday', 28, 11, 'sazonal', ARRAY['varejo','ecommerce','tecnologia','automotivo','moda'], 'Grande volume de mídia, teasers e ofertas por categoria.'),
('Natal', 25, 12, 'sazonal', ARRAY['varejo','alimentacao','moda','joias','tecnologia','decoracao'], 'Campanha institucional de fim de ano, presentes e ceia.'),
('Volta às Aulas', 20, 1, 'sazonal', ARRAY['papelaria','educacao','moda','tecnologia'], 'Material escolar, uniformes, cursos e eletrônicos.'),
('Carnaval', 17, 2, 'sazonal', ARRAY['bebidas','turismo','moda','entretenimento'], 'Blocos, camarotes, patrocínios e ações de bebida.'),
('Dia da Mulher', 8, 3, 'sazonal', ARRAY['beleza','moda','saude','joias'], 'Homenagens, promoções e conteúdo institucional.'),
('Dia do Trabalho', 1, 5, 'sazonal', ARRAY['varejo','servicos','automotivo'], 'Feirões, promoções relâmpago e ações institucionais.'),
('Dia do Meio Ambiente', 5, 6, 'comemorativa', ARRAY['sustentabilidade','energia','saude'], 'Campanhas ESG, produtos sustentáveis e institucionais verdes.'),
('Independência do Brasil', 7, 9, 'sazonal', ARRAY['varejo','automotivo'], 'Semana da Pátria, feirões e ações patrióticas.'),
('Dia do Professor', 15, 10, 'comemorativa', ARRAY['educacao','livrarias','varejo'], 'Homenagens, cursos e presentes para docentes.'),
('Halloween', 31, 10, 'sazonal', ARRAY['entretenimento','alimentacao','varejo'], 'Fantasias, promoções temáticas e ações infantis.'),
('Copa do Mundo', 15, 6, 'comemorativa', ARRAY['bebidas','eletronicos','varejo'], 'TVs, cervejas, ativações esportivas (aplicável em anos de Copa).'),
('Réveillon', 31, 12, 'sazonal', ARRAY['turismo','bebidas','moda','restaurantes'], 'Pacotes, festas, moda branca e restaurantes.')
ON CONFLICT (nome, dia, mes) DO NOTHING;

-- 3) Função que gera notificações 45 dias antes
CREATE OR REPLACE FUNCTION public.notificar_datas_comemorativas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_alvo date := v_hoje + 45;
  v_data record;
  v_user record;
  v_clientes text;
  v_qtd_clientes int;
  v_mensagem text;
  v_count int := 0;
  v_target_year int;
BEGIN
  FOR v_data IN
    SELECT * FROM public.datas_comemorativas WHERE ativo
  LOOP
    -- calcula a próxima ocorrência da data
    v_target_year := EXTRACT(YEAR FROM v_alvo)::int;
    BEGIN
      IF make_date(v_target_year, v_data.mes, v_data.dia) <> v_alvo THEN
        CONTINUE;
      END IF;
    EXCEPTION WHEN OTHERS THEN CONTINUE;
    END;

    -- para cada usuário do sistema (por tenant), monta clientes-alvo
    FOR v_user IN
      SELECT p.id AS user_id, p.tenant_id
      FROM public.profiles p
      WHERE p.tenant_id IS NOT NULL
    LOOP
      SELECT string_agg(razao_social, ', ' ORDER BY razao_social), COUNT(*)
        INTO v_clientes, v_qtd_clientes
      FROM (
        SELECT razao_social FROM public.clientes
        WHERE tenant_id = v_user.tenant_id
          AND ativo = true
          AND (
            array_length(v_data.segmentos_alvo,1) IS NULL
            OR segmento = ANY(v_data.segmentos_alvo)
          )
        LIMIT 8
      ) sub;

      v_mensagem := format(
        '📅 %s em %s dias (%s). %s%sSugestões de projeto: %s',
        v_data.nome,
        (make_date(v_target_year, v_data.mes, v_data.dia) - v_hoje),
        to_char(make_date(v_target_year, v_data.mes, v_data.dia), 'DD/MM/YYYY'),
        CASE WHEN COALESCE(v_qtd_clientes,0) > 0
             THEN format('Clientes potenciais (%s): %s. ', v_qtd_clientes, v_clientes)
             ELSE 'Nenhum cliente cadastrado com segmento compatível. ' END,
        E'\n',
        COALESCE(v_data.sugestoes_projetos, 'Monte uma proposta temática dedicada.')
      );

      INSERT INTO public.notificacoes (user_id, tenant_id, tipo, titulo, mensagem, link, metadata)
      VALUES (
        v_user.user_id,
        v_user.tenant_id,
        'outro',
        'Oportunidade: ' || v_data.nome,
        v_mensagem,
        '/calendario',
        jsonb_build_object(
          'ref_id', v_data.id::text || '-' || v_target_year::text,
          'evento', 'data_comemorativa_45d',
          'data_id', v_data.id,
          'data_alvo', make_date(v_target_year, v_data.mes, v_data.dia),
          'segmentos', v_data.segmentos_alvo,
          'clientes_qtd', COALESCE(v_qtd_clientes,0)
        )
      )
      ON CONFLICT (user_id, tipo, (metadata->>'ref_id'), (metadata->>'evento')) DO NOTHING;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.notificar_datas_comemorativas() TO service_role;
