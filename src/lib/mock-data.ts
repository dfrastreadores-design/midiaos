export type FunnelStage =
  | "prospeccao"
  | "negociacao"
  | "proposta"
  | "aprovacao"
  | "faturamento"
  | "finalizado";

export const stageLabels: Record<FunnelStage, string> = {
  prospeccao: "Prospecção",
  negociacao: "Negociação",
  proposta: "Proposta Enviada",
  aprovacao: "Aprovação",
  faturamento: "Faturamento",
  finalizado: "Finalizado",
};

export type Cliente = {
  id: string;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  cidade: string;
  estado: string;
  executivo: string;
  status: "Ativo" | "Inativo" | "Prospect";
  valorTotal: number;
  agenciaId?: string;
};

export type Agencia = {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  email: string;
  comissao: number;
  clientesAtivos: number;
};

export type ProdutoTipo = "VT" | "Merchan" | "Insert" | "Patrocínio" | "Projeto Especial";

export type Produto = {
  id: string;
  nome: string;
  tipo: ProdutoTipo;
  programa: string;
  faixa: string;
  duracao: string;
  ativo: boolean;
};

export type PI = {
  id: string;
  numero: string;
  cliente: string;
  agencia: string;
  produto: ProdutoTipo;
  programa: string;
  campanha: string;
  periodo: string;
  insercoes: number;
  valorTabela: number;
  desconto: number;
  valorNegociado: number;
  status: "Rascunho" | "Enviado" | "Aprovado" | "Faturado";
  vencimento: string;
};

export type Proposta = {
  id: string;
  numero: string;
  cliente: string;
  campanha: string;
  valor: number;
  comissao: number;
  margem: number;
  status: "Rascunho" | "Enviada" | "Aprovada" | "Recusada";
  criadaEm: string;
};

export type Negocio = {
  id: string;
  cliente: string;
  campanha: string;
  valor: number;
  executivo: string;
  stage: FunnelStage;
  proximoPasso: string;
};

export const executivos = ["Ana Carvalho", "Bruno Tavares", "Carla Mendes", "Diego Ramos"];

export const clientes: Cliente[] = [
  {
    id: "C001",
    nome: "Banco Solaris",
    razaoSocial: "Solaris S.A.",
    cnpj: "12.345.678/0001-90",
    cidade: "São Paulo",
    estado: "SP",
    executivo: "Ana Carvalho",
    status: "Ativo",
    valorTotal: 480000,
  },
  {
    id: "C002",
    nome: "AutoMax Veículos",
    razaoSocial: "AutoMax Comércio Ltda",
    cnpj: "23.456.789/0001-01",
    cidade: "Belo Horizonte",
    estado: "MG",
    executivo: "Bruno Tavares",
    status: "Ativo",
    valorTotal: 220000,
  },
  {
    id: "C003",
    nome: "Verde Supermercados",
    razaoSocial: "Verde Mercados S.A.",
    cnpj: "34.567.890/0001-12",
    cidade: "Curitiba",
    estado: "PR",
    executivo: "Carla Mendes",
    status: "Prospect",
    valorTotal: 0,
  },
  {
    id: "C004",
    nome: "Farma+",
    razaoSocial: "Farma Mais Drogarias Ltda",
    cnpj: "45.678.901/0001-23",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    executivo: "Diego Ramos",
    status: "Ativo",
    valorTotal: 95000,
  },
  {
    id: "C005",
    nome: "ConstruBem",
    razaoSocial: "ConstruBem Materiais",
    cnpj: "56.789.012/0001-34",
    cidade: "Porto Alegre",
    estado: "RS",
    executivo: "Ana Carvalho",
    status: "Inativo",
    valorTotal: 30000,
  },
];

export const agencias: Agencia[] = [
  {
    id: "A001",
    nome: "Pulse Comunicação",
    cnpj: "11.222.333/0001-44",
    contato: "Mariana Silva",
    email: "mariana@pulse.com",
    comissao: 20,
    clientesAtivos: 12,
  },
  {
    id: "A002",
    nome: "Norte Sul Propaganda",
    cnpj: "22.333.444/0001-55",
    contato: "Roberto Lima",
    email: "roberto@nortesul.com",
    comissao: 15,
    clientesAtivos: 8,
  },
  {
    id: "A003",
    nome: "Studio K",
    cnpj: "33.444.555/0001-66",
    contato: "Camila Reis",
    email: "camila@studiok.com",
    comissao: 18,
    clientesAtivos: 5,
  },
];

