import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Target, ShieldAlert, Save } from "lucide-react";
import { toast } from "sonner";
import { listMetas, upsertMeta } from "@/lib/metas.functions";
import { useUserRoles } from "@/hooks/use-roles";
import { formatBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [{ title: "Metas dos Executivos — Mídia.OS" }] }),
  component: MetasPage,
});

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function MetasPage() {
  const { isAdmin, roles, loading } = useUserRoles();
  const isDiretoria = roles.includes("diretoria");
  const canManage = isAdmin || isDiretoria;
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const qc = useQueryClient();
  const fetchList = useServerFn(listMetas);
  const saveFn = useServerFn(upsertMeta);

  const { data, isLoading } = useQuery({
    queryKey: ["metas", ano, mes],
    queryFn: () => fetchList({ data: { ano, mes } }),
    enabled: canManage,
  });

  const [edits, setEdits] = useState<Record<string, string>>({});

  const saveMut = useMutation({
    mutationFn: (vars: { executivo_id: string; valor_meta: number }) =>
      saveFn({ data: { ...vars, ano, mes } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metas", ano, mes] });
      toast.success("Meta salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <AppShell><p className="text-muted-foreground text-sm">Carregando…</p></AppShell>;

  if (!canManage) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto mt-20 text-center space-y-3">
          <ShieldAlert className="size-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Somente os perfis <strong>Admin</strong> e <strong>Diretoria</strong> podem lançar as metas dos executivos.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight flex items-center gap-2">
            <Target className="size-6" />Metas dos Executivos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Defina a meta mensal de faturamento de cada executivo.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            className="w-28"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Executivo</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Meta atual</TableHead>
                <TableHead className="w-72">Nova meta (R$)</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum executivo encontrado.</TableCell></TableRow>
              )}
              {(data ?? []).map(({ executivo, meta }: any) => {
                const draft = edits[executivo.id];
                const current = meta ? Number(meta.valor_meta) : 0;
                return (
                  <TableRow key={executivo.id}>
                    <TableCell className="font-medium">{executivo.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{executivo.email}</TableCell>
                    <TableCell className="text-right">{meta ? formatBRL(current) : "—"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={current ? String(current) : "0,00"}
                        value={draft ?? ""}
                        onChange={(e) => setEdits((s) => ({ ...s, [executivo.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!draft || saveMut.isPending}
                        onClick={() => {
                          const v = Number(draft);
                          if (Number.isNaN(v) || v < 0) return toast.error("Valor inválido");
                          saveMut.mutate(
                            { executivo_id: executivo.id, valor_meta: v },
                            { onSuccess: () => setEdits((s) => ({ ...s, [executivo.id]: "" })) },
                          );
                        }}
                      >
                        <Save className="size-4 mr-1" />Salvar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
