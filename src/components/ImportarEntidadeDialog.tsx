import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { listClientes, upsertCliente } from "@/lib/clientes.functions";
import { importAgenciasBulk, listAgencias, upsertAgencia } from "@/lib/agencias.functions";
import { listExecutivos } from "@/lib/atendimento.functions";
import { onlyDigits, fetchCnpj } from "@/lib/cnpj";

type Tipo = "cliente" | "agencia";

const COLUNAS_BASE = [
  "razao_social",
  "nome_fantasia",
  "cnpj",
  "inscricao_estadual",
  "inscricao_municipal",
  "cnae",
  "situacao_cadastral",
  "endereco",
  "cidade",
  "uf",
  "cep",
  "segmento",
  "website",
  "instagram",
  "linkedin",
  "facebook",
  "nome_contato",
  "cargo_contato",
  "email_contato",
  "telefone_contato",
  "data_aniversario",
  "atendimento",
  "observacao",
] as const;

const colunasFor = (tipo: Tipo) =>
  tipo === "cliente" ? ([...COLUNAS_BASE, "agencia_cnpj"] as const) : COLUNAS_BASE;

type Col = (typeof COLUNAS_BASE)[number] | "agencia_cnpj";
type ContatoExtra = {
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  aniversario: string;
};
type Raw = Partial<Record<Col, string>> & { extra_contatos?: ContatoExtra[] };

// Mapeia cabeçalhos da planilha (normalizados) para a coluna canônica.
const HEADER_ALIASES: Record<string, Col> = {
  razao_social: "razao_social",
  "razao social": "razao_social",
  "razão social": "razao_social",
  agencia: "razao_social",
  agência: "razao_social",
  cliente: "razao_social",
  empresa: "razao_social",
  nome_fantasia: "nome_fantasia",
  "nome fantasia": "nome_fantasia",
  fantasia: "nome_fantasia",
  cnpj: "cnpj",
  inscricao_estadual: "inscricao_estadual",
  "inscricao estadual": "inscricao_estadual",
  "inscrição estadual": "inscricao_estadual",
  ie: "inscricao_estadual",
  inscricao_municipal: "inscricao_municipal",
  "inscricao municipal": "inscricao_municipal",
  "inscrição municipal": "inscricao_municipal",
  im: "inscricao_municipal",
  cnae: "cnae",
  "cnae principal": "cnae",
  atividade: "cnae",
  situacao_cadastral: "situacao_cadastral",
  "situacao cadastral": "situacao_cadastral",
  "situação cadastral": "situacao_cadastral",
  situacao: "situacao_cadastral",
  endereco: "endereco",
  endereço: "endereco",
  "endereco completo": "endereco",
  "endereço completo": "endereco",
  logradouro: "endereco",
  cidade: "cidade",
  municipio: "cidade",
  município: "cidade",
  uf: "uf",
  estado: "uf",
  cep: "cep",
  segmento: "segmento",
  ramo: "segmento",
  website: "website",
  site: "website",
  url: "website",
  instagram: "instagram",
  insta: "instagram",
  linkedin: "linkedin",
  facebook: "facebook",
  face: "facebook",
  nome_contato: "nome_contato",
  "nome contato": "nome_contato",
  "nome completo": "nome_contato",
  contato: "nome_contato",
  nome: "nome_contato",
  cargo_contato: "cargo_contato",
  cargo: "cargo_contato",
  email_contato: "email_contato",
  email: "email_contato",
  "e-mail": "email_contato",
  "e mail": "email_contato",
  telefone_contato: "telefone_contato",
  telefone: "telefone_contato",
  "telefone fixo / celular": "telefone_contato",
  "telefone fixo": "telefone_contato",
  celular: "telefone_contato",
  fone: "telefone_contato",
  whatsapp: "telefone_contato",
  data_aniversario: "data_aniversario",
  "data aniversario": "data_aniversario",
  "data de aniversario": "data_aniversario",
  "data de aniversário": "data_aniversario",
  aniversario: "data_aniversario",
  aniversário: "data_aniversario",
  aniv: "data_aniversario",
  "aniv.": "data_aniversario",
  nascimento: "data_aniversario",
  atendimento: "atendimento",
  executivo: "atendimento",
  atendente: "atendimento",
  agencia_cnpj: "agencia_cnpj",
  "cnpj agencia": "agencia_cnpj",
  "cnpj agência": "agencia_cnpj",
  "cnpj da agencia": "agencia_cnpj",
  observacao: "observacao",
  observação: "observacao",
  obs: "observacao",
  observacoes: "observacao",
  observações: "observacao",
  "principais clientes": "observacao",
  clientes: "observacao",
  notas: "observacao",
};

