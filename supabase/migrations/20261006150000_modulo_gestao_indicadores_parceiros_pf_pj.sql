-- ========================================================================
-- MÓDULO DE GESTÃO DE INDICADORES E VENDEDORES EXTERNOS (PF E PJ)
-- Suporte integral a Pessoa Física e Pessoa Jurídica, validações de documentos,
-- dados bancários para repasse PIX e regras comerciais.
-- ========================================================================

-- 1. Criar tabela principal: public.partners
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_type text NOT NULL CHECK (person_type IN ('PF', 'PJ')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'blocked')),

  -- Dados Pessoa Física (PF)
  full_name text,
  cpf varchar(14),
  rg varchar(20),
  birth_date date,
  pis_pasep varchar(20),

  -- Dados Pessoa Jurídica (PJ)
  corporate_name text,
  trade_name text,
  cnpj varchar(18),
  state_registration varchar(30),
  municipal_registration varchar(30),
  legal_representative_name text,
  legal_representative_cpf varchar(14),

  -- Contato & Endereço
  email varchar(255) NOT NULL,
  phone varchar(20) NOT NULL,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Regras Comerciais & Comissionamento
  default_commission_rate numeric(5, 2) NOT NULL DEFAULT 10.00,
  payment_condition text NOT NULL DEFAULT 'post_client_payment' CHECK (payment_condition IN ('post_client_payment')),
  requires_invoice boolean NOT NULL DEFAULT false,

  -- Dados Bancários para Repasse
  pix_key_type text NOT NULL DEFAULT 'cpf' CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_key text NOT NULL,
  bank_name varchar(100),
  bank_agency varchar(10),
  bank_account varchar(20),
  bank_account_type text CHECK (bank_account_type IS NULL OR bank_account_type IN ('checking', 'savings')),

  -- Auditoria & Observações
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints de Integridade PF/PJ
  CONSTRAINT check_partner_pf_requirements CHECK (
    person_type <> 'PF' OR (
      full_name IS NOT NULL AND length(trim(full_name)) > 0 AND
      cpf IS NOT NULL AND length(trim(cpf)) >= 11
    )
  ),
  CONSTRAINT check_partner_pj_requirements CHECK (
    person_type <> 'PJ' OR (
      corporate_name IS NOT NULL AND length(trim(corporate_name)) > 0 AND
      cnpj IS NOT NULL AND length(trim(cnpj)) >= 14
    )
  )
);

