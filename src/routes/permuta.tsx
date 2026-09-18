import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Eye, ArrowUpDown, RefreshCw, WalletCards } from "lucide-react";
import { listPermutaSaldos, getPermutaDetalhes, createPermutaRecebimento, deletePermutaRecebimento } from "@/lib/permuta.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/permuta")({
  head: () => ({ meta: [{ title: "Controle de Permuta — Mídia.OS" }] }),
  component: PermutaPage,
});

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function PermutaPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedEntidade, setSelectedEntidade] = useState<{ id: string; nome: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ descricao: "", valor: "", data: new Date().toISOString().split("T")[0] });

  const { data: saldos = [], isLoading } = useQuery({
    queryKey: ["permuta-saldos"],
    queryFn: () => listPermutaSaldos(),
  });

  const { data: detalhes, isLoading: loadingDetalhes } = useQuery({
    queryKey: ["permuta-detalhes", selectedEntidade?.id],
    queryFn: () => getPermutaDetalhes({ data: { entidade_id: selectedEntidade!.id } }),
    enabled: !!selectedEntidade,
  });

  const createMut = useMutation({
    mutationFn: (vars: any) => createPermutaRecebimento({ data: vars }),
    onSuccess: () => {
      toast.success("Recebimento registrado");
      qc.invalidateQueries({ queryKey: ["permuta-saldos"] });
      qc.invalidateQueries({ queryKey: ["permuta-detalhes", selectedEntidade?.id] });
      setAddOpen(false);
      setForm({ descricao: "", valor: "", data: new Date().toISOString().split("T")[0] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deletePermutaRecebimento({ data: { id } }),
    onSuccess: () => {
      toast.success("Recebimento removido");
      qc.invalidateQueries({ queryKey: ["permuta-saldos"] });
      qc.invalidateQueries({ queryKey: ["permuta-detalhes", selectedEntidade?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredSaldos = saldos.filter(s => {
    const temPermuta = Number(s.total_pi ?? 0) > 0 || Number(s.total_recebido ?? 0) > 0;
    if (!temPermuta) return false;
    return s.razao_social?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AppShell>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <WalletCards className="size-6" />
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">Controle de Permuta</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe o saldo entre PIs de permuta e produtos/serviços recebidos.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de Saldos */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Saldos por Cliente/Agência</CardTitle>
            <div className="pt-2">
              <Input 
                placeholder="Filtrar entidade…" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidade</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-4">Carregando…</TableCell></TableRow>
                  ) : filteredSaldos.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-4">Nenhum saldo.</TableCell></TableRow>
                    ) : filteredSaldos.map((s) => (
                    <TableRow 
                      key={s.entidade_id} 
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedEntidade?.id === s.entidade_id && "bg-muted"
                      )}
                      onClick={() => setSelectedEntidade({ id: s.entidade_id, nome: s.razao_social || "Entidade sem nome" })}
                    >
                      <TableCell>
                        <div className="font-medium text-xs truncate max-w-[150px]">{s.razao_social}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{s.tipo}</div>
                      </TableCell>
                      <TableCell className={cn("text-right font-semibold text-xs", (s.saldo ?? 0) > 0 ? "text-destructive" : (s.saldo ?? 0) < 0 ? "text-success" : "")}>
                        {formatBRL(s.saldo ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes da Entidade Selecionada */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedEntidade ? (
            <Card className="h-full flex items-center justify-center border-dashed">
              <div className="text-center p-10">
                <WalletCards className="size-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Selecione um cliente ou agência para ver o extrato.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Header de Detalhes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedEntidade.nome}</CardTitle>
                    <CardDescription>Extrato detalhado de permutas</CardDescription>
                  </div>
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="size-4 mr-2" /> Registrar Recebimento
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Total em PIs</div>
                      <div className="text-lg font-display font-semibold">
                        {formatBRL(saldos.find(s => s.entidade_id === selectedEntidade.id)?.total_pi || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Recebido</div>
                      <div className="text-lg font-display font-semibold text-success">
                        {formatBRL(saldos.find(s => s.entidade_id === selectedEntidade.id)?.total_recebido || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Devedor</div>
                      <div className={cn("text-lg font-display font-semibold", (saldos.find(s => s.entidade_id === selectedEntidade.id)?.saldo || 0) > 0 ? "text-destructive" : "")}>
                        {formatBRL(saldos.find(s => s.entidade_id === selectedEntidade.id)?.saldo || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabelas de Detalhes */}
              <div className="grid gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">PIs de Permuta</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Campanha</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingDetalhes ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-4">Carregando…</TableCell></TableRow>
                        ) : detalhes?.pis.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-4">Nenhum PI encontrado.</TableCell></TableRow>
                        ) : detalhes?.pis.map(pi => (
                          <TableRow key={pi.id}>
                            <TableCell className="font-mono text-xs">{pi.numero}</TableCell>
                            <TableCell className="text-xs">{pi.campanha}</TableCell>
                            <TableCell className="text-xs">{new Date(pi.created_at).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-right text-xs font-medium">{formatBRL(pi.valor_negociado)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Recebimentos Registrados</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingDetalhes ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-4">Carregando…</TableCell></TableRow>
                        ) : detalhes?.recebimentos.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-4">Nenhum recebimento registrado.</TableCell></TableRow>
                        ) : detalhes?.recebimentos.map(rec => (
                          <TableRow key={rec.id}>
                            <TableCell className="text-xs">{new Date(rec.data_recebimento).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-xs">{rec.descricao}</TableCell>
                            <TableCell className="text-right text-xs font-medium text-success">{formatBRL(rec.valor)}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="size-7"
                                onClick={() => { if(confirm("Remover este recebimento?")) delMut.mutate(rec.id); }}
                              >
                                <Trash2 className="size-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog para Novo Recebimento */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Recebimento de Permuta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição do produto/serviço</Label>
              <Textarea 
                placeholder="Ex: 10 diárias de hotel, 50 almoços executivos..." 
                value={form.descricao}
                onChange={(e) => setForm({...form, descricao: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor estimado</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={form.valor}
                  onChange={(e) => setForm({...form, valor: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Data do recebimento</Label>
                <Input 
                  type="date" 
                  value={form.data}
                  onChange={(e) => setForm({...form, data: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button 
              disabled={createMut.isPending || !form.descricao || !form.valor}
              onClick={() => {
                const s = saldos.find(x => x.entidade_id === selectedEntidade?.id);
                createMut.mutate({
                  cliente_id: s?.tipo === 'cliente' ? s.entidade_id : null,
                  agencia_id: s?.tipo === 'agencia' ? s.entidade_id : null,
                  descricao: form.descricao,
                  valor: Number(form.valor),
                  data_recebimento: form.data,
                });
              }}
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