const normalizeHeader = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cellValue = (ws: XLSX.WorkSheet, row: number, col: number) =>
  ws[XLSX.utils.encode_cell({ r: row, c: col })]?.v;

const isFilled = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

function parseDataAniv(input: unknown): string | null {
  if (input === null || input === undefined || input === "") return null;
  if (input instanceof Date && !isNaN(input.getTime())) {
    return `${String(input.getDate()).padStart(2, "0")}/${String(input.getMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof input === "number") {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(input) : null;
    if (d) return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}`;
  }
  const s = String(input).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-]\d{2,4}/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}`;
  return null;
}

type ContatoBanco = {
  nome?: string;
  cargo?: string;
  funcao?: string;
  email?: string;
  telefone?: string;
  aniversario?: string;
};
type Existing = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  observacao?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  cnae?: string | null;
  situacao_cadastral?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  data_aniversario?: string | null;
  segmento?: string | null;
  executivo_id?: string | null;
  contatos?: ContatoBanco[] | null;
};

type Action = "create" | "update" | "skip";
type Row = {
  raw: Raw;
  errors: string[];
  existing: Existing | null;
  action: Action;
  buscando?: boolean;
  fuzzy?: string[];
};

const normNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

// Mescla payload novo (planilha) com registro existente: mantém o que já existe
// e adiciona apenas campos vazios. Concatena contatos novos (por nome) sem duplicar.
function mergeWithExisting(novo: ReturnType<typeof buildImportPayload>, atual: Existing) {
  const out: Record<string, unknown> = { ...novo };
  const camposPreservar: (keyof Existing)[] = [
    "razao_social",
    "nome_fantasia",
    "endereco",
    "cidade",
    "uf",
    "cep",
    "observacao",
    "inscricao_estadual",
    "inscricao_municipal",
    "cnae",
    "situacao_cadastral",
    "website",
    "instagram",
    "linkedin",
    "facebook",
    "data_aniversario",
  ];
  for (const k of camposPreservar) {
    const atualVal = atual[k];
    if (atualVal !== null && atualVal !== undefined && String(atualVal).trim() !== "") {
      out[k as string] = atualVal;
    }
  }
  if (atual.executivo_id && !novo.executivo_id) out.executivo_id = atual.executivo_id;

  const existentes = Array.isArray(atual.contatos) ? atual.contatos : [];
  const nomes = new Set(existentes.map((c) => normNome(c?.nome ?? "")).filter(Boolean));
  const novosUnicos = novo.contatos.filter((c) => {
    const n = normNome(c.nome);
    if (!n || nomes.has(n)) return false;
    nomes.add(n);
    return true;
  });
  out.contatos = [...existentes, ...novosUnicos];
  return out as ReturnType<typeof buildImportPayload> & { segmento?: string | null };
}

function buildImportPayload(r: Raw, executivoId: string | null) {
  const principal = r.nome_contato
    ? [
        {
          nome: r.nome_contato,
          cargo: r.cargo_contato || "",
          funcao: "",
          email: r.email_contato || "",
          telefone: r.telefone_contato || "",
          aniversario: r.data_aniversario || "",
        },
      ]
    : [];
  const extras = (r.extra_contatos ?? []).map((c) => ({
    nome: c.nome,
    cargo: c.cargo,
    funcao: "",
    email: c.email,
    telefone: c.telefone,
    aniversario: c.aniversario,
  }));

  return {
    razao_social: r.razao_social!,
    nome_fantasia: r.nome_fantasia || null,
    cnpj: r.cnpj ? onlyDigits(r.cnpj) : null,
    endereco: r.endereco || null,
    cidade: r.cidade || null,
    uf: r.uf ? r.uf.toUpperCase() : null,
    cep: r.cep || null,
    observacao: r.observacao || null,
    executivo_id: executivoId,
    inscricao_estadual: r.inscricao_estadual || null,
    inscricao_municipal: r.inscricao_municipal || null,
    cnae: r.cnae || null,
    situacao_cadastral: r.situacao_cadastral || null,
    website: r.website || null,
    instagram: r.instagram || null,
    linkedin: r.linkedin || null,
    facebook: r.facebook || null,
    data_aniversario: r.data_aniversario || null,
    contatos: [...principal, ...extras],
  };
}

export function ImportarEntidadeDialog({
  open,
  onOpenChange,
  tipo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: Tipo;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const colunas = colunasFor(tipo);
  const queryKey = tipo === "cliente" ? "clientes" : "agencias";
  const titulo = tipo === "cliente" ? "clientes" : "agências";

  const { data: existentes = [] } = useQuery({
    queryKey: [queryKey],
    queryFn: () =>
      (tipo === "cliente" ? listClientes() : listAgencias()) as unknown as Promise<Existing[]>,
    enabled: open,
  });

  const { data: executivos = [] } = useQuery({
    queryKey: ["executivos-atendimento"],
    queryFn: () =>
      listExecutivos() as unknown as Promise<{ id: string; nome: string; email: string }[]>,
    enabled: open,
  });

  const resolveExecId = (nome: string | undefined): string | null => {
    const n = (nome ?? "").trim().toLowerCase();
    if (!n) return null;
    const m = executivos.find((e) => e.nome?.toLowerCase() === n || e.email?.toLowerCase() === n);
    return m?.id ?? null;
  };

  const mapaCnpj = useMemo(() => {
    const m = new Map<string, Existing>();
    for (const c of existentes) {
      const d = onlyDigits(c.cnpj || "");
      if (d) m.set(d, c);
    }
    return m;
  }, [existentes]);

  const mapaRazao = useMemo(() => {
    const m = new Map<string, Existing>();
    for (const c of existentes) {
      const k = normNome(c.razao_social || "");
      if (k && !m.has(k)) m.set(k, c);
      const f = normNome(c.nome_fantasia || "");
      if (f && !m.has(f)) m.set(f, c);
    }
    return m;
  }, [existentes]);

  const baixarModelo = () => {
    const exemplo: Record<string, string> = {
      razao_social: "Empresa Exemplo LTDA",
      nome_fantasia: "Empresa Exemplo",
      cnpj: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      cnae: "",
      situacao_cadastral: "",
      endereco: "Rua Exemplo, 100",
      cidade: "Brasília",
      uf: "DF",
      cep: "70000-000",
      segmento: "Varejo",
      website: "https://exemplo.com.br",
      instagram: "@exemplo",
      linkedin: "",
      facebook: "",
      nome_contato: "João Silva",
      cargo_contato: "Diretor de Marketing",
      email_contato: "joao@exemplo.com",
      telefone_contato: "(61) 99999-9999",
      data_aniversario: "15/03",
      atendimento: "Nome do Executivo",
      observacao: "",
      agencia_cnpj: "",
    };
    const ws = XLSX.utils.aoa_to_sheet([[...colunas], colunas.map((c) => exemplo[c] ?? "")]);
    ws["!cols"] = colunas.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo === "cliente" ? "Clientes" : "Agencias");
    XLSX.writeFile(wb, `modelo-importacao-${titulo}.xlsx`);
  };

  // Para cruzamento sem CNPJ, normaliza valores para comparação
  const norm = (v: unknown) => normNome(String(v ?? "")).replace(/[^a-z0-9@.]/g, "");
  const normTel = (v: unknown) => onlyDigits(String(v ?? ""));

  // Cruza linha sem CNPJ contra todos os existentes. Retorna match e quais campos bateram.
  const findFuzzyMatch = (r: Raw): { match: Existing | null; campos: string[] } => {
    const checks: {
      campo: string;
      val: string;
      getExist: (e: Existing & Record<string, unknown>) => string;
    }[] = [
      { campo: "razao_social", val: norm(r.razao_social), getExist: (e) => norm(e.razao_social) },
      {
        campo: "nome_fantasia",
        val: norm(r.nome_fantasia),
        getExist: (e) => norm(e.nome_fantasia),
      },
      { campo: "endereco", val: norm(r.endereco), getExist: (e) => norm(e.endereco) },
      {
        campo: "cep",
        val: onlyDigits(r.cep ?? ""),
        getExist: (e) => onlyDigits(String(e.cep ?? "")),
      },
      {
        campo: "cidade+uf",
        val: norm((r.cidade ?? "") + (r.uf ?? "")),
        getExist: (e) => norm(String(e.cidade ?? "") + String(e.uf ?? "")),
      },
      { campo: "website", val: norm(r.website), getExist: (e) => norm(e.website) },
      { campo: "instagram", val: norm(r.instagram), getExist: (e) => norm(e.instagram) },
      {
        campo: "email_contato",
        val: norm(r.email_contato),
        getExist: (e) => {
          const cts = Array.isArray(e.contatos) ? (e.contatos as ContatoBanco[]) : [];
          return cts.map((c) => norm(c?.email)).find((x) => x) ?? "";
        },
      },
      {
        campo: "telefone_contato",
        val: normTel(r.telefone_contato),
        getExist: (e) => {
          const cts = Array.isArray(e.contatos) ? (e.contatos as ContatoBanco[]) : [];
          return cts.map((c) => normTel(c?.telefone)).find((x) => x) ?? "";
        },
      },
    ];
    let best: { match: Existing; campos: string[] } | null = null;
    for (const ex of existentes) {
      const exAny = ex as Existing & Record<string, unknown>;
      const campos: string[] = [];
      for (const c of checks) {
        if (!c.val) continue;
        const ev = c.getExist(exAny);
        if (ev && ev === c.val) campos.push(c.campo);
      }
      if (campos.length >= 2 && (!best || campos.length > best.campos.length)) {
        best = { match: ex, campos };
      }
    }
    return best ?? { match: null, campos: [] };
  };

  const validate = (r: Raw): { errors: string[]; existing: Existing | null; fuzzy?: string[] } => {
    const errors: string[] = [];
    if (!r.razao_social) errors.push("razao_social obrigatória");
    if (r.uf && r.uf.length !== 2) errors.push("UF deve ter 2 letras");
    const cnpjDigits = onlyDigits(r.cnpj || "");
    if (r.cnpj && cnpjDigits.length !== 14) errors.push("CNPJ inválido");
    let existing = cnpjDigits ? (mapaCnpj.get(cnpjDigits) ?? null) : null;
    let fuzzy: string[] | undefined;
    if (!existing && !cnpjDigits) {
      // 1) tenta match exato por razão social / nome fantasia normalizado
      const rk = normNome(r.razao_social || "");
      const fk = normNome(r.nome_fantasia || "");
      existing = (rk && mapaRazao.get(rk)) || (fk && mapaRazao.get(fk)) || null;
      // 2) fallback: cruzamento por múltiplos campos
      if (!existing) {
        const { match, campos } = findFuzzyMatch(r);
        if (match) {
          existing = match;
          fuzzy = campos;
        }
      }
    }
    return { errors, existing, fuzzy };
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const usedCells = Object.keys(ws).filter((key) => key[0] !== "!" && isFilled(ws[key]?.v));
    const headerCells = usedCells
      .map((key) => ({
        key,
        pos: XLSX.utils.decode_cell(key),
        col: HEADER_ALIASES[normalizeHeader(ws[key]?.v)] ?? null,
      }))
      .filter((cell) => cell.col);

    if (!headerCells.length) {
      setRows([]);
      return;
    }

    const headerRowIndex = Math.min(...headerCells.map((cell) => cell.pos.r));
    const lastColIndex = Math.max(
      ...headerCells.filter((cell) => cell.pos.r === headerRowIndex).map((cell) => cell.pos.c),
    );
    const headerRow = Array.from({ length: lastColIndex + 1 }, (_, c) =>
      cellValue(ws, headerRowIndex, c),
    );
    const colMap: (Col | null)[] = headerRow.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);
    const mappedCols = new Set(
      colMap.map((col, index) => (col ? index : -1)).filter((index) => index >= 0),
    );
    const dataRows = usedCells
      .map((key) => XLSX.utils.decode_cell(key))
      .filter((pos) => pos.r > headerRowIndex && mappedCols.has(pos.c))
      .map((pos) => pos.r);
    const lastDataRowIndex = dataRows.length ? Math.max(...dataRows) : headerRowIndex;

    // Linhas brutas com colunas canônicas
    const linhas: Raw[] = [];
    for (let i = headerRowIndex + 1; i <= lastDataRowIndex; i++) {
      const r: Raw = {};
      let temAlgo = false;
      for (let c = 0; c < colMap.length; c++) {
        const col = colMap[c];
        if (!col) continue;
        const val = cellValue(ws, i, c);
        if (!isFilled(val)) continue;
        if (col === "data_aniversario") {
          const p = parseDataAniv(val);
          if (p) {
            r.data_aniversario = p;
            temAlgo = true;
          }
        } else {
          const s = String(val).trim();
          if (s) {
            r[col] = s;
            temAlgo = true;
          }
        }
      }
      if (temAlgo) linhas.push(r);
    }

    // Agrupa: linhas sem razao_social viram contatos adicionais da linha anterior
    const agrupadas: Raw[] = [];
    for (const r of linhas) {
      if (!r.razao_social && agrupadas.length > 0 && r.nome_contato) {
        const prev = agrupadas[agrupadas.length - 1];
        prev.extra_contatos = prev.extra_contatos || [];
        prev.extra_contatos.push({
          nome: r.nome_contato || "",
          cargo: r.cargo_contato || "",
          email: r.email_contato || "",
          telefone: r.telefone_contato || "",
          aniversario: r.data_aniversario || "",
        });
        // Preenche endereço/cep/atendimento do "pai" se faltar
        if (!prev.endereco && r.endereco) prev.endereco = r.endereco;
        if (!prev.cep && r.cep) prev.cep = r.cep;
        if (!prev.atendimento && r.atendimento) prev.atendimento = r.atendimento;
        if (!prev.observacao && r.observacao) prev.observacao = r.observacao;
      } else {
        agrupadas.push(r);
      }
    }

    // Dedup intra-planilha: linhas com mesmo CNPJ ou mesma razão social/fantasia normalizada
    // são fundidas em uma única entrada (contatos viram extras, campos vazios são preenchidos).
    const dedupKey = (r: Raw) => {
      const c = onlyDigits(r.cnpj || "");
      if (c.length === 14) return `cnpj:${c}`;
      const rs = normNome(r.razao_social || "");
      if (rs) return `rs:${rs}`;
      const nf = normNome(r.nome_fantasia || "");
      if (nf) return `nf:${nf}`;
      return null;
    };
    const seen = new Map<string, Raw>();
    const dedupedDuplicados: number[] = [];
    const dedupadas: Raw[] = [];
    for (const r of agrupadas) {
      const k = dedupKey(r);
      if (k && seen.has(k)) {
        dedupedDuplicados.push(1);
        const prev = seen.get(k)!;
        // preenche campos vazios
        for (const col of colunas) {
          if (!prev[col] && r[col]) prev[col] = r[col];
        }
        // contato principal vira extra se diferente
        if (r.nome_contato) {
          prev.extra_contatos = prev.extra_contatos || [];
          const existeNome =
            prev.extra_contatos.some((c) => normNome(c.nome) === normNome(r.nome_contato || "")) ||
            normNome(prev.nome_contato || "") === normNome(r.nome_contato || "");
          if (!existeNome) {
            prev.extra_contatos.push({
              nome: r.nome_contato || "",
              cargo: r.cargo_contato || "",
              email: r.email_contato || "",
              telefone: r.telefone_contato || "",
              aniversario: r.data_aniversario || "",
            });
          }
        }
        if (r.extra_contatos?.length) {
          prev.extra_contatos = prev.extra_contatos || [];
          for (const c of r.extra_contatos) {
            const n = normNome(c.nome);
            if (n && !prev.extra_contatos.some((x) => normNome(x.nome) === n)) {
              prev.extra_contatos.push(c);
            }
          }
        }
        continue;
      }
      if (k) seen.set(k, r);
      dedupadas.push(r);
    }
    if (dedupedDuplicados.length) {
      toast.info(`${dedupedDuplicados.length} linha(s) duplicada(s) na planilha foram fundidas`);
    }

    const parsed: Row[] = dedupadas.map((r) => {
      const { errors, existing, fuzzy } = validate(r);
      // Sem CNPJ + match por 2+ campos => não importa por padrão (apenas notifica).
      const action: Action = existing ? (fuzzy ? "skip" : "update") : "create";
      return { raw: r, errors, existing, action, buscando: false, fuzzy };
    });
    setRows(parsed);
    // Busca CNPJ na Receita agora é sob demanda — clique no ícone de lupa em cada linha.
    // Auto-fetch foi removido porque travava o navegador em planilhas grandes (rate-limit + N re-renders).
  };

  const setAction = (i: number, action: Action) => {
    setRows((cur) => cur?.map((r, idx) => (idx === i ? { ...r, action } : r)) ?? null);
  };

  const buscarCnpj = async (i: number, notify = true) => {
    let cnpj: string | undefined;
    setRows((cur) => {
      if (!cur) return cur;
      cnpj = cur[i]?.raw.cnpj;
      return cur.map((r, idx) => (idx === i ? { ...r, buscando: true } : r));
    });
    if (!cnpj) {
      setRows((cur) => cur?.map((r, idx) => (idx === i ? { ...r, buscando: false } : r)) ?? null);
      return;
    }
    try {
      const d = await fetchCnpj(cnpj);
      setRows(
        (cur) =>
          cur?.map((r, idx) => {
            if (idx !== i) return r;
            const merged: Raw = { ...r.raw };
            const fill = (k: Col, v: string) => {
              if (!merged[k] && v) merged[k] = v;
            };
            fill("razao_social", d.razaoSocial);
            fill("nome_fantasia", d.nomeFantasia);
            fill("cnpj", d.cnpj);
            fill("inscricao_estadual", d.inscricaoEstadual);
            fill("endereco", [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", "));
            fill("cidade", d.cidade);
            fill("uf", d.estado);
            fill("cep", d.cep);
            fill("email_contato", d.email);
            fill("telefone_contato", d.telefone);
            const v = validate(merged);
            const action: Action = v.existing ? (v.fuzzy ? "skip" : "update") : "create";
            return {
              ...r,
              raw: merged,
              errors: v.errors,
              existing: v.existing,
              fuzzy: v.fuzzy,
              action,
              buscando: false,
            };
          }) ?? null,
      );
      if (notify) toast.success("Dados do CNPJ carregados");
    } catch (e) {
      setRows((cur) => cur?.map((r, idx) => (idx === i ? { ...r, buscando: false } : r)) ?? null);
      if (notify) toast.error((e as Error).message);
    }
  };

  const stats = useMemo(() => {
    const r = rows ?? [];
    return {
      total: r.length,
      criar: r.filter((x) => x.action === "create" && x.errors.length === 0).length,
      atualizar: r.filter((x) => x.action === "update" && x.errors.length === 0).length,
      pular: r.filter((x) => x.action === "skip").length,
      erro: r.filter((x) => x.errors.length > 0).length,
    };
  }, [rows]);

  const buildPayload = (r: Raw) => {
    return buildImportPayload(r, resolveExecId(r.atendimento));
  };

  const importar = async () => {
    if (!rows) return;
    setImporting(true);
    let ok = 0,
      fail = 0;
    if (tipo === "agencia") {
      const agencias = rows
        .filter((row) => row.errors.length === 0 && row.action !== "skip")
        .map((row) => {
          const base = buildPayload(row.raw);
          if (row.action === "update" && row.existing) {
            return { ...mergeWithExisting(base, row.existing), id: row.existing.id };
          }
          return { ...base, id: undefined };
        });

      try {
        const result = await importAgenciasBulk({ data: { agencias } });
        ok = result.ok;
        fail = result.fail;
      } catch (e) {
        console.error("Falha importar agências", e);
        fail = agencias.length;
      }
      setImporting(false);
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.success(`${ok} importado(s)${fail ? `, ${fail} falha(s)` : ""}`);
      if (fail === 0) {
        setRows(null);
        setFileName("");
        onOpenChange(false);
      }
      return;
    }

    for (const row of rows) {
      if (row.errors.length > 0 || row.action === "skip") continue;
      const id = row.action === "update" ? row.existing?.id : undefined;
      const baseRaw = buildPayload(row.raw);
      const base =
        row.action === "update" && row.existing
          ? mergeWithExisting(baseRaw, row.existing)
          : baseRaw;
      try {
        if (tipo === "cliente") {
          const segmentoFinal =
            row.action === "update" && row.existing?.segmento
              ? row.existing.segmento
              : row.raw.segmento || null;
          await upsertCliente({
            data: { ...base, id, agencia_id: null, logo_url: null, segmento: segmentoFinal },
          });
        } else {
          await upsertAgencia({ data: { ...base, id } });
        }
        ok++;
      } catch (e) {
        console.error("Falha importar", row.raw.razao_social, e);
        fail++;
      }
    }
    setImporting(false);
    qc.invalidateQueries({ queryKey: [queryKey] });
    toast.success(`${ok} importado(s)${fail ? `, ${fail} falha(s)` : ""}`);
    if (fail === 0) {
      setRows(null);
      setFileName("");
      onOpenChange(false);
    }
  };

  const reset = () => {
    setRows(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar {titulo} de planilha</DialogTitle>
          <DialogDescription>
            Baixe o modelo, preencha e suba o arquivo. Você revisa cada linha antes de importar. O
            CNPJ não é obrigatório — quando preenchido, clique em <strong>Buscar</strong> para puxar
            os dados da Receita.
          </DialogDescription>
        </DialogHeader>

        {!rows && (
          <div className="space-y-4 py-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={baixarModelo}>
                <Download className="size-4 mr-2" /> Baixar modelo .xlsx
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload className="size-4 mr-2" /> Escolher planilha
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium flex items-center gap-2">
                <FileSpreadsheet className="size-4" />
                Colunas aceitas
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">{colunas.join(" · ")}</p>
              <p className="text-xs text-muted-foreground">
                Obrigatório apenas: <strong>razao_social</strong>.
              </p>
            </div>
          </div>
        )}

        {rows && (
          <div className="flex-1 overflow-auto space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{fileName}</span>
              <Badge variant="outline">{stats.total} linhas</Badge>
              <Badge className="bg-emerald-600">{stats.criar} criar</Badge>
              <Badge className="bg-amber-600">{stats.atualizar} atualizar</Badge>
              <Badge variant="secondary">{stats.pular} pular</Badge>
              {stats.erro > 0 && <Badge variant="destructive">{stats.erro} com erro</Badge>}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
                Trocar arquivo
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Razão social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow
                      key={i}
                      className={
                        r.errors.length ? "bg-destructive/5" : r.existing ? "bg-amber-500/5" : ""
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {r.raw.razao_social || <span className="text-destructive">(vazio)</span>}
                        </div>
                        {r.raw.nome_fantasia && (
                          <div className="text-xs text-muted-foreground">{r.raw.nome_fantasia}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <span>{r.raw.cnpj || "—"}</span>
                          {r.raw.cnpj && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6"
                              onClick={() => buscarCnpj(i)}
                              disabled={r.buscando}
                              title="Buscar dados na Receita"
                            >
                              {r.buscando ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Search className="size-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {[r.raw.cidade, r.raw.uf].filter(Boolean).join("/") || "—"}
                      </TableCell>
                      <TableCell>
                        {r.errors.length > 0 && (
                          <div className="text-xs text-destructive flex items-start gap-1">
                            <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                            <span>{r.errors.join("; ")}</span>
                          </div>
                        )}
                        {r.errors.length === 0 && r.existing && !r.fuzzy && (
                          <div className="text-xs text-amber-700 dark:text-amber-400">
                            CNPJ já existe:{" "}
                            <strong>{r.existing.nome_fantasia || r.existing.razao_social}</strong>
                          </div>
                        )}
                        {r.errors.length === 0 && r.existing && r.fuzzy && (
                          <div className="text-xs text-amber-700 dark:text-amber-400">
                            <div className="flex items-start gap-1">
                              <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                              <span>
                                Possível duplicata de{" "}
                                <strong>
                                  {r.existing.nome_fantasia || r.existing.razao_social}
                                </strong>{" "}
                                — {r.fuzzy.length} campo(s) iguais: {r.fuzzy.join(", ")}
                              </span>
                            </div>
                          </div>
                        )}
                        {r.errors.length === 0 && !r.existing && (
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Novo
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.action}
                          onValueChange={(v) => setAction(i, v as Action)}
                          disabled={r.errors.length > 0}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {!r.existing && <SelectItem value="create">Criar novo</SelectItem>}
                            {r.existing && (
                              <SelectItem value="update">Atualizar existente</SelectItem>
                            )}
                            {r.existing && <SelectItem value="create">Criar como novo</SelectItem>}
                            <SelectItem value="skip">Pular linha</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          {rows && (
            <Button onClick={importar} disabled={importing || stats.criar + stats.atualizar === 0}>
              {importing && <Loader2 className="size-4 mr-2 animate-spin" />}
              Importar {stats.criar + stats.atualizar} linha(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
