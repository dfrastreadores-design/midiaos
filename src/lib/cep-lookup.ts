/**
 * Utilitário para busca ágil de endereço via CEP (ViaCEP) com cache em memória
 */

export interface EnderecoCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  ibge?: string;
  erro?: boolean;
}

const cepCache = new Map<string, EnderecoCepResponse>();

export async function consultarCep(cepRaw: string): Promise<EnderecoCepResponse | null> {
  const clean = cepRaw.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  if (cepCache.has(clean)) {
    return cepCache.get(clean)!;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.erro) {
      return null;
    }

    const endereco: EnderecoCepResponse = {
      cep: data.cep || clean,
      logradouro: data.logradouro || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      cidade: data.localidade || "",
      uf: data.uf || "",
      ibge: data.ibge,
    };

    cepCache.set(clean, endereco);
    return endereco;
  } catch (err) {
    console.warn("Erro ao consultar CEP:", err);
    return null;
  }
}
