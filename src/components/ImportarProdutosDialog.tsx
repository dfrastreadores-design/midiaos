import { useMemo, useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, FileSpreadsheet, AlertTriangle, Loader2, Handshake, CheckCircle2, Building2, Percent } from "lucide-react";
import { toast } from "sonner";
import { importProdutosBulk } from "@/lib/produtos.functions";
import { listParceiros, type Parceiro } from "@/lib/parceiros.functions";
import { downloadModeloProdutosExcel } from "@/lib/exportar-modelo-produtos";

type Midia = "TV" | "Radio" | "DOOH";

type Linha = {
  nome: string;
  midia: Midia;
  tipo?: string | null;
  programa?: string | null;
  formato?: string | null;
  faixa?: string | null;
  duracao_segundos: number;
  insercoes_padrao: number;
  valor_unit: number;
  ativo: boolean;
  parceiro_id?: string | null;
  parceiro_cnpj?: string | null;
  parceiro_nome?: string | null;
  comissao_inquilino_pct?: number | null;
  observacao?: string | null;
  endereco_ponto?: string | null;
  cep?: string | null;
  quantidade_telas?: number | null;
  formato_tela?: string | null;
  resolucao?: string | null;
  fotos?: string[];
  erro?: string;
};

const COLUNAS = [
  "nome", "midia", "tipo", "programa", "formato", "faixa",
  "duracao_segundos", "insercoes_padrao", "valor_unit", "ativo",
  "parceiro_nome", "parceiro_cnpj", "comissao_inquilino_pct",
  "observacao", "endereco_ponto", "cep", "quantidade_telas", "formato_tela", "resolucao",
  "foto1", "foto2",
] as const;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

const ALIASES: Record<string, string> = {
  "nome": "nome", "produto": "nome", "descricao": "nome", "descricao do produto": "nome", "item": "nome", "titulo": "nome",
  "midia": "midia", "mídia": "midia", "veiculo": "midia", "tipo de midia": "midia", "canal": "midia",
  "tipo": "tipo", "categoria": "tipo", "segmento": "tipo",
  "programa": "programa", "programacao": "programa", "atracao": "programa", "circuito": "programa",
  "formato": "formato",
  "faixa": "faixa", "horario": "faixa", "faixa horaria": "faixa",
  "duracao_segundos": "duracao_segundos", "duracao": "duracao_segundos", "duracao (s)": "duracao_segundos",
  "segundos": "duracao_segundos", "tempo": "duracao_segundos", "duracao em segundos": "duracao_segundos",
  "insercoes_padrao": "insercoes_padrao", "insercoes": "insercoes_padrao", "qtd insercoes": "insercoes_padrao",
  "quantidade de insercoes": "insercoes_padrao", "spots": "insercoes_padrao", "exibicoes": "insercoes_padrao",
  "valor_unit": "valor_unit", "valor": "valor_unit", "valor unitario": "valor_unit", "preco": "valor_unit",
  "preco unitario": "valor_unit", "valor unit": "valor_unit", "valor unit.": "valor_unit", "tabela": "valor_unit",
  "ativo": "ativo", "status": "ativo", "situacao": "ativo",
  "parceiro_cnpj": "parceiro_cnpj", "cnpj_parceiro": "parceiro_cnpj", "cnpj do parceiro": "parceiro_cnpj", "cnpj parceiro": "parceiro_cnpj", "cnpj": "parceiro_cnpj",
  "parceiro_nome": "parceiro_nome", "nome_parceiro": "parceiro_nome", "nome do parceiro": "parceiro_nome", "parceiro": "parceiro_nome", "fornecedor": "parceiro_nome", "empresa_parceira": "parceiro_nome",
  "comissao_inquilino_pct": "comissao_inquilino_pct", "comissao": "comissao_inquilino_pct", "comissao_pct": "comissao_inquilino_pct", "% comissao": "comissao_inquilino_pct", "% comissão": "comissao_inquilino_pct", "comissao %": "comissao_inquilino_pct", "remuneracao": "comissao_inquilino_pct", "remuneração": "comissao_inquilino_pct", "comissao inquilino": "comissao_inquilino_pct", "comissao_inquilino": "comissao_inquilino_pct",
  "observacao": "observacao", "obs": "observacao", "observacoes": "observacao",
  "endereco_ponto": "endereco_ponto", "endereco": "endereco_ponto", "local": "endereco_ponto", "ponto": "endereco_ponto", "localizacao": "endereco_ponto",
  "cep": "cep", "cep_ponto": "cep", "codigo_postal": "cep", "cep do ponto": "cep",
  "quantidade_telas": "quantidade_telas", "telas": "quantidade_telas", "qtd telas": "quantidade_telas", "pontos": "quantidade_telas",
  "formato_tela": "formato_tela", "formato da tela": "formato_tela", "orientacao": "formato_tela",
  "resolucao": "resolucao",
  "foto1": "foto1", "foto 1": "foto1", "foto": "foto1", "imagem": "foto1", "imagem 1": "foto1", "url foto": "foto1", "foto principal": "foto1", "link foto": "foto1",
  "foto2": "foto2", "foto 2": "foto2", "imagem 2": "foto2", "foto secundaria": "foto2", "link foto 2": "foto2",
};

