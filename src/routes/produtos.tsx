import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Tv, Radio, Monitor, Building2, Tags, Upload } from "lucide-react";
import { toast } from "sonner";
import { listProdutos, upsertProduto, deleteProduto, listProdutoTipos, upsertProdutoTipo, deleteProdutoTipo } from "@/lib/produtos.functions";
import { listMidiaConfig, upsertMidiaConfig } from "@/lib/midia-config.functions";
import { useUserRoles } from "@/hooks/use-roles";
import { formatBRL } from "@/lib/mock-data";
import { LogoImg } from "@/components/LogoImg";
import { ProdutoFormDialog, type Produto } from "@/components/ProdutoFormDialog";
import { ImportarProdutosDialog } from "@/components/ImportarProdutosDialog";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Mídia.OS" }] }),
  component: ProdutosPage,
});

type Midia = "TV" | "Radio" | "DOOH";

const midiaLabel = { TV: "TV", Radio: "Rádio", DOOH: "DOOH" } as const;

type MidiaConfig = {
  midia: Midia;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  logo_url: string | null;
  observacao: string | null;
};

type ProdutoTipo = {
  id: string;
  nome: string;
  midia: Midia;
};

function ProdutosPage() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRoles();
  const fetchList = useServerFn(listProdutos);
  const deleteFn = useServerFn(deleteProduto);
  const fetchConfigs = useServerFn(listMidiaConfig);
  const upsertConfigFn = useServerFn(upsertMidiaConfig);
  const fetchTipos = useServerFn(listProdutoTipos);
  
  const [tab, setTab] = useState<Midia>("TV");
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("__all__");
  const [filtroStatus, setFiltroStatus] = useState<"all" | "ativo" | "inativo">("all");
  const [editing, setEditing] = useState<Partial<Produto> | null>(null);
  const [open, setOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgEditing, setCfgEditing] = useState<Partial<MidiaConfig> | null>(null);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["produtos"], queryFn: () => fetchList() });
  const { data: configs } = useQuery({ queryKey: ["midia_config"], queryFn: () => fetchConfigs() });
  const { data: todosTipos = [] } = useQuery({ queryKey: ["produto_tipos"], queryFn: () => fetchTipos() });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCfgMut = useMutation({
    mutationFn: (c: any) => upsertConfigFn({ data: c }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["midia_config"] });
      toast.success("Dados da emissora salvos");
      setCfgOpen(false);
      setCfgEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allProdutos = (data as Produto[]) ?? [];
  const q = search.trim().toLowerCase();
  const list = allProdutos.filter((p) => {
    if (p.midia !== tab) return false;
    if (filtroTipo !== "__all__" && (p.tipo ?? "") !== filtroTipo) return false;
    if (filtroStatus === "ativo" && !p.ativo) return false;
    if (filtroStatus === "inativo" && p.ativo) return false;
    if (!q) return true;
    return [p.nome, p.tipo, p.programa, p.formato, p.faixa]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  
  // Extrair sugestões únicas para os campos
  const tiposDaMidia = (todosTipos as ProdutoTipo[]).filter(t => t.midia === tab).map(t => t.nome);
  const tiposSugeridos = Array.from(new Set([...tiposDaMidia, ...allProdutos.map(p => p.tipo).filter((v): v is string => Boolean(v))])).sort();
  const programasSugeridos = Array.from(new Set(allProdutos.map(p => p.programa).filter(Boolean))).sort();
  const formatosSugeridos = Array.from(new Set(allProdutos.map(p => p.formato).filter(Boolean))).sort();
  const faixasSugeridas = Array.from(new Set(allProdutos.map(p => p.faixa).filter(Boolean))).sort();


  const currentCfg = ((configs as MidiaConfig[]) ?? []).find((c) => c.midia === tab);

  const openNew = () => {
    setEditing({
      midia: tab, nome: "", duracao_segundos: 30, insercoes_padrao: 1, valor_unit: 0, ativo: true,
    });
    setOpen(true);
  };

  const openCfg = () => {
    setCfgEditing(currentCfg ?? { midia: tab });
    setCfgOpen(true);
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro de produtos de TV, Rádio e DOOH (valor, tempo e inserções padrão).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4 mr-2" />Importar produtos
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setTiposOpen(true)}>
                <Tags className="size-4 mr-2" />Tipos de Produto
              </Button>
              <Button variant="outline" onClick={openCfg}>
                <Building2 className="size-4 mr-2" />Dados da emissora ({midiaLabel[tab]})
              </Button>
              <Button onClick={openNew}><Plus className="size-4 mr-2" />Novo Produto</Button>
            </>
          )}
        </div>

      </div>

      {currentCfg && (currentCfg.cnpj || currentCfg.razao_social) && (
        <Card className="mb-4">
          <CardContent className="py-3 px-4 text-sm flex flex-wrap gap-x-6 gap-y-1">
            <span><strong>{midiaLabel[tab]}:</strong> {currentCfg.razao_social ?? "—"}</span>
            {currentCfg.cnpj && <span><strong>CNPJ:</strong> {currentCfg.cnpj}</span>}
            {currentCfg.cidade && <span><strong>Cidade:</strong> {currentCfg.cidade}{currentCfg.uf ? `/${currentCfg.uf}` : ""}</span>}
          </CardContent>
        </Card>
      )}

      <ImportarProdutosDialog open={importOpen} onOpenChange={setImportOpen} midiaPadrao={tab} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Midia)}>
        <TabsList>
          <TabsTrigger value="TV"><Tv className="size-4 mr-1.5" />TV</TabsTrigger>
          <TabsTrigger value="Radio"><Radio className="size-4 mr-1.5" />Rádio</TabsTrigger>
          <TabsTrigger value="DOOH"><Monitor className="size-4 mr-1.5" />DOOH</TabsTrigger>
        </TabsList>

        {(["TV", "Radio", "DOOH"] as Midia[]).map((m) => (
          <TabsContent key={m} value={m} className="mt-4 space-y-3">
            <Card>
              <CardContent className="p-3 flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Pesquisar por nome, tipo, programa, formato ou faixa…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os tipos</SelectItem>
                    {tiposSugeridos.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground ml-auto">
                  {list.length} resultado{list.length === 1 ? "" : "s"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Programa / Faixa</TableHead>
                      <TableHead className="text-right">Duração</TableHead>
                      <TableHead className="text-right">Inserções</TableHead>
                      <TableHead className="text-right">Valor unit.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
                    )}
                    {!isLoading && list.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum produto cadastrado.</TableCell></TableRow>
                    )}
                    {list.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{p.programa || "—"}</span>
                            <span className="text-[11px] opacity-70">
                              {[p.faixa, p.formato].filter(Boolean).join(" • ") || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{p.duracao_segundos}s</TableCell>
                        <TableCell className="text-right">{p.insercoes_padrao}</TableCell>
                        <TableCell className="text-right">{formatBRL(Number(p.valor_unit))}</TableCell>
                        <TableCell>
                          <Badge variant={p.ativo ? "default" : "outline"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => {
                                if (confirm(`Remover "${p.nome}"?`)) delMut.mutate(p.id);
                              }}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <ProdutoFormDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        initial={editing}
        sugestoes={{
          tipos: tiposSugeridos as string[],
          programas: programasSugeridos as string[],
          formatos: formatosSugeridos as string[],
          faixas: faixasSugeridas as string[],
        }}
      />


      <MidiaConfigDialog
        open={cfgOpen}
        onOpenChange={(v) => { setCfgOpen(v); if (!v) setCfgEditing(null); }}
        value={cfgEditing}
        onChange={setCfgEditing}
        onSave={() => cfgEditing && saveCfgMut.mutate(cfgEditing)}
        saving={saveCfgMut.isPending}
      />

      <ProdutoTiposDialog
        open={tiposOpen}
        onOpenChange={setTiposOpen}
        tipos={todosTipos as ProdutoTipo[]}
        midia={tab}
      />
    </AppShell>
  );
}

function ProdutoTiposDialog({
  open, onOpenChange, tipos, midia
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipos: ProdutoTipo[];
  midia: Midia;
}) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertProdutoTipo);
  const deleteFn = useServerFn(deleteProdutoTipo);
  const [novo, setNovo] = useState("");

  const tiposDaMidia = tipos.filter(t => t.midia === midia);

  const addMut = useMutation({
    mutationFn: () => upsertFn({ data: { nome: novo, midia } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produto_tipos"] });
      setNovo("");
      toast.success("Tipo adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produto_tipos"] });
      toast.success("Tipo removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Tipos de Produto ({midia})</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Input 
              placeholder="Novo tipo (ex: VT, Spot...)" 
              value={novo} 
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && novo.trim() && addMut.mutate()}
            />
            <Button onClick={() => addMut.mutate()} disabled={!novo.trim() || addMut.isPending}>
              Adicionar
            </Button>
          </div>

          <div className="rounded-md border divide-y max-h-[300px] overflow-y-auto">
            {tiposDaMidia.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">Nenhum tipo cadastrado para esta mídia.</div>
            )}
            {tiposDaMidia.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">{t.nome}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => confirm(`Remover o tipo "${t.nome}"?`) && delMut.mutate(t.id)}
                  disabled={delMut.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MidiaConfigDialog({
  open, onOpenChange, value, onChange, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: Partial<MidiaConfig> | null;
  onChange: (v: Partial<MidiaConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!value) return null;
  const set = (patch: Partial<MidiaConfig>) => onChange({ ...value, ...patch });

  const lookupCnpj = async () => {
    try {
      const { fetchCnpj, onlyDigits } = await import("@/lib/cnpj");
      const digits = onlyDigits(value.cnpj ?? "");
      if (digits.length !== 14) return toast.error("Informe um CNPJ válido");
      const d = await fetchCnpj(value.cnpj ?? "");
      set({
        cnpj: d.cnpj,
        razao_social: d.razaoSocial || value.razao_social || "",
        nome_fantasia: value.nome_fantasia || d.nomeFantasia,
        cep: d.cep || value.cep,
        endereco: [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", ") || value.endereco || "",
        cidade: d.cidade || value.cidade,
        uf: d.estado || value.uf,
        telefone: value.telefone || d.telefone,
        email: value.email || d.email,
        inscricao_estadual: (value.inscricao_estadual && value.inscricao_estadual.trim())
          ? value.inscricao_estadual
          : (d.inscricaoEstadual || "ISENTA"),
        inscricao_municipal: (value.inscricao_municipal && value.inscricao_municipal.trim())
          ? value.inscricao_municipal
          : (d.inscricaoMunicipal || "ISENTA"),
      });
      toast.success("Dados preenchidos pela Receita Federal");
    } catch (e) { toast.error((e as Error).message); }
  };

  const uploadLogo = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) return toast.error("Logo deve ter no máximo 4MB");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split(".").pop() || "png";
      const path = `emissora-${value.midia}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("client-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      // Bucket privado: guardamos apenas o path.
      set({ logo_url: path });
      toast.success("Logo enviada");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados da emissora — {midiaLabel[value.midia as Midia]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Logo (usada no cabeçalho da PI)</Label>
            <div className="flex items-center gap-3">
              {value.logo_url && (
                <div className="relative h-16 w-32 rounded-md border bg-muted/30 overflow-hidden">
                  <LogoImg stored={value.logo_url} alt="Logo" className="h-full w-full object-contain" />
                </div>
              )}
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} className="max-w-xs" />
              {value.logo_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set({ logo_url: null })}>Remover</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label>CNPJ</Label>
              <Input value={value.cnpj ?? ""} onChange={(e) => set({ cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
            <Button type="button" variant="secondary" onClick={lookupCnpj}>Buscar CNPJ</Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Razão Social</Label>
              <Input value={value.razao_social ?? ""} onChange={(e) => set({ razao_social: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input value={value.nome_fantasia ?? ""} onChange={(e) => set({ nome_fantasia: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inscrição Estadual</Label>
              <Input value={value.inscricao_estadual ?? ""} onChange={(e) => set({ inscricao_estadual: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Inscrição Municipal</Label>
              <Input value={value.inscricao_municipal ?? ""} onChange={(e) => set({ inscricao_municipal: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Endereço completo</Label>
            <Input value={value.endereco ?? ""} onChange={(e) => set({ endereco: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={value.cep ?? ""} onChange={(e) => set({ cep: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={value.cidade ?? ""} onChange={(e) => set({ cidade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input value={value.uf ?? ""} onChange={(e) => set({ uf: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={value.telefone ?? ""} onChange={(e) => set({ telefone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={value.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Site</Label>
            <Input value={value.site ?? ""} onChange={(e) => set({ site: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={2} value={value.observacao ?? ""} onChange={(e) => set({ observacao: e.target.value })} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
