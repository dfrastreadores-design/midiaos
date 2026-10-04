import { useEffect, useState } from "react";
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
import { Loader2, History, Clock, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { getProposta, listProposalHistory } from "@/lib/propostas.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  gerarPptxProposta,
  gerarPdfProposta,
  gerarPdfPropostaSimplificada,
} from "@/lib/proposta-presentation";
import type { PropostaApresentacao } from "@/lib/proposta-presentation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropostaAnexosSection } from "@/components/PropostaAnexosSection";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; propostaId: string | null };

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtData = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

export function VisualizarPropostaDialog({ open, onOpenChange, propostaId }: Props) {
  const [p, setP] = useState<(PropostaApresentacao & { numero: string; status?: string }) | null>(
    null,
  );
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [layoutModelo, setLayoutModelo] = useState<"padrao" | "simplificado">("padrao");
  const [modoApresentacao, setModoApresentacao] = useState<"detalhado" | "pacote_midia">(
    "detalhado",
  );
  const [mostrarEndereco, setMostrarEndereco] = useState(true);
  const [mostrarFotos, setMostrarFotos] = useState(true);

  useEffect(() => {
    if (!open || !propostaId) {
      setP(null);
      setHistory([]);
      return;
    }

    setLoading(true);
    getProposta({ data: { id: propostaId } })
      .then(async (p: any) => {
        if (!p) throw new Error("Proposta não encontrada");
        setP(
          p as unknown as PropostaApresentacao & {
            numero: string;
            status?: string;
            tenant_id?: string;
          },
        );

        if (p.modo_apresentacao) setModoApresentacao(p.modo_apresentacao);
        if (typeof p.mostrar_endereco === "boolean") setMostrarEndereco(p.mostrar_endereco);
        if (typeof p.mostrar_fotos === "boolean") setMostrarFotos(p.mostrar_fotos);

        // Buscar o layout padrão do inquilino se disponível
        if (p.tenant_id) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("proposta_layout_padrao")
            .eq("id", p.tenant_id)
            .single();
          if (tenant?.proposta_layout_padrao) {
            setLayoutModelo(tenant.proposta_layout_padrao as "padrao" | "simplificado");
          }
        }
      })
      .catch((e: Error) => {
        console.error("Erro ao carregar proposta:", e);
        toast.error("Erro ao carregar os dados da proposta: " + e.message);
      })
      .finally(() => setLoading(false));

    setLoadingHistory(true);
    listProposalHistory({ data: { proposal_id: propostaId } })
      .then((h) => setHistory(h))
      .catch((e: Error) => console.error("Erro ao carregar histórico:", e.message))
      .finally(() => setLoadingHistory(false));
  }, [open, propostaId]);

  const cliente =
    p?.cliente?.nome_fantasia ||
    p?.cliente?.razao_social ||
    p?.agencia?.nome_fantasia ||
    p?.agencia?.razao_social ||
    p?.cliente_avulso ||
    "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>Visualizar Proposta {p?.numero ? `· ${p.numero}` : ""}</DialogTitle>
          <DialogDescription>Detalhes completos da proposta comercial.</DialogDescription>
        </DialogHeader>

        {loading || !p ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Carregando proposta…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="detalhes">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="detalhes">Detalhes da Proposta</TabsTrigger>
                <TabsTrigger value="anexos" className="flex items-center gap-2">
                  <Paperclip className="size-4" /> Anexos e Arquivos
                </TabsTrigger>
                <TabsTrigger value="historico" className="flex items-center gap-2">
                  <History className="size-4" /> Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="detalhes" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Info label="Cliente" value={cliente} />
                  <Info label="Campanha" value={p.campanha} />
                  <Info
                    label="Status"
                    value={<Badge variant="secondary">{p.status ?? "—"}</Badge>}
                  />
                  <Info label="Validade" value={fmtData(p.validade)} />
                  <Info label="Criado em" value={fmtData(p.created_at)} />
                  <Info label="Total de inserções" value={String(p.total_insercoes)} />
                  <Info label="Valor de tabela" value={fmtBRL(p.valor_tabela)} />
                  <Info
                    label="Desconto"
                    value={
                      p.valor_tabela > 0
                        ? `${fmtBRL(p.valor_desconto)} (${((p.valor_desconto / p.valor_tabela) * 100).toFixed(0)}%)`
                        : fmtBRL(p.valor_desconto)
                    }
                  />
                  <Info
                    label="Valor negociado"
                    value={
                      <span className="font-semibold text-primary">
                        {fmtBRL(p.valor_negociado)}
                      </span>
                    }
                  />
                </div>

                {p.observacao && (
                  <div className="rounded-md border p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Observação</div>
                    <div className="text-sm whitespace-pre-wrap">{p.observacao}</div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-2">Itens da proposta</h3>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Programa</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Formato</TableHead>
                          <TableHead className="text-right">Ins/dia</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Vlr Unit.</TableHead>
                          <TableHead className="text-right">Total Tabela</TableHead>
                          <TableHead className="text-right">Desconto</TableHead>
                          <TableHead className="text-right">Negociado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(p.itens ?? []).length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="text-center text-muted-foreground py-6"
                            >
                              Sem itens.
                            </TableCell>
                          </TableRow>
                        )}
                        {(p.itens ?? []).map((it, i) => (
                          <TableRow key={i}>
                            <TableCell>{it.tipo}</TableCell>
                            <TableCell>
                              <div className="font-medium">{it.programa || "—"}</div>
                              {((it as any).parceiro_nome || (it as any).parceiro_cnpj) && (
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                  <span>🤝 {(it as any).parceiro_nome}</span>
                                  {(it as any).parceiro_cnpj && (
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      ({(it as any).parceiro_cnpj})
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{(it as any).horario || "—"}</TableCell>
                            <TableCell>{it.formato || "—"}</TableCell>
                            <TableCell className="text-right">{it.insercoes_dia}</TableCell>
                            <TableCell className="text-right">{it.total_insercoes}</TableCell>
                            <TableCell className="text-right">{fmtBRL(it.valor_unit)}</TableCell>
                            <TableCell className="text-right">{fmtBRL(it.valor_tabela)}</TableCell>
                            <TableCell className="text-right">
                              {it.desconto > 0 ? `${it.desconto.toFixed(0)}%` : "0%"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {it.valor_negociado > 0 ? fmtBRL(it.valor_negociado) : "Bonificação"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="pt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum histórico encontrado para esta proposta.
                      </p>
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                        {history.map((h) => (
                          <div key={h.id} className="relative">
                            <div className="absolute -left-[24px] top-1 size-[12px] rounded-full border-2 border-primary bg-background" />
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm capitalize">
                                  {h.action_type === "create"
                                    ? "Proposta Criada"
                                    : h.action_type === "status_change"
                                      ? "Alteração de Status"
                                      : "Modificação"}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  <Clock className="size-3 mr-1" />
                                  {new Date(h.created_at).toLocaleString("pt-BR")}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Por: {h.profiles?.nome || h.profiles?.email || "Sistema"}
                              </div>
                              {h.changes && (
                                <div className="mt-2 text-xs bg-muted/50 rounded p-2 border">
                                  {h.action_type === "create" ? (
                                    <p>Proposta inicial gerada.</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {Object.entries(h.changes).map(
                                        ([field, val]: [string, any]) => (
                                          <li key={field} className="flex flex-wrap gap-x-2">
                                            <span className="font-medium uppercase text-[10px] text-muted-foreground">
                                              {field}:
                                            </span>
                                            <span className="line-through text-red-500">
                                              {String(val.old)}
                                            </span>
                                            <span className="text-green-600 font-medium">
                                              → {String(val.new)}
                                            </span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="anexos" className="pt-4">
                <PropostaAnexosSection propostaId={propostaId} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Modelo:</span>
              <select
                value={layoutModelo}
                onChange={(e) => setLayoutModelo(e.target.value as any)}
                className="text-xs border rounded-md px-2 py-1 bg-background"
              >
                <option value="padrao">Padrão Mídia.OS (Executivo)</option>
                <option value="simplificado">Simplificado (Estratégico DOOH)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Formato:</span>
              <select
                value={modoApresentacao}
                onChange={(e) => setModoApresentacao(e.target.value as any)}
                className="text-xs border rounded-md px-2 py-1 bg-background font-medium"
              >
                <option value="detalhado">📋 Detalhado (Total Proposta)</option>
                <option value="pacote_midia">📦 Pacote de Mídia (Valor Final)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              variant="default"
              className="bg-primary hover:bg-primary/90 rounded-full px-6"
              onClick={async () => {
                if (!p) return;
                const toastId = toast.loading("Gerando proposta...");
                try {
                  const pComModo: PropostaApresentacao = {
                    ...p,
                    modo_apresentacao: modoApresentacao,
                    mostrar_endereco: mostrarEndereco,
                    mostrar_fotos: mostrarFotos,
                  };
                  if (layoutModelo === "simplificado") {
                    await gerarPdfPropostaSimplificada(pComModo, "");
                  } else {
                    await gerarPdfProposta(pComModo, "");
                  }
                  toast.success("Proposta gerada com sucesso!", { id: toastId });
                } catch (e) {
                  console.error(e);
                  toast.error("Erro ao gerar PDF", { id: toastId });
                }
              }}
            >
              Gerar PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2.5 bg-card">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}
