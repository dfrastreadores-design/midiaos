import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileUp, Sparkles, CheckCircle2, AlertTriangle, FilePlus2, ArrowRightCircle } from "lucide-react";
import { converterPropostaEmPi, getProposta } from "@/lib/propostas.functions";
import { extractPdfText } from "@/lib/pdf-extract";
import { extrairPiDePdf, type PiExtraido } from "@/lib/pi-ai.functions";
import { PiFormDialog } from "@/components/PiFormDialog";
import type { CalcItemOut } from "@/components/PriceCalculator";
import { toast } from "sonner";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type Divergencia = { campo: string; proposta: string; pi: string };

const fmtBRL = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function comparar(prop: { campanha: string; valor_negociado: number; total_insercoes: number; itens?: Array<unknown> }, pi: PiExtraido, mes: number, ano: number): Divergencia[] {
  const divs: Divergencia[] = [];
  if (pi.campanha && prop.campanha && pi.campanha.trim().toLowerCase() !== prop.campanha.trim().toLowerCase()) {
    divs.push({ campo: "Campanha", proposta: prop.campanha, pi: pi.campanha });
  }
  if (pi.mes_veiculacao && pi.mes_veiculacao !== mes) {
    divs.push({ campo: "Mês de veiculação", proposta: String(mes), pi: String(pi.mes_veiculacao) });
  }
  if (pi.ano_veiculacao && pi.ano_veiculacao !== ano) {
    divs.push({ campo: "Ano de veiculação", proposta: String(ano), pi: String(pi.ano_veiculacao) });
  }
  if (pi.valor_negociado != null) {
    const diff = Math.abs(pi.valor_negociado - prop.valor_negociado);
    const tol = Math.max(1, prop.valor_negociado * 0.01);
    if (diff > tol) divs.push({ campo: "Valor negociado", proposta: fmtBRL(prop.valor_negociado), pi: fmtBRL(pi.valor_negociado) });
  }
  if (pi.total_insercoes != null && pi.total_insercoes !== prop.total_insercoes) {
    divs.push({ campo: "Total de inserções", proposta: String(prop.total_insercoes), pi: String(pi.total_insercoes) });
  }
  if (pi.itens && prop.itens && pi.itens.length !== prop.itens.length) {
    divs.push({ campo: "Quantidade de itens", proposta: String(prop.itens.length), pi: String(pi.itens.length) });
  }
  return divs;
}

