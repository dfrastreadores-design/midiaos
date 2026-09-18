import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPis } from "@/lib/pi.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Download, FileText, Loader2, Pencil, Trash2, Upload, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Mídia.OS" }] }),
  component: Financeiro,
});

const BUCKET = "financeiro-docs";

type Fin = {
  id: string;
  pi_id: string;
  nota_fiscal_numero: string | null;
  nota_fiscal_path: string | null;
  boleto_path: string | null;
  vencimento_boleto: string | null;
  valor: number | null;
  status_pagamento: string;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

function Financeiro() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ pi: any; fin: Fin | null } | null>(null);

  const { data: pis = [] } = useQuery({
    queryKey: ["pis-financeiro"],
    queryFn: () => listPis(),
  });

  const { data: financeiros = [] } = useQuery({
    queryKey: ["pi_financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pi_financeiro").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fin[];
    },
  });

  const finByPi = useMemo(() => {
    const m = new Map<string, Fin>();
    for (const f of financeiros) if (!m.has(f.pi_id)) m.set(f.pi_id, f);
    return m;
  }, [financeiros]);

  const rows = useMemo(() => {
    const filtered = pis.filter((p: any) => {
      if (p.status === "cancelado" || p.status === "substituido") return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.numero?.toLowerCase().includes(s) ||
        p.campanha?.toLowerCase().includes(s) ||
        p.cliente?.razao_social?.toLowerCase().includes(s) ||
        p.cliente?.nome_fantasia?.toLowerCase().includes(s) ||
        p.agencia?.razao_social?.toLowerCase().includes(s)
      );
    });
    return filtered;
  }, [pis, search]);

  const totals = useMemo(() => {
    let aRec = 0, pago = 0, vencido = 0, pend = 0;
    const today = new Date().toISOString().split("T")[0];
    for (const pi of rows) {
      const f = finByPi.get(pi.id);
      const v = (f?.valor ?? pi.valor_negociado) || 0;
      aRec += v;
      if (f?.status_pagamento === "pago") pago += v;
      else if (f?.vencimento_boleto && f.vencimento_boleto < today) vencido += v;
      else pend += v;
    }
    return { aRec, pago, vencido, pend };
  }, [rows, finByPi]);

  const del = useMutation({
    mutationFn: async (f: Fin) => {
      const paths = [f.nota_fiscal_path, f.boleto_path].filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      const { error } = await supabase.from("pi_financeiro").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registro removido"); qc.invalidateQueries({ queryKey: ["pi_financeiro"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleDownload(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error("Erro ao gerar link"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="size-6" />
            <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">Painel Financeiro</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Controle de NF, boletos e pagamentos por PI</p>
        </div>
        <Input
          placeholder="Buscar por PI, campanha, cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">A Receber</div><div className="text-2xl font-display font-semibold mt-1">{formatBRL(totals.aRec)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pago</div><div className="text-2xl font-display font-semibold mt-1 text-success">{formatBRL(totals.pago)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pendente</div><div className="text-2xl font-display font-semibold mt-1 text-warning">{formatBRL(totals.pend)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Vencido</div><div className="text-2xl font-display font-semibold mt-1 text-destructive">{formatBRL(totals.vencido)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Contas a Receber</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PI</TableHead>
                <TableHead>Cliente / Campanha</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Boleto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">Nenhum PI encontrado.</TableCell></TableRow>
              ) : rows.map((pi: any) => {
                const f = finByPi.get(pi.id);
                const today = new Date().toISOString().split("T")[0];
                const isVencido = f?.vencimento_boleto && f.vencimento_boleto < today && f.status_pagamento !== "pago";
                const valor = (f?.valor ?? pi.valor_negociado) || 0;
                return (
                  <TableRow key={pi.id}>
                    <TableCell className="font-mono text-xs">{pi.numero}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{pi.cliente?.nome_fantasia || pi.cliente?.razao_social || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{pi.campanha}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {f?.nota_fiscal_numero ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{f.nota_fiscal_numero}</span>
                          {f.nota_fiscal_path && (
                            <Button size="icon" variant="ghost" className="size-6" onClick={() => handleDownload(f.nota_fiscal_path!)}>
                              <FileText className="size-3" />
                            </Button>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className={cn("text-xs", isVencido && "text-destructive font-semibold")}>
                      {formatDate(f?.vencimento_boleto ?? null)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs">{formatBRL(valor)}</TableCell>
                    <TableCell>
                      {f?.boleto_path ? (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => handleDownload(f.boleto_path!)}>
                          <Download className="size-3 mr-1" /> Boleto
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={f?.status_pagamento === "pago" ? "default" : isVencido ? "destructive" : "secondary"}>
                        {f?.status_pagamento === "pago" ? "Pago" : isVencido ? "Vencido" : f?.status_pagamento === "parcial" ? "Parcial" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing({ pi, fin: f ?? null })}>
                          <Pencil className="size-3" />
                        </Button>
                        {f && (
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => { if (confirm("Remover registro financeiro?")) del.mutate(f); }}>
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <FinanceiroDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          pi={editing.pi}
          fin={editing.fin}
          userId={user?.id ?? null}
          onSaved={() => qc.invalidateQueries({ queryKey: ["pi_financeiro"] })}
        />
      )}
    </AppShell>
  );
}

function FinanceiroDialog({
  open, onClose, pi, fin, userId, onSaved,
}: { open: boolean; onClose: () => void; pi: any; fin: Fin | null; userId: string | null; onSaved: () => void }) {
  const nfRef = useRef<HTMLInputElement>(null);
  const boletoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nota_fiscal_numero: fin?.nota_fiscal_numero ?? "",
    vencimento_boleto: fin?.vencimento_boleto ?? "",
    valor: String(fin?.valor ?? pi.valor_negociado ?? ""),
    status_pagamento: fin?.status_pagamento ?? "pendente",
    data_pagamento: fin?.data_pagamento ?? "",
    observacoes: fin?.observacoes ?? "",
  });
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadFile(file: File, kind: "nf" | "boleto") {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `pi/${pi.id}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (up.error) throw up.error;
    return path;
  }

  async function save() {
    if (!userId) { toast.error("Usuário não autenticado"); return; }
    setSaving(true);
    try {
      let nf_path = fin?.nota_fiscal_path ?? null;
      let bol_path = fin?.boleto_path ?? null;
      if (nfFile) {
        if (nf_path) await supabase.storage.from(BUCKET).remove([nf_path]);
        nf_path = await uploadFile(nfFile, "nf");
      }
      if (boletoFile) {
        if (bol_path) await supabase.storage.from(BUCKET).remove([bol_path]);
        bol_path = await uploadFile(boletoFile, "boleto");
      }
      const payload = {
        pi_id: pi.id,
        nota_fiscal_numero: form.nota_fiscal_numero.trim() || null,
        nota_fiscal_path: nf_path,
        boleto_path: bol_path,
        vencimento_boleto: form.vencimento_boleto || null,
        valor: form.valor ? Number(form.valor) : null,
        status_pagamento: form.status_pagamento,
        data_pagamento: form.data_pagamento || null,
        observacoes: form.observacoes.trim() || null,
      };
      if (fin) {
        const { error } = await supabase.from("pi_financeiro").update(payload).eq("id", fin.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pi_financeiro").insert({ ...payload, criado_por: userId });
        if (error) throw error;
      }
      toast.success("Registro salvo");
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Financeiro — {pi.numero}</DialogTitle>
          <p className="text-xs text-muted-foreground">{pi.cliente?.nome_fantasia || pi.cliente?.razao_social} · {pi.campanha}</p>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Número da Nota Fiscal</Label>
              <Input value={form.nota_fiscal_numero} onChange={(e) => setForm({ ...form, nota_fiscal_numero: e.target.value })} placeholder="Ex.: 000123" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vencimento do Boleto</Label>
              <Input type="date" value={form.vencimento_boleto} onChange={(e) => setForm({ ...form, vencimento_boleto: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status do Pagamento</Label>
              <Select value={form.status_pagamento} onValueChange={(v) => setForm({ ...form, status_pagamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status_pagamento === "pago" && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Data do Pagamento</Label>
                <Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1 rounded-lg border p-3 bg-muted/30">
              <Label className="text-xs font-semibold">Nota Fiscal (PDF/Imagem)</Label>
              <Input ref={nfRef} type="file" accept="application/pdf,image/*" onChange={(e) => setNfFile(e.target.files?.[0] ?? null)} />
              {fin?.nota_fiscal_path && !nfFile && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <FileText className="size-3" /> Arquivo já anexado
                </p>
              )}
            </div>
            <div className="space-y-1 rounded-lg border p-3 bg-muted/30">
              <Label className="text-xs font-semibold">Boleto (PDF/Imagem)</Label>
              <Input ref={boletoRef} type="file" accept="application/pdf,image/*" onChange={(e) => setBoletoFile(e.target.files?.[0] ?? null)} />
              {fin?.boleto_path && !boletoFile && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <FileText className="size-3" /> Arquivo já anexado
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
