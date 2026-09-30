import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2, Pencil, Trash2, Plus, Upload, Eye, Download } from "lucide-react";
import { exportToXlsx, exportToPdf } from "@/lib/export-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportarEntidadeDialog } from "@/components/ImportarEntidadeDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listClientes, deleteCliente } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listExecutivos } from "@/lib/atendimento.functions";
import { ClienteFormDialog } from "@/components/ClienteFormDialog";
import { ClienteDetalhesDialog, type ClienteDetalhes } from "@/components/ClienteDetalhesDialog";
import { AtribuirExecutivoButton } from "@/components/AtribuirExecutivoButton";
import { useUserRoles } from "@/hooks/use-roles";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Mídia.OS" }] }),
  component: Clientes,
});

type Row = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  apelido: string | null;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  agencia_id: string | null;
  executivo_id: string | null;
  status: string;
  agencia?: { razao_social: string; nome_fantasia: string | null } | null;
};

function Clientes() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRoles();
  const [search, setSearch] = useState("");
  const [ufFilter, setUfFilter] = useState<string>("all");
  const [execFilter, setExecFilter] = useState<string>("all");
  const [agenciaFilter, setAgenciaFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [detalhes, setDetalhes] = useState<ClienteDetalhes | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes() as unknown as Promise<Row[]>,
  });
  const { data: agencias = [] } = useQuery({
    queryKey: ["agencias"],
    queryFn: () => listAgencias(),
  });
  const { data: executivos = [] } = useQuery({
    queryKey: ["executivos-atendimento"],
    queryFn: () => listExecutivos() as unknown as Promise<{ id: string; nome: string }[]>,
    enabled: isAdmin,
  });
  const execMap = new Map(executivos.map((e) => [e.id, e.nome]));

  const del = useMutation({
    mutationFn: (id: string) => deleteCliente({ data: { id } }),
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = rows.filter((c) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      c.razao_social.toLowerCase().includes(s) ||
      c.nome_fantasia?.toLowerCase().includes(s) ||
      c.apelido?.toLowerCase().includes(s) ||
      c.cnpj?.includes(s) ||
      c.cidade?.toLowerCase().includes(s);

    const matchUf = ufFilter === "all" || c.uf === ufFilter;
    const matchExec = execFilter === "all" || c.executivo_id === execFilter;
    const matchAgencia =
      agenciaFilter === "all" ||
      (agenciaFilter === "direto" ? !c.agencia_id : c.agencia_id === agenciaFilter);

    return matchSearch && matchUf && matchExec && matchAgencia;
  });

  const ufs = Array.from(new Set(rows.map((r) => r.uf).filter(Boolean))).sort();

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Clientes Anunciantes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length} cadastrados</p>
        </div>
        <div className="flex gap-2">
          {(() => {
            const buildData = () =>
              filtered.map((c) => ({
                razao_social: c.razao_social,
                nome_fantasia: c.nome_fantasia ?? "",
                apelido: c.apelido ?? "",
                cnpj: c.cnpj ?? "",
                cidade: c.cidade ?? "",
                uf: c.uf ?? "",
                agencia: c.agencia?.nome_fantasia || c.agencia?.razao_social || "Direto",
                atendimento: c.executivo_id ? (execMap.get(c.executivo_id) ?? "") : "",
                status: c.status,
              }));
            const fname = () => {
              const suffix =
                execFilter !== "all"
                  ? `-${(execMap.get(execFilter) ?? "exec").replace(/\s+/g, "_")}`
                  : "";
              return `clientes${suffix}`;
            };
            const handle = (kind: "xlsx" | "pdf") => {
              const data = buildData();
              if (!data.length) {
                toast.error("Nenhum cliente para exportar");
                return;
              }
              if (kind === "xlsx") exportToXlsx(fname(), data, "Clientes");
              else exportToPdf(fname(), data, "Clientes");
            };
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="size-4 mr-2" /> Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handle("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handle("pdf")}>PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4 mr-2" /> Importar planilha
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou cidade…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={ufFilter} onValueChange={setUfFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas UFs</SelectItem>
                  {ufs.map((uf) => (
                    <SelectItem key={uf} value={uf!}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={agenciaFilter} onValueChange={setAgenciaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Agência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Agências</SelectItem>
                  <SelectItem value="direto">Somente Direto</SelectItem>
                  {agencias.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome_fantasia || a.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select value={execFilter} onValueChange={setExecFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Atendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Atendimentos</SelectItem>
                    {executivos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(search ||
                ufFilter !== "all" ||
                execFilter !== "all" ||
                agenciaFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setUfFilter("all");
                    setExecFilter("all");
                    setAgenciaFilter("all");
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Agência</TableHead>
                {isAdmin && <TableHead>Atendimento</TableHead>}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 6 : 5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 6 : 5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum cliente. Clique em "Novo Cliente".
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium">{c.nome_fantasia || c.razao_social}</div>
                        <div className="text-xs text-muted-foreground">{c.razao_social}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.cnpj || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {[c.cidade, c.uf].filter(Boolean).join("/") || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.agencia ? (
                      <Badge variant="outline">
                        {c.agencia.nome_fantasia || c.agencia.razao_social}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Direto</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <AtribuirExecutivoButton
                        tipo="cliente"
                        id={c.id}
                        executivoId={c.executivo_id}
                        executivoNome={
                          c.executivo_id ? (execMap.get(c.executivo_id) ?? null) : null
                        }
                        queryKey="clientes"
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Ver detalhes"
                        onClick={() => setDetalhes(c as unknown as ClienteDetalhes)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Excluir cliente?")) del.mutate(c.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ClienteFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        agencias={agencias.map((a) => ({ id: a.id, nome: a.nome_fantasia || a.razao_social }))}
      />
      <ImportarEntidadeDialog open={importOpen} onOpenChange={setImportOpen} tipo="cliente" />
      <ClienteDetalhesDialog
        open={!!detalhes}
        onOpenChange={(v) => !v && setDetalhes(null)}
        cliente={detalhes}
      />
    </AppShell>
  );
}