function parseMidia(v: string, fallback: Midia): Midia {
  const s = norm(v);
  if (!s) return fallback;
  if (s.startsWith("tv") || s.includes("televis")) return "TV";
  if (s.startsWith("rad") || s.startsWith("rád") || s.includes("fm") || s.includes("am")) return "Radio";
  if (s.includes("dooh") || s.includes("ooh") || s.includes("outdoor") || s.includes("painel") || s.includes("tela") || s.includes("digital") || s.includes("ponto") || s.includes("banca") || s.includes("front") || s.includes("elevador") || s.includes("shopping")) return "DOOH";
  return fallback;
}

function parseNumero(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseBool(v: unknown): boolean {
  const s = norm(String(v ?? ""));
  if (!s) return true;
  return !["nao", "não", "n", "0", "false", "inativo", "inativa", "off"].includes(s);
}

export function ImportarProdutosDialog({
  open,
  onOpenChange,
  midiaPadrao = "DOOH",
  parceiroPadraoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  midiaPadrao?: Midia;
  parceiroPadraoId?: string;
}) {
  const qc = useQueryClient();
  const importFn = useServerFn(importProdutosBulk);
  const listParceirosFn = useServerFn(listParceiros);
  const inputRef = useRef<HTMLInputElement>(null);

  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [arquivo, setArquivo] = useState<string>("");
  const [midiaFallback, setMidiaFallback] = useState<Midia>(midiaPadrao);
  const [selectedParceiroId, setSelectedParceiroId] = useState<string>(parceiroPadraoId || "nenhum");
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Busca lista de parceiros cadastrados
  const { data: parceiros = [] } = useQuery<Parceiro[]>({
    queryKey: ["parceiros"],
    queryFn: () => listParceirosFn(),
    staleTime: 1000 * 60 * 5,
  });

  // Atualiza seleção padrão quando a dialog abre
  useEffect(() => {
    if (open) {
      if (parceiroPadraoId) {
        setSelectedParceiroId(parceiroPadraoId);
      } else {
        setSelectedParceiroId("nenhum");
      }
    }
  }, [open, parceiroPadraoId]);

  const parceiroAtivo = useMemo(() => {
    if (selectedParceiroId === "nenhum" || !selectedParceiroId) return null;
    return parceiros.find((p) => p.id === selectedParceiroId) || null;
  }, [selectedParceiroId, parceiros]);

  // Se o parceiro selecionado mudar, recomputa os vínculos das linhas carregadas
  const linhasComParceiro = useMemo(() => {
    return linhas.map((linha) => {
      // Se tiver parceiro selecionado no topo, ele preenche como padrão onde não houver override
      if (parceiroAtivo) {
        return {
          ...linha,
          parceiro_id: parceiroAtivo.id,
          parceiro_nome: linha.parceiro_nome || parceiroAtivo.nome_fantasia || parceiroAtivo.razao_social,
          parceiro_cnpj: linha.parceiro_cnpj || parceiroAtivo.cnpj,
          comissao_inquilino_pct: linha.comissao_inquilino_pct ?? parceiroAtivo.comissao_padrao_pct ?? 20.0,
        };
      }
      return linha;
    });
  }, [linhas, parceiroAtivo]);

  const validas = useMemo(() => linhasComParceiro.filter((l) => !l.erro), [linhasComParceiro]);

  const baixarModelo = () => {
    downloadModeloProdutosExcel("modelo-importacao-produtos-cliente.xlsx");
    toast.success("Modelo de planilha (.xlsx) com múltiplas abas baixado com sucesso!");
  };

  const lerArquivo = async (file: File) => {
    setLendo(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]!];
      if (!ws) throw new Error("Planilha vazia");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const parsed: Linha[] = rows.map((row) => {
        const mapped: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          const key = ALIASES[norm(k)];
          if (key && (mapped[key] === undefined || mapped[key] === "")) mapped[key] = v;
        }

        const nome = String(mapped.nome ?? "").trim();
        const midia = parseMidia(String(mapped.midia ?? ""), midiaFallback);
        const duracao = Math.round(parseNumero(mapped.duracao_segundos)) || 30;
        const insercoes = Math.round(parseNumero(mapped.insercoes_padrao)) || 1;
        const telas = mapped.quantidade_telas ? Math.round(parseNumero(mapped.quantidade_telas)) : null;
        
        let parceiroCnpj = String(mapped.parceiro_cnpj ?? "").trim() || null;
        let parceiroNome = String(mapped.parceiro_nome ?? "").trim() || null;
        let comissaoPct = mapped.comissao_inquilino_pct !== undefined && mapped.comissao_inquilino_pct !== "" 
          ? parseNumero(mapped.comissao_inquilino_pct) 
          : null;

        // Se encontrou parceiro cadastrado pelo CNPJ da linha, associa
        let parceiroIdEncontrado: string | null = null;
        if (parceiroCnpj) {
          const cleanCnpj = parceiroCnpj.replace(/\D/g, "");
          const match = parceiros.find((p) => p.cnpj && p.cnpj.replace(/\D/g, "") === cleanCnpj);
          if (match) {
            parceiroIdEncontrado = match.id || null;
            if (!parceiroNome) parceiroNome = match.nome_fantasia || match.razao_social;
            if (comissaoPct === null) comissaoPct = match.comissao_padrao_pct ?? 20.0;
          }
        }

        return {
          nome,
          midia,
          tipo: String(mapped.tipo ?? "").trim() || null,
          programa: String(mapped.programa ?? "").trim() || null,
          formato: String(mapped.formato ?? "").trim() || null,
          faixa: String(mapped.faixa ?? "").trim() || null,
          duracao_segundos: duracao,
          insercoes_padrao: insercoes,
          valor_unit: Math.max(0, parseNumero(mapped.valor_unit)),
          ativo: parseBool(mapped.ativo),
          parceiro_id: parceiroIdEncontrado,
          parceiro_cnpj: parceiroCnpj,
          parceiro_nome: parceiroNome,
          comissao_inquilino_pct: comissaoPct,
          observacao: String(mapped.observacao ?? "").trim() || null,
          endereco_ponto: String(mapped.endereco_ponto ?? "").trim() || null,
          cep: String(mapped.cep ?? "").trim() || null,
          quantidade_telas: telas,
          formato_tela: String(mapped.formato_tela ?? "").trim() || null,
          resolucao: String(mapped.resolucao ?? "").trim() || null,
          fotos: [String(mapped.foto1 ?? "").trim(), String(mapped.foto2 ?? "").trim()].filter(Boolean).slice(0, 2),
          erro: nome ? undefined : "Nome do produto ausente",
        };
      }).filter((l) => l.nome || l.erro);

      setLinhas(parsed);
      setArquivo(file.name);
      if (!parsed.length) {
        toast.error("Nenhuma linha encontrada no arquivo");
      } else {
        toast.success(`${parsed.length} item(ns) lido(s) com sucesso`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ler o arquivo");
    } finally {
      setLendo(false);
    }
  };

  const importar = async () => {
    if (!validas.length) return;
    setEnviando(true);
    try {
      const res = await importFn({
        data: {
          produtos: validas.map(({ erro: _e, ...p }) => ({
            ...p,
            fotos: p.fotos || [],
            veiculacao_tipo: "livre" as const,
            dias_fixos: [],
            dias_semana_fixos: [],
            ambientes: [],
            requer_producao: false,
          })),
        },
      });

      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["produto_tipos"] });
      qc.invalidateQueries({ queryKey: ["parceiros"] });

      if (res.fail) {
        toast.warning(`${res.ok} produto(s) importado(s), ${res.fail} com erro`);
      } else {
        toast.success(`Sucesso! ${res.ok} produto(s) de mídia importado(s).`);
      }

      if (!res.fail) {
        setLinhas([]);
        setArquivo("");
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar produtos");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Importar Produtos de Mídia</DialogTitle>
              <DialogDescription>
                Importe planilhas (.xlsx, .csv) de inventário próprio ou de parceiros comerciais (DOOH, Front Light, Elevadores, etc.).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar de Configurações da Importação */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-muted/40 rounded-xl border shrink-0">
          {/* Parceiro Associado */}
          <div className="md:col-span-5 flex flex-col gap-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <Handshake className="size-3.5 text-purple-600" />
              Vincular ao Parceiro Comercial
            </label>
            <Select value={selectedParceiroId} onValueChange={setSelectedParceiroId}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Selecione um parceiro ou mantenha da planilha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">
                  <span className="font-medium text-muted-foreground">🏢 Nenhum / Definido na Planilha / Próprio</span>
                </SelectItem>
                {parceiros.map((p) => (
                  <SelectItem key={p.id} value={p.id!}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.nome_fantasia || p.razao_social}</span>
                      <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 dark:bg-purple-950/40">
                        {p.comissao_padrao_pct}% comissão
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mídia Padrão Fallback */}
          <div className="md:col-span-3 flex flex-col gap-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <Building2 className="size-3.5 text-muted-foreground" />
              Mídia Fallback
            </label>
            <Select value={midiaFallback} onValueChange={(v) => setMidiaFallback(v as Midia)}>
              <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DOOH">DOOH / Mídia Exterior</SelectItem>
                <SelectItem value="TV">TV Tradicional</SelectItem>
                <SelectItem value="Radio">Rádio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ações: Baixar Modelo e Selecionar Arquivo */}
          <div className="md:col-span-4 flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 text-xs"
              onClick={baixarModelo}
              title="Baixar planilha de exemplo com todos os tipos de mídia"
            >
              <Download className="size-3.5 mr-1.5" />
              Modelo Completo
            </Button>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void lerArquivo(f);
                e.target.value = "";
              }}
            />

            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => inputRef.current?.click()}
              disabled={lendo}
            >
              {lendo ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="size-3.5 mr-1.5" />
              )}
              {arquivo ? "Trocar Planilha" : "Enviar Planilha"}
            </Button>
          </div>
        </div>

        {/* Informação do Parceiro Selecionado */}
        {parceiroAtivo && (
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-900 dark:text-purple-200 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-purple-600 shrink-0" />
              <div>
                <strong>Parceiro Ativo:</strong> {parceiroAtivo.nome_fantasia || parceiroAtivo.razao_social} {parceiroAtivo.cnpj && `(${parceiroAtivo.cnpj})`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-[11px]">
                <Percent className="size-3 mr-1" />
                Remuneração: {parceiroAtivo.comissao_padrao_pct}%
              </Badge>
              {parceiroAtivo.prazo_repasse && (
                <span className="text-[11px] opacity-80">Repasse: {parceiroAtivo.prazo_repasse}</span>
              )}
            </div>
          </div>
        )}

        {/* Status do Arquivo Carregado */}
        {arquivo && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 shrink-0">
            <FileSpreadsheet className="size-4 text-purple-600" />
            <span className="font-semibold text-foreground">{arquivo}</span>
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
              {validas.length} válido(s) para importação
            </Badge>
            {linhasComParceiro.length - validas.length > 0 && (
              <Badge variant="destructive">
                {linhasComParceiro.length - validas.length} com pendência
              </Badge>
            )}
          </div>
        )}

        {/* Tabela de Preview */}
        <div className="flex-1 overflow-auto border rounded-lg min-h-[220px]">
          {linhasComParceiro.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
                <TableRow>
                  <TableHead className="w-[280px]">Produto / Ponto de Mídia</TableHead>
                  <TableHead>Origem / Parceiro</TableHead>
                  <TableHead>Mídia & Segmento</TableHead>
                  <TableHead>Endereço / Local</TableHead>
                  <TableHead className="text-center">Telas / Formato</TableHead>
                  <TableHead className="text-right">Tabela Unit.</TableHead>
                  <TableHead className="text-right">Remuneração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasComParceiro.map((l, i) => {
                  const comissaoValor = (l.valor_unit * (l.comissao_inquilino_pct || 0)) / 100;
                  return (
                    <TableRow key={i} className={l.erro ? "bg-destructive/10" : undefined}>
                      {/* Nome e Erro */}
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {l.nome || <span className="text-muted-foreground">—</span>}
                          </span>
                          {l.programa && (
                            <span className="text-xs text-muted-foreground">{l.programa}</span>
                          )}
                          {l.erro && (
                            <span className="mt-1 text-xs text-destructive inline-flex items-center gap-1 font-medium">
                              <AlertTriangle className="size-3" />
                              {l.erro}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Parceiro */}
                      <TableCell>
                        {l.parceiro_nome || l.parceiro_cnpj ? (
                          <div className="flex flex-col text-[11px] leading-snug">
                            <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                              <Handshake className="size-3 text-purple-600" />
                              {l.parceiro_nome || "Parceiro Comercial"}
                            </span>
                            {l.parceiro_cnpj && (
                              <span className="text-muted-foreground text-[10px]">{l.parceiro_cnpj}</span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                            🏢 Próprio
                          </Badge>
                        )}
                      </TableCell>

                      {/* Mídia & Tipo */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="secondary" className="w-fit text-[10px] uppercase font-bold tracking-wider">
                            {l.midia}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={l.tipo || ""}>
                            {l.tipo || "—"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Endereço / Local */}
                      <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                        {l.endereco_ponto ? (
                          <div className="truncate" title={`${l.endereco_ponto} ${l.cep ? `(CEP: ${l.cep})` : ""}`}>
                            {l.endereco_ponto}
                            {l.cep && <span className="block text-[10px] text-muted-foreground/80 font-mono">CEP: {l.cep}</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      {/* Telas / Formato */}
                      <TableCell className="text-center text-xs">
                        {l.quantidade_telas ? (
                          <Badge variant="outline" className="text-[11px] font-semibold">
                            {l.quantidade_telas} tela{l.quantidade_telas > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {l.formato_tela && (
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            {l.formato_tela}
                          </span>
                        )}
                      </TableCell>

                      {/* Valor Unit */}
                      <TableCell className="text-right font-semibold text-sm">
                        {l.valor_unit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>

                      {/* Remuneração / Comissão */}
                      <TableCell className="text-right">
                        {l.comissao_inquilino_pct ? (
                          <div className="flex flex-col items-end">
                            <Badge variant="outline" className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40">
                              {l.comissao_inquilino_pct}%
                            </Badge>
                            {l.valor_unit > 0 && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                +{comissaoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <FileSpreadsheet className="size-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-sm text-foreground">Nenhuma planilha carregada no momento</p>
              <p className="text-xs max-w-md mt-1">
                Clique em <strong>"Baixar Modelo Completo"</strong> para obter uma planilha pré-preenchida com exemplos reais de DOOH, Front Lights, telas em vans/apps, elevadores e shoppings, ou clique em <strong>"Enviar Planilha"</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé com Resumo e Ação */}
        <DialogFooter className="shrink-0 flex items-center justify-between border-t pt-3 sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {validas.length > 0 && (
              <span>
                Pronto para importar <strong>{validas.length}</strong> produto(s)
                {parceiroAtivo && (
                  <> vinculados ao parceiro <strong>{parceiroAtivo.nome_fantasia || parceiroAtivo.razao_social}</strong></>
                )}.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={importar}
              disabled={!validas.length || enviando}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
            >
              {enviando && <Loader2 className="size-4 mr-2 animate-spin" />}
              Importar {validas.length > 0 ? `${validas.length} Produtos` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
