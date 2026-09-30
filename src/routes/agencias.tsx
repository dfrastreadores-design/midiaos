import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, MapPin, Upload, Search, Building2, Download } from "lucide-react";
import { exportToXlsx, exportToPdf } from "@/lib/export-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listAgencias, deleteAgencia } from "@/lib/agencias.functions";
import { listExecutivos } from "@/lib/atendimento.functions";
import { AgenciaFormDialog } from "@/components/AgenciaFormDialog";
import { AtribuirExecutivoButton } from "@/components/AtribuirExecutivoButton";
import { ImportarEntidadeDialog } from "@/components/ImportarEntidadeDialog";
import { useUserRoles } from "@/hooks/use-roles";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/agencias")({
  head: () => ({ meta: [{ title: "Agências — Mídia.OS" }] }),
  component: Agencias,
});

type Row = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  apelido: string | null;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  executivo_id: string | null;
  status: string;
  contatos: Array<{ nome: string; email?: string; telefone?: string }> | null;
};

function Agencias() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRoles();
  const [search, setSearch] = useState("");
  const [ufFilter, setUfFilter] = useState<string>("all");
  const [execFilter, setExecFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["agencias"],
    queryFn: () => listAgencias() as unknown as Promise<Row[]>,
  });
  const { data: executivos = [] } = useQuery({
    queryKey: ["executivos-atendimento"],
    queryFn: () => listExecutivos() as unknown as Promise<{ id: string; nome: string }[]>,
    enabled: isAdmin,
  });
  const execMap = new Map(executivos.map((e) => [e.id, e.nome]));

  const del = useMutation({
    mutationFn: (id: string) => deleteAgencia({ data: { id } }),
    onSuccess: () => {
      toast.success("Agência removida");
      qc.invalidateQueries({ queryKey: ["agencias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = rows.filter((a) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      a.razao_social.toLowerCase().includes(s) ||
      a.nome_fantasia?.toLowerCase().includes(s) ||
      a.apelido?.toLowerCase().includes(s) ||
      a.cnpj?.includes(s) ||
      a.cidade?.toLowerCase().includes(s);

    const matchUf = ufFilter === "all" || a.uf === ufFilter;
    const matchExec = execFilter === "all" || a.executivo_id === execFilter;

    return matchSearch && matchUf && matchExec;
  });

  const ufs = Array.from(new Set(rows.map((r) => r.uf).filter(Boolean))).sort();

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Agências de Publicidade
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length} cadastradas</p>
        </div>
        <div className="flex gap-2">
          {(() => {
            const buildData = () =>
              filtered.map((a) => ({
                razao_social: a.razao_social,
                nome_fantasia: a.nome_fantasia ?? "",
                apelido: a.apelido ?? "",
                cnpj: a.cnpj ?? "",
                cidade: a.cidade ?? "",
                uf: a.uf ?? "",
                atendimento: a.executivo_id ? (execMap.get(a.executivo_id) ?? "") : "",
                status: a.status,
                contato_nome: a.contatos?.[0]?.nome ?? "",
                contato_email: a.contatos?.[0]?.email ?? "",
                contato_telefone: a.contatos?.[0]?.telefone ?? "",
              }));
            const fname = () => {
              const suffix =
                execFilter !== "all"
                  ? `-${(execMap.get(execFilter) ?? "exec").replace(/\s+/g, "_")}`
                  : "";
              return `agencias${suffix}`;
            };
            const handle = (kind: "xlsx" | "pdf") => {
              const data = buildData();
              if (!data.length) {
                toast.error("Nenhuma agência para exportar");
                return;
              }
              if (kind === "xlsx") exportToXlsx(fname(), data, "Agências");
              else exportToPdf(fname(), data, "Agências");
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
            <Plus className="size-4 mr-2" /> Nova Agência
          </Button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou cidade…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          <Select value={ufFilter} onValueChange={setUfFilter}>
            <SelectTrigger className="w-[100px] bg-background">
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

          {isAdmin && (
            <Select value={execFilter} onValueChange={setExecFilter}>
              <SelectTrigger className="w-[180px] bg-background">
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

          {(search || ufFilter !== "all" || execFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setUfFilter("all");
                setExecFilter("all");
              }}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}
      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Nenhuma agência encontrada com os filtros atuais.
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <Card key={a.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-display font-semibold text-lg">
                    {a.nome_fantasia || a.razao_social}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.cnpj || "—"}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(a);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Excluir agência?")) del.mutate(a.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                <MapPin className="size-4 shrink-0" />
                <span className="truncate">
                  {[a.cidade, a.uf].filter(Boolean).join("/") || "Endereço não informado"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="size-4 shrink-0" />
                <span className="truncate">{a.razao_social}</span>
              </div>
              {isAdmin && (
                <div className="mt-2 -ml-2">
                  <AtribuirExecutivoButton
                    tipo="agencia"
                    id={a.id}
                    executivoId={a.executivo_id}
                    executivoNome={a.executivo_id ? (execMap.get(a.executivo_id) ?? null) : null}
                    queryKey="agencias"
                  />
                </div>
              )}
              {a.contatos && a.contatos.length > 0 && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Contato</div>
                  <div className="font-medium">{a.contatos[0].nome}</div>
                  {a.contatos[0].email && (
                    <div className="text-xs text-muted-foreground">{a.contatos[0].email}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AgenciaFormDialog open={open} onOpenChange={setOpen} initial={editing as never} />
      <ImportarEntidadeDialog open={importOpen} onOpenChange={setImportOpen} tipo="agencia" />
    </AppShell>
  );
}
