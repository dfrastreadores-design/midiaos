export type CnpjData = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnae: string;
  situacaoCadastral: string;
};

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const formatCNPJ = (s: string) => {
  const d = onlyDigits(s).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

/**
 * Consulta inscrições estadual (IE) e municipal (IM) em múltiplas APIs públicas
 * gratuitas, com fallback automático. Retorna "ISENTA" quando não houver inscrição.
 *
 * Ordem: 1) publica.cnpj.ws  2) open.cnpja.com  3) receitaws.com.br
 */
async function fetchInscricoes(digits: string, uf: string): Promise<{ ie: string; im: string }> {
  let ie = "";
  let im = "";

  // 1) publica.cnpj.ws — costuma trazer IE ativa por UF
  try {
    const r = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`);
    if (r.ok) {
      const j = await r.json();
      const insc: Array<{
        inscricao_estadual?: string;
        ativo?: boolean;
        estado?: { sigla?: string };
      }> = j?.estabelecimento?.inscricoes_estaduais ?? [];
      if (Array.isArray(insc) && insc.length > 0) {
        const ativaUf = insc.find((x) => x.ativo && (!uf || x.estado?.sigla === uf));
        const ativa = ativaUf || insc.find((x) => x.ativo) || insc[0];
        ie = ativa?.inscricao_estadual || "";
      }
      im = j?.estabelecimento?.inscricao_municipal || j?.inscricao_municipal || "";
    }
  } catch {
    /* ignora */
  }

  // 2) open.cnpja.com — backup com lista de registros
  if (!ie || !im) {
    try {
      const r = await fetch(`https://open.cnpja.com/office/${digits}?registrations=BR`);
      if (r.ok) {
        const j = await r.json();
        if (!ie) {
          const regs: Array<{ state?: string; number?: string; enabled?: boolean }> =
            j?.registrations ?? [];
          if (Array.isArray(regs) && regs.length > 0) {
            const ativaUf = regs.find((x) => x.enabled && (!uf || x.state === uf));
            const ativa = ativaUf || regs.find((x) => x.enabled) || regs[0];
            ie = ativa?.number || "";
          }
        }
        if (!im) {
          im =
            (j?.company?.municipalRegistration as string | undefined) ||
            (j?.municipalRegistration as string | undefined) ||
            (j?.inscricao_municipal as string | undefined) ||
            "";
        }
      }
    } catch {
      /* ignora */
    }
  }

  // 3) receitaws.com.br — último fallback
  if (!ie || !im) {
    try {
      const r = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`);
      if (r.ok) {
        const j = await r.json();
        if (!ie) ie = j?.inscricao_estadual || j?.ie || "";
        if (!im) im = j?.inscricao_municipal || j?.im || "";
      }
    } catch {
      /* ignora */
    }
  }

  return { ie: ie || "ISENTA", im: im || "ISENTA" };
}

export async function fetchCnpj(cnpj: string): Promise<CnpjData> {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) throw new Error("CNPJ deve ter 14 dígitos");

  // Tenta BrasilAPI primeiro
  let res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);

  // Se não encontrar na BrasilAPI (404), ou se a BrasilAPI falhar (timeout/erro), tenta ReceitaWS
  // Muitos CNPJs novos demoram a aparecer na BrasilAPI mas aparecem rápido no ReceitaWS
  if (!res.ok) {
    try {
      const resFallback = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`);
      if (resFallback.ok) {
        res = resFallback;
      }
    } catch (err) {
      console.error("Erro no fallback do CNPJ:", err);
    }
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        `CNPJ ${cnpj} não encontrado. Verifique se o número está correto ou se o registro é muito recente.`,
      );
    }
    if (res.status === 429) {
      throw new Error(
        "Muitas consultas em pouco tempo. Aguarde alguns segundos e tente novamente.",
      );
    }
    throw new Error(
      `Erro na consulta do CNPJ (${res.status}). Tente digitar os dados manualmente.`,
    );
  }
  const j = await res.json();

  // Normaliza campos entre BrasilAPI e ReceitaWS
  const razaoSocial = j.razao_social || j.nome || "";
  const nomeFantasia = j.nome_fantasia || j.fantasia || razaoSocial;
  const uf = j.uf ?? "";
  const municipio = j.municipio ?? "";
  const email = j.email ?? "";
  const telefone = j.telefone || [j.ddd_telefone_1, j.ddd_telefone_2].filter(Boolean).join(" / ");
  const logradouro = j.logradouro ?? "";
  const numero = j.numero ?? "";
  const bairro = j.bairro ?? "";
  const cep = j.cep ?? "";

  const { ie, im } = await fetchInscricoes(digits, uf);

  return {
    cnpj: formatCNPJ(digits),
    razaoSocial,
    nomeFantasia,
    email,
    telefone,
    cidade: municipio,
    estado: uf,
    logradouro,
    numero,
    bairro,
    cep,
    inscricaoEstadual: ie,
    inscricaoMunicipal: im,
    cnae:
      j.atividade_principal?.[0]?.text ||
      [j.cnae_fiscal, j.cnae_fiscal_descricao].filter(Boolean).join(" - "),
    situacaoCadastral: (j.descricao_situacao_cadastral || j.situacao_cadastral || j.situacao || "")
      .toString()
      .toUpperCase(),
  };
}
