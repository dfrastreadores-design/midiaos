/**
 * TIPOS E DEFINIÇÕES PARA MODELOS DE PROPOSTA PERSONALIZADOS POR CLIENTE
 * Permite até 3 modelos em PDF por cliente com editor visual de campos dinâmicos
 */

export type ChaveBlocoProposta =
  | "valores"
  | "produtos"
  | "defesa"
  | "cliente"
  | "executivo"
  | "cronograma"
  | "assinaturas";

export interface CampoMapeadoProposta {
  id: string;
  chave: ChaveBlocoProposta;
  rotulo: string;
  descricao: string;
  pagina: number; // 1, 2, 3...
  posicao_x: number; // 0 a 100 (% horizontal)
  posicao_y: number; // 0 a 100 (% vertical)
  largura: number; // 20 a 100 (% da largura da folha)
  altura: number; // 10 a 60 (% da altura da folha)
  estilo: {
    tamanho_fonte: "xs" | "sm" | "base" | "lg" | "xl";
    cor_texto: string;
    cor_fundo?: string;
    alinhamento: "left" | "center" | "right";
    borda: boolean;
    destaque_cabecalho: boolean;
  };
  ativo: boolean;
  orientacao_impressao?: string;
}

export interface ModeloPropostaCliente {
  id: string;
  nome: string;
  descricao?: string;
  arquivo_url: string;
  arquivo_nome: string;
  tamanho_bytes?: number;
  total_paginas: number;
  criado_em: string;
  ativo: boolean;
  campos_mapeados: CampoMapeadoProposta[];
}

export const CAMPOS_PADRAO_PROPOSTA: Omit<CampoMapeadoProposta, "id">[] = [
  {
    chave: "cliente",
    rotulo: "Identificação do Anunciante / Cliente",
    descricao: "Razão social, CNPJ, contato, praça de veiculação e segmento",
    pagina: 1,
    posicao_x: 5,
    posicao_y: 12,
    largura: 90,
    altura: 14,
    estilo: {
      tamanho_fonte: "sm",
      cor_texto: "#1e293b",
      cor_fundo: "#f8fafc",
      alinhamento: "left",
      borda: true,
      destaque_cabecalho: true,
    },
    ativo: true,
    orientacao_impressao: "Exibir em destaque no topo após a capa institucional",
  },
  {
    chave: "defesa",
    rotulo: "Defesa da Proposta & Defesa de Veiculação",
    descricao: "Racional tático da escolha dos canais, audiência, IBOPE e justificativa de ROI",
    pagina: 1,
    posicao_x: 5,
    posicao_y: 28,
    largura: 90,
    altura: 28,
    estilo: {
      tamanho_fonte: "sm",
      cor_texto: "#0f172a",
      cor_fundo: "#ffffff",
      alinhamento: "left",
      borda: true,
      destaque_cabecalho: true,
    },
    ativo: true,
    orientacao_impressao: "Área central nobre para fundamentar a estratégia perante os diretores",
  },
  {
    chave: "produtos",
    rotulo: "Grade de Produtos & Veiculações",
    descricao: "Tabela com canais (TV, DOOH, Rádio), formatos, quantidade de inserções e período",
    pagina: 1,
    posicao_x: 5,
    posicao_y: 58,
    largura: 90,
    altura: 22,
    estilo: {
      tamanho_fonte: "xs",
      cor_texto: "#0f172a",
      cor_fundo: "#f1f5f9",
      alinhamento: "left",
      borda: true,
      destaque_cabecalho: true,
    },
    ativo: true,
    orientacao_impressao: "Tabela zebrada com detalhes dos veículos e formatos negociados",
  },
  {
    chave: "valores",
    rotulo: "Quadro de Valores & Condições Comerciais",
    descricao: "Valor bruto, imposto retido, valor líquido negociado e formas de pagamento",
    pagina: 1,
    posicao_x: 5,
    posicao_y: 82,
    largura: 45,
    altura: 14,
    estilo: {
      tamanho_fonte: "base",
      cor_texto: "#15803d",
      cor_fundo: "#f0fdf4",
      alinhamento: "left",
      borda: true,
      destaque_cabecalho: true,
    },
    ativo: true,
    orientacao_impressao: "Destaque financeiro com moeda R$ e detalhamento fiscal",
  },
  {
    chave: "assinaturas",
    rotulo: "Assinaturas & Validade da Proposta",
    descricao: "Campos para aprovação formal, carimbo de data, prazo de validade e notas",
    pagina: 1,
    posicao_x: 52,
    posicao_y: 82,
    largura: 43,
    altura: 14,
    estilo: {
      tamanho_fonte: "xs",
      cor_texto: "#475569",
      cor_fundo: "#ffffff",
      alinhamento: "center",
      borda: true,
      destaque_cabecalho: false,
    },
    ativo: true,
    orientacao_impressao: "Rodapé inferior para assinatura do anunciante e diretor comercial",
  },
];
