import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Download, FileText, Paperclip, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/pi-anexos")({
  head: () => ({ meta: [{ title: "PIs Anexados — Mídia.OS" }] }),
  component: PiAnexosPage,
});

type Row = {
  id: string;
  titulo: string;
  periodo_referencia: string | null;
  arquivo_path: string;
  arquivo_nome: string;
  arquivo_tamanho: number | null;
  cliente_id: string | null;
  agencia_id: string | null;
  pi_id: string | null;
  created_by: string | null;
  created_at: string;
  valor_bruto: number | null;
  valor_liquido: number | null;
  cliente?: { razao_social: string | null; nome_fantasia: string | null } | null;
  agencia?: { razao_social: string | null; nome_fantasia: string | null } | null;
  pi?: { numero: string | null; campanha: string | null } | null;
};

function formatBRL(v: number | null) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v) || 0,
  );
}
function formatBytes(n: number | null) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${u[i]}`;
}

function PiAnexosPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, roles, loading: rolesLoading } = useUserRoles();
  const isExecutivo = roles.includes("executivo");
  const isProducao = roles.includes("producao");
  const autorizado = isAdmin || isExecutivo || isProducao;
  const [busca, setBusca] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pi-anexos-todos"],
    enabled: !!user && autorizado,
    queryFn: async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id || "");
      const userRoles = (roleRows ?? []).map((r) => r.role);
      const isProducaoOnly =
        userRoles.includes("producao") &&
        !userRoles.includes("admin") &&
        !userRoles.includes("executivo");

      let query = supabase.from("pi_anexos").select(`
          id, titulo, periodo_referencia, arquivo_path, arquivo_nome, arquivo_tamanho,
          cliente_id, agencia_id, pi_id, created_by, created_at, valor_bruto, valor_liquido,
          cliente:clientes(razao_social, nome_fantasia),
          agencia:agencias(razao_social, nome_fantasia),
          pi:pis(numero, campanha, producao_tipo)
        `);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      let resRows = (data ?? []) as unknown as Row[];

      if (isProducaoOnly) {
        resRows = resRows.filter((r) => (r as any).pi?.producao_tipo === "interna");
      }

      return resRows;
    },
  });

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [
        r.titulo,
        r.arquivo_nome,
        r.periodo_referencia,
        r.cliente?.razao_social,
        r.cliente?.nome_fantasia,
        r.agencia?.razao_social,
        r.agencia?.nome_fantasia,
        r.pi?.numero,
        r.pi?.campanha,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, busca]);

  const totais = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.bruto += Number(r.valor_bruto || 0);
        acc.liquido += Number(r.valor_liquido || 0);
        return acc;
      },
      { bruto: 0, liquido: 0 },
    );
  }, [filtered]);

  async function baixar(row: Row) {
    const { data, error } = await supabase.storage
      .from("pi-anexos")
      .createSignedUrl(row.arquivo_path, 60, { download: row.arquivo_nome });
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Paperclip className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold leading-tight">PIs Anexados</h1>
            <p className="text-sm text-muted-foreground">
              Todos os PIs anexados, incluindo os vinculados a clientes, agências ou PIs
              específicos.
            </p>
          </div>
        </div>

        {authLoading || rolesLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !autorizado ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Acesso restrito a administradores, executivos e equipe de produção.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, cliente, agência, PI..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">Total: {filtered.length}</Badge>
                <Badge variant="secondary">Bruto: {formatBRL(totais.bruto)}</Badge>
                <Badge variant="secondary">Líquido: {formatBRL(totais.liquido)}</Badge>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <p className="p-6 text-sm text-muted-foreground">Carregando anexos...</p>
                ) : filtered.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">Nenhum anexo encontrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Vinculado a</TableHead>
                          <TableHead>PI</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead className="text-right">Bruto</TableHead>
                          <TableHead className="text-right">Líquido</TableHead>
                          <TableHead>Arquivo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => {
                          const vinc =
                            r.cliente?.razao_social ||
                            r.cliente?.nome_fantasia ||
                            r.agencia?.razao_social ||
                            r.agencia?.nome_fantasia ||
                            "—";
                          const tipo = r.cliente_id
                            ? "Cliente"
                            : r.agencia_id
                              ? "Agência"
                              : r.pi_id
                                ? "PI"
                                : "—";
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <FileText className="size-4 text-primary shrink-0" />
                                  <span className="truncate max-w-[240px]" title={r.titulo}>
                                    {r.titulo}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{vinc}</div>
                                <div className="text-[11px] text-muted-foreground">{tipo}</div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.pi?.numero ? (
                                  <div>
                                    <div className="font-medium">{r.pi.numero}</div>
                                    {r.pi.campanha && (
                                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                        {r.pi.campanha}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.periodo_referencia || "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatBRL(r.valor_bruto)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatBRL(r.valor_liquido)}
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="truncate max-w-[180px]" title={r.arquivo_nome}>
                                  {r.arquivo_nome}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {formatBytes(r.arquivo_tamanho)}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline" onClick={() => baixar(r)}>
                                  <Download className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