-- 2. Índices de Desempenho e Unicidade por Inquilino
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_tenant_cpf ON public.partners(tenant_id, cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_tenant_cnpj ON public.partners(tenant_id, cnpj)
  WHERE cnpj IS NOT NULL AND cnpj <> '';

CREATE INDEX IF NOT EXISTS idx_partners_tenant_email ON public.partners(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_status ON public.partners(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_person_type ON public.partners(tenant_id, person_type);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_id ON public.partners(tenant_id);

-- 3. Trigger de updated_at para partners
CREATE OR REPLACE TRIGGER set_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Habilitar RLS (Row Level Security) com Isolamento Multitenant
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners tenant isolation policy" ON public.partners;
CREATE POLICY "Partners tenant isolation policy" ON public.partners
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

-- 5. Interoperabilidade e Retrocompatibilidade com tabela 'indicadores'
-- Adiciona colunas complementares em 'indicadores' para sincronização transparente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'person_type'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN person_type text DEFAULT 'PF';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'corporate_name'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN corporate_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'trade_name'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN trade_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'requires_invoice'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN requires_invoice boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN address jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_agency'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_agency varchar(10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_account'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_account varchar(20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_account_type'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_account_type text;
  END IF;
END $$;

-- 6. Gatilho de Sincronização Automática: partners -> indicadores
-- Permite que novas entidades em 'partners' satisfaçam FKs existentes em clientes/pis/comissoes
CREATE OR REPLACE FUNCTION public.sync_partner_to_indicadores()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.indicadores (
    id,
    tenant_id,
    nome,
    email,
    telefone,
    cpf_cnpj,
    chave_pix,
    tipo_chave_pix,
    banco_nome,
    percentual_comissao_padrao,
    observacoes,
    ativo,
    person_type,
    status,
    corporate_name,
    trade_name,
    requires_invoice,
    address,
    bank_agency,
    bank_account,
    bank_account_type,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.tenant_id,
    COALESCE(NEW.full_name, NEW.trade_name, NEW.corporate_name, 'Parceiro'),
    NEW.email,
    NEW.phone,
    COALESCE(NEW.cpf, NEW.cnpj),
    NEW.pix_key,
    NEW.pix_key_type,
    NEW.bank_name,
    NEW.default_commission_rate,
    NEW.notes,
    (NEW.status = 'active'),
    NEW.person_type,
    NEW.status,
    NEW.corporate_name,
    NEW.trade_name,
    NEW.requires_invoice,
    NEW.address,
    NEW.bank_agency,
    NEW.bank_account,
    NEW.bank_account_type,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    cpf_cnpj = EXCLUDED.cpf_cnpj,
    chave_pix = EXCLUDED.chave_pix,
    tipo_chave_pix = EXCLUDED.tipo_chave_pix,
    banco_nome = EXCLUDED.banco_nome,
    percentual_comissao_padrao = EXCLUDED.percentual_comissao_padrao,
    observacoes = EXCLUDED.observacoes,
    ativo = EXCLUDED.ativo,
    person_type = EXCLUDED.person_type,
    status = EXCLUDED.status,
    corporate_name = EXCLUDED.corporate_name,
    trade_name = EXCLUDED.trade_name,
    requires_invoice = EXCLUDED.requires_invoice,
    address = EXCLUDED.address,
    bank_agency = EXCLUDED.bank_agency,
    bank_account = EXCLUDED.bank_account,
    bank_account_type = EXCLUDED.bank_account_type,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_partner_to_indicadores ON public.partners;
CREATE TRIGGER trg_sync_partner_to_indicadores
  AFTER INSERT OR UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_to_indicadores();

-- 7. Migração Inicial de Dados Pré-existentes de 'indicadores' para 'partners' (se houver)
INSERT INTO public.partners (
  id,
  tenant_id,
  person_type,
  status,
  full_name,
  cpf,
  cnpj,
  corporate_name,
  trade_name,
  email,
  phone,
  default_commission_rate,
  payment_condition,
  requires_invoice,
  pix_key_type,
  pix_key,
  bank_name,
  notes,
  created_at,
  updated_at
)
SELECT
  i.id,
  i.tenant_id,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN 'PJ' ELSE 'PF' END AS person_type,
  CASE WHEN i.ativo THEN 'active' ELSE 'inactive' END AS status,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) <= 11 THEN i.nome ELSE NULL END AS full_name,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) <= 11 THEN i.cpf_cnpj ELSE NULL END AS cpf,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.cpf_cnpj ELSE NULL END AS cnpj,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.nome ELSE NULL END AS corporate_name,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.nome ELSE NULL END AS trade_name,
  COALESCE(i.email, 'contato@midiaos.com.br'),
  COALESCE(i.telefone, '(61) 99999-9999'),
  COALESCE(i.percentual_comissao_padrao, 10.00),
  'post_client_payment',
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN true ELSE false END,
  COALESCE(i.tipo_chave_pix, 'cpf'),
  COALESCE(i.chave_pix, i.cpf_cnpj, 'pendente'),
  i.banco_nome,
  i.observacoes,
  i.created_at,
  i.updated_at
FROM public.indicadores i
WHERE NOT EXISTS (
  SELECT 1 FROM public.partners p WHERE p.id = i.id
)
ON CONFLICT (id) DO NOTHING;
