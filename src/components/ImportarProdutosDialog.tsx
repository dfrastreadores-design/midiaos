import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, FileSpreadsheet, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importProdutosBulk } from "@/lib/produtos.functions";

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
  observacao?: string | null;
  endereco_ponto?: string | null;
  quantidade_telas?: number | null;
  formato_tela?: string | null;
  resolucao?: string | null;
  erro?: string;
};

const COLUNAS = [
  "nome", "midia", "tipo", "programa", "formato", "faixa",
  "duracao_segundos", "insercoes_padrao", "valor_unit", "ativo",
  "observacao", "endereco_ponto", "quantidade_telas", "formato_tela", "resolucao",
] as const;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

const ALIASES: Record<string, string> = {
  "nome": "nome", "produto": "nome", "descricao": "nome", "descricao do produto": "nome", "item": "nome",
  "midia": "midia", "mídia": "midia", "veiculo": "midia", "tipo de midia": "midia", "canal": "midia",
  "tipo": "tipo", "categoria": "tipo",
  "programa": "programa", "programacao": "programa", "atracao": "programa",
  "formato": "formato",
  "faixa": "faixa", "horario": "faixa", "faixa horaria": "faixa",
  "duracao_segundos": "duracao_segundos", "duracao": "duracao_segundos", "duracao (s)": "duracao_segundos",
  "segundos": "duracao_segundos", "tempo": "duracao_segundos", "duracao em segundos": "duracao_segundos",
  "insercoes_padrao": "insercoes_padrao", "insercoes": "insercoes_padrao", "qtd insercoes": "insercoes_padrao",
  "quantidade de insercoes": "insercoes_padrao",
  "valor_unit": "valor_unit", "valor": "valor_unit", "valor unitario": "valor_unit", "preco": "valor_unit",
  "preco unitario": "valor_unit", "valor unit": "valor_unit", "valor unit.": "valor_unit", "tabela": "valor_unit",
  "ativo": "ativo", "status": "ativo", "situacao": "ativo",
  "observacao": "observacao", "obs": "observacao", "observacoes": "observacao",
  "endereco_ponto": "endereco_ponto", "endereco": "endereco_ponto", "local": "endereco_ponto", "ponto": "endereco_ponto",
  "quantidade_telas": "quantidade_telas", "telas": "quantidade_telas", "qtd telas": "quantidade_telas",
  "formato_tela": "formato_tela", "formato da tela": "formato_tela",
  "resolucao": "resolucao",
};

function parseMidia(v: string, fallback: Midia): Midia {
  const s = norm(v);
  if (!s) return fallback;
  if (s.startsWith("tv") || s.includes("televis")) return "TV";
  if (s.startsWith("rad") || s.startsWith("rád") || s.includes("fm") || s.includes("am")) return "Radio";
  if (s.includes("dooh") || s.includes("ooh") || s.includes("outdoor") || s.includes("painel") || s.includes("tela") || s.includes("digital")) return "DOOH";
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
  midiaPadrao = "TV",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  midiaPadrao?: Midia;
}) {
  const qc = useQueryClient();
  const importFn = useServerFn(importProdutosBulk);
  const inputRef = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [arquivo, setArquivo] = useState<string>("");
  const [midiaFallback, setMidiaFallback] = useState<Midia>(midiaPadrao);
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const validas = useMemo(() => linhas.filter((l) => !l.erro), [linhas]);

  const baixarModelo = () => {
    const exemplo = [
      {
        nome: "Comercial 30\" — Bom Dia DF", midia: "TV", tipo: "Comercial", programa: "Bom Dia DF",
        formato: "Spot", faixa: "Manhã", duracao_segundos: 30, insercoes_padrao: 20,
        valor_unit: 1500, ativo: "Sim", observacao: "", endereco_ponto: "",
        quantidade_telas: "", formato_tela: "", resolucao: "",
      },
      {
        nome: "Painel Digital — Shopping Norte", midia: "DOOH", tipo: "Painel", programa: "",
        formato: "Vídeo 15s", faixa: "", duracao_segundos: 15, insercoes_padrao: 100,
        valor_unit: 90, ativo: "Sim", observacao: "", endereco_ponto: "SCN Q.5, Brasília/DF",
        quantidade_telas: 12, formato_tela: "Vertical", resolucao: "1080x1920",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(exemplo, { header: [...COLUNAS] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "modelo-importacao-produtos.xlsx");
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
          observacao: String(mapped.observacao ?? "").trim() || null,
          endereco_ponto: String(mapped.endereco_ponto ?? "").trim() || null,
          quantidade_telas: telas,
          formato_tela: String(mapped.formato_tela ?? "").trim() || null,
          resolucao: String(mapped.resolucao ?? "").trim() || null,
          erro: nome ? undefined : "Nome do produto ausente",
        };
      }).filter((l) => l.nome || l.erro);
      setLinhas(parsed);
      setArquivo(file.name);
      if (!parsed.length) toast.error("Nenhuma linha encontrada no arquivo");
      else toast.success(`${parsed.length} linha(s) lida(s)`);
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
            veiculacao_tipo: "livre" as const,
            dias_fixos: [],
            dias_semana_fixos: [],
            ambientes: [],
            requer_producao: false,
          })),
        },
      });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      if (res.fail) toast.warning(`${res.ok} importado(s), ${res.fail} com erro`);
      else toast.success(`${res.ok} produto(s) importado(s)`);
      if (!res.fail) {
        setLinhas([]);
        setArquivo("");
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar produtos</DialogTitle>
          <DialogDescription>
            Envie uma planilha (.xlsx, .xls ou .csv). As colunas são reconhecidas automaticamente
            (nome, mídia, tipo, programa, formato, faixa, duração, inserções, valor, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={baixarModelo}>
            <Download className="size-4 mr-2" />Baixar modelo
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
          <Button onClick={() => inputRef.current?.click()} disabled={lendo}>
            {lendo ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
            Selecionar arquivo
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Mídia padrão</span>
            <Select value={midiaFallback} onValueChange={(v) => setMidiaFallback(v as Midia)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TV">TV</SelectItem>
                <SelectItem value="Radio">Rádio</SelectItem>
                <SelectItem value="DOOH">DOOH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {arquivo && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <FileSpreadsheet className="size-4" />{arquivo}
            <Badge variant="secondary">{validas.length} válida(s)</Badge>
            {linhas.length - validas.length > 0 && (
              <Badge variant="destructive">{linhas.length - validas.length} com erro</Badge>
            )}
          </div>
        )}

        {linhas.length > 0 && (
          <div className="max-h-[45vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Mídia</TableHead>
                  <TableHead>Tipo / Programa</TableHead>
                  <TableHead className="text-right">Dur.</TableHead>
                  <TableHead className="text-right">Inser.</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, i) => (
                  <TableRow key={i} className={l.erro ? "bg-destructive/10" : undefined}>
                    <TableCell className="font-medium">
                      {l.nome || <span className="text-muted-foreground">—</span>}
                      {l.erro && (
                        <span className="ml-2 text-xs text-destructive inline-flex items-center gap-1">
                          <AlertTriangle className="size-3" />{l.erro}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{l.midia}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[l.tipo, l.programa].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">{l.duracao_segundos}s</TableCell>
                    <TableCell className="text-right">{l.insercoes_padrao}</TableCell>
                    <TableCell className="text-right">
                      {l.valor_unit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={importar} disabled={!validas.length || enviando}>
            {enviando && <Loader2 className="size-4 mr-2 animate-spin" />}
            Importar {validas.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