export const produtos: Produto[] = [
  {
    id: "PR001",
    nome: "VT 30s — Jornal da Noite",
    tipo: "VT",
    programa: "Jornal da Noite",
    faixa: "Nobre (20h-22h)",
    duracao: "30s",
    ativo: true,
  },
  {
    id: "PR002",
    nome: "VT 15s — Programa Manhã",
    tipo: "VT",
    programa: "Programa Manhã",
    faixa: "Manhã (07h-10h)",
    duracao: "15s",
    ativo: true,
  },
  {
    id: "PR003",
    nome: "Merchan — Bom Dia Cidade",
    tipo: "Merchan",
    programa: "Bom Dia Cidade",
    faixa: "Manhã (06h-08h)",
    duracao: "60s",
    ativo: true,
  },
  {
    id: "PR004",
    nome: "Insert — Esporte Total",
    tipo: "Insert",
    programa: "Esporte Total",
    faixa: "Tarde (12h-14h)",
    duracao: "10s",
    ativo: true,
  },
  {
    id: "PR005",
    nome: "Patrocínio — Novela das 21h",
    tipo: "Patrocínio",
    programa: "Novela das 21h",
    faixa: "Nobre (21h-22h)",
    duracao: "Cota mensal",
    ativo: true,
  },
  {
    id: "PR006",
    nome: "Projeto Especial — Verão na TV",
    tipo: "Projeto Especial",
    programa: "Especial Verão",
    faixa: "Multi-faixa",
    duracao: "Customizado",
    ativo: true,
  },
];

export const pis: PI[] = [
  {
    id: "PI001",
    numero: "PI-2026-0142",
    cliente: "Banco Solaris",
    agencia: "Pulse Comunicação",
    produto: "VT",
    programa: "Jornal da Noite",
    campanha: "Conta Digital 2026",
    periodo: "01/05 a 31/05",
    insercoes: 30,
    valorTabela: 320000,
    desconto: 25,
    valorNegociado: 240000,
    status: "Aprovado",
    vencimento: "30/06/2026",
  },
  {
    id: "PI002",
    numero: "PI-2026-0143",
    cliente: "AutoMax Veículos",
    agencia: "Norte Sul Propaganda",
    produto: "Merchan",
    programa: "Bom Dia Cidade",
    campanha: "Lançamento SUV",
    periodo: "10/05 a 10/06",
    insercoes: 12,
    valorTabela: 90000,
    desconto: 15,
    valorNegociado: 76500,
    status: "Faturado",
    vencimento: "20/06/2026",
  },
  {
    id: "PI003",
    numero: "PI-2026-0144",
    cliente: "Farma+",
    agencia: "Studio K",
    produto: "Insert",
    programa: "Esporte Total",
    campanha: "Black Saúde",
    periodo: "15/05 a 30/05",
    insercoes: 24,
    valorTabela: 45000,
    desconto: 10,
    valorNegociado: 40500,
    status: "Enviado",
    vencimento: "15/06/2026",
  },
  {
    id: "PI004",
    numero: "PI-2026-0145",
    cliente: "Verde Supermercados",
    agencia: "Pulse Comunicação",
    produto: "Patrocínio",
    programa: "Novela das 21h",
    campanha: "Inauguração",
    periodo: "20/05 a 20/06",
    insercoes: 1,
    valorTabela: 120000,
    desconto: 20,
    valorNegociado: 96000,
    status: "Rascunho",
    vencimento: "30/07/2026",
  },
];

export const propostas: Proposta[] = [
  {
    id: "P001",
    numero: "PROP-2026-201",
    cliente: "Banco Solaris",
    campanha: "Conta Digital 2026",
    valor: 240000,
    comissao: 48000,
    margem: 32,
    status: "Aprovada",
    criadaEm: "02/05/2026",
  },
  {
    id: "P002",
    numero: "PROP-2026-202",
    cliente: "AutoMax Veículos",
    campanha: "Lançamento SUV",
    valor: 76500,
    comissao: 11475,
    margem: 28,
    status: "Aprovada",
    criadaEm: "04/05/2026",
  },
  {
    id: "P003",
    numero: "PROP-2026-203",
    cliente: "Verde Supermercados",
    campanha: "Inauguração",
    valor: 96000,
    comissao: 19200,
    margem: 24,
    status: "Enviada",
    criadaEm: "08/05/2026",
  },
  {
    id: "P004",
    numero: "PROP-2026-204",
    cliente: "ConstruBem",
    campanha: "Reforma Total",
    valor: 30000,
    comissao: 4500,
    margem: 18,
    status: "Rascunho",
    criadaEm: "11/05/2026",
  },
];