export function ConverterPropostaDialog({
  propostaId, numero, open, onOpenChange,
}: { propostaId: string | null; numero: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [modo, setModo] = useState<"escolha" | "anexar" | null>("escolha");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extraido, setExtraido] = useState<PiExtraido | null>(null);
  const [divergencias, setDivergencias] = useState<Divergencia[] | null>(null);
  const [piFormOpen, setPiFormOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setModo("escolha");
      setFile(null);
      setExtraido(null);
      setDivergencias(null);
      setMes(now.getMonth() + 1);
      setAno(now.getFullYear());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: proposta } = useQuery({
    queryKey: ["proposta", propostaId],
    queryFn: () => getProposta({ data: { id: propostaId! } }),
    enabled: !!propostaId && open,
  });

  const { data: briefing } = useQuery({
    queryKey: ["briefing-by-proposta", propostaId],
    queryFn: async () => {
      const { data: b } = await (await import("@/integrations/supabase/client")).supabase
        .from("propostas")
        .select("created_by")
        .eq("id", propostaId!)
        .maybeSingle();
      return b;
    },
    enabled: !!propostaId && open,
  });

  const converter = useMutation({
    mutationFn: () => {
      if (!propostaId) throw new Error("Proposta inválida");
      return converterPropostaEmPi({ data: { proposta_id: propostaId, mes_veiculacao: mes, ano_veiculacao: ano } });
    },
    onSuccess: () => {
      toast.success("PI gerado a partir da proposta");
      qc.invalidateQueries({ queryKey: ["propostas"] });
      qc.invalidateQueries({ queryKey: ["pis"] });
      onOpenChange(false);
      navigate({ to: "/pi" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const anos = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 1 + i);

  async function handleExtract() {
    if (!file || !proposta) return;
    setExtracting(true);
    try {
      const texto = await extractPdfText(file);
      if (texto.length < 20) throw new Error("Não foi possível ler o texto do PDF.");
      const data = await extrairPiDePdf({ data: { texto } });
      setExtraido(data);
      const divs = comparar(
        {
          campanha: proposta.campanha,
          valor_negociado: Number(proposta.valor_negociado || 0),
          total_insercoes: Number(proposta.total_insercoes || 0),
          itens: (proposta.itens as Array<unknown>) || [],
        },
        data,
        mes,
        ano,
      );
      setDivergencias(divs);
      if (divs.length === 0) toast.success("PI conforme a proposta");
      else toast.warning(`${divs.length} divergência(s) encontrada(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  // Prefill items for manual PI creation
  const prefillItens: CalcItemOut[] | undefined = proposta?.itens
    ? (proposta.itens as Array<Record<string, unknown>>).map((it) => ({
        tipo: String(it.tipo ?? "VT"),
        programa: (it.programa as string) ?? null,
        horario: (it.horario as string) ?? null,
        formato: (it.formato as string) ?? null,
        insercoes_dia: Number(it.insercoes_dia ?? 1),
        dias_semana: (it.dias_semana as string[]) ?? [],
        dias_mes: (it.dias_mes as number[]) ?? [],
        desconto: Number(it.desconto ?? 0),
        valor_unit: Number(it.valor_unit ?? 0),
        valor_tabela: Number(it.valor_tabela ?? 0),
        valor_negociado: Number(it.valor_negociado ?? 0),
        total_insercoes: Number(it.total_insercoes ?? 0),
      }))
    : undefined;

  return (
    <>
      <Dialog open={open && !piFormOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Converter {numero} em PI</DialogTitle>
            <DialogDescription>
              Você pode anexar um PI já enviado pelo cliente/agência ou criar um novo a partir da proposta.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Mês de Veiculação</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ano</Label>
              <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{anos.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {modo === "escolha" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setModo("anexar")}>
                <CardContent className="p-4 space-y-2">
                  <FileUp className="size-6 text-primary" />
                  <div className="font-medium">Anexar PI pronto</div>
                  <p className="text-xs text-muted-foreground">
                    O cliente/agência já enviou o PI em PDF. A IA lê e compara com a proposta.
                  </p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setPiFormOpen(true)}>
                <CardContent className="p-4 space-y-2">
                  <FilePlus2 className="size-6 text-primary" />
                  <div className="font-medium">Criar PI agora</div>
                  <p className="text-xs text-muted-foreground">
                    Abre a tela do PI com inserções, valores e descontos da proposta já preenchidos.
                  </p>
                </CardContent>
              </Card>
              <div className="sm:col-span-2">
                <Button variant="outline" className="w-full" onClick={() => converter.mutate()} disabled={converter.isPending}>
                  <ArrowRightCircle className="size-4 mr-2" />
                  Ou gerar PI automaticamente (sem revisar)
                </Button>
              </div>
            </div>
          )}

          {modo === "anexar" && (
            <div className="space-y-3">
              <Label>Arquivo PDF do PI recebido</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setExtraido(null); setDivergencias(null); }}
                disabled={extracting}
              />
              {file && !extraido && (
                <Button onClick={handleExtract} disabled={extracting} className="w-full">
                  {extracting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                  {extracting ? "Lendo PDF e comparando…" : "Ler PDF e comparar com a proposta"}
                </Button>
              )}

              {divergencias && divergencias.length === 0 && (
                <Alert className="border-success/50 bg-success/10">
                  <CheckCircle2 className="size-4 text-success" />
                  <AlertTitle className="text-success">PI conforme a proposta</AlertTitle>
                  <AlertDescription>
                    Todos os dados conferem. Pode prosseguir com a conversão.
                  </AlertDescription>
                </Alert>
              )}

              {divergencias && divergencias.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>{divergencias.length} divergência(s) encontrada(s)</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1 text-xs">
                      {divergencias.map((d, i) => (
                        <li key={i}>
                          <strong>{d.campo}:</strong> proposta = <code>{d.proposta}</code> · PI = <code>{d.pi}</code>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">Revise antes de prosseguir.</p>
                  </AlertDescription>
                </Alert>
              )}

              <Button variant="ghost" size="sm" onClick={() => setModo("escolha")}>← Voltar</Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {modo === "anexar" && extraido && (
              <Button onClick={() => converter.mutate()} disabled={converter.isPending}>
                {divergencias && divergencias.length > 0 ? "Prosseguir mesmo assim" : "Confirmar e converter"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PI form for manual creation, prefilled from proposta */}
      <PiFormDialog
        open={piFormOpen}
        onOpenChange={(v) => {
          setPiFormOpen(v);
          if (!v) onOpenChange(false);
        }}
        propostaOrigemId={propostaId}
        initial={
          proposta
            ? {
                cliente_id: proposta.cliente_id,
                agencia_id: proposta.agencia_id,
                campanha: proposta.campanha,
                mes_veiculacao: mes,
                ano_veiculacao: ano,
                observacao: proposta.observacao
                  ? `Convertido da proposta ${proposta.numero}. ${proposta.observacao}`
                  : `Convertido da proposta ${proposta.numero}.`,
                faturamento_contra: proposta.agencia_id ? "agencia" : "cliente",
                faturamento_tipo: proposta.agencia_id ? "liquido" : "bruto",
                executivo_id: (proposta as { executivo_id?: string | null }).executivo_id ?? null,
                responsavel_negociacao_id: briefing?.created_by ?? null,
                itens: prefillItens,
              }
            : undefined
        }
      />
    </>
  );
}