export const negocios: Negocio[] = [
  {
    id: "N1",
    cliente: "Verde Supermercados",
    campanha: "Inauguração",
    valor: 96000,
    executivo: "Carla Mendes",
    stage: "prospeccao",
    proximoPasso: "Reunião 16/05",
  },
  {
    id: "N2",
    cliente: "ConstruBem",
    campanha: "Reforma Total",
    valor: 30000,
    executivo: "Ana Carvalho",
    stage: "negociacao",
    proximoPasso: "Ajuste de escopo",
  },
  {
    id: "N3",
    cliente: "Farma+",
    campanha: "Black Saúde",
    valor: 40500,
    executivo: "Diego Ramos",
    stage: "proposta",
    proximoPasso: "Aguardar retorno",
  },
  {
    id: "N4",
    cliente: "AutoMax Veículos",
    campanha: "Lançamento SUV",
    valor: 76500,
    executivo: "Bruno Tavares",
    stage: "aprovacao",
    proximoPasso: "Assinatura",
  },
  {
    id: "N5",
    cliente: "Banco Solaris",
    campanha: "Conta Digital",
    valor: 240000,
    executivo: "Ana Carvalho",
    stage: "faturamento",
    proximoPasso: "Emitir NF",
  },
  {
    id: "N6",
    cliente: "Drogaria Bem",
    campanha: "Vitaminas",
    valor: 18000,
    executivo: "Diego Ramos",
    stage: "finalizado",
    proximoPasso: "Renovação Q3",
  },
];

export const tabelaPrecos = [
  {
    produto: "VT 30s — Horário Nobre",
    programa: "Jornal da Noite",
    formato: "30s",
    valorUnit: 12000,
  },
  {
    produto: "VT 15s — Horário Nobre",
    programa: "Jornal da Noite",
    formato: "15s",
    valorUnit: 7500,
  },
  { produto: "VT 30s — Manhã", programa: "Programa Manhã", formato: "30s", valorUnit: 4800 },
  { produto: "Merchan ao vivo", programa: "Bom Dia Cidade", formato: "60s", valorUnit: 6500 },
  { produto: "Insert de marca", programa: "Esporte Total", formato: "10s", valorUnit: 2200 },
  {
    produto: "Patrocínio (cota mensal)",
    programa: "Novela das 21h",
    formato: "Cota",
    valorUnit: 96000,
  },
  {
    produto: "Projeto Especial",
    programa: "Sob demanda",
    formato: "Customizado",
    valorUnit: 150000,
  },
];

export const faturamentoMensal = [
  { mes: "Jan", valor: 280000, meta: 300000 },
  { mes: "Fev", valor: 320000, meta: 300000 },
  { mes: "Mar", valor: 295000, meta: 320000 },
  { mes: "Abr", valor: 410000, meta: 350000 },
  { mes: "Mai", valor: 480000, meta: 400000 },
  { mes: "Jun", valor: 520000, meta: 450000 },
];

export const desempenhoExecutivos = [
  { nome: "Ana Carvalho", vendas: 720000, deals: 14 },
  { nome: "Bruno Tavares", vendas: 320000, deals: 9 },
  { nome: "Carla Mendes", vendas: 196000, deals: 6 },
  { nome: "Diego Ramos", vendas: 158500, deals: 7 },
];

export const eventosCalendario = [
  { data: "16/05", titulo: "Reunião Verde Supermercados", tipo: "Reunião" },
  { data: "18/05", titulo: "Início campanha Banco Solaris", tipo: "Campanha" },
  { data: "20/05", titulo: "Vencimento PI-2026-0143", tipo: "Financeiro" },
  { data: "22/05", titulo: "Apresentação proposta Farma+", tipo: "Proposta" },
  { data: "30/05", titulo: "Fim campanha Conta Digital", tipo: "Campanha" },
];

export const notificacoes = [
  { id: 1, tipo: "warning", texto: "PI-2026-0143 vence em 5 dias", tempo: "há 1h" },
  { id: 2, tipo: "info", texto: "Nova proposta aprovada — Banco Solaris", tempo: "há 3h" },
  { id: 3, tipo: "warning", texto: "Follow-up pendente: Verde Supermercados", tempo: "há 1d" },
  { id: 4, tipo: "success", texto: "Faturamento de Maio bateu meta", tempo: "há 2d" },
];

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
