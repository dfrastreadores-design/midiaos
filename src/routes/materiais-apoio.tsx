import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, Plus, Download, Trash2, Search, FileText, Link as LinkIcon, ExternalLink, Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import { toast } from "sonner";

export const Route = createFileRoute("/materiais-apoio")({
  head: () => ({ meta: [{ title: "Material de Apoio — Mídia.OS" }] }),
  component: MateriaisApoio,
});

type Row = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  arquivo_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  arquivo_tamanho: number | null;
  created_by: string | null;
  created_at: string;
};

type LinkRow = {
  id: string;
  titulo: string;
  url: string;
  descricao: string | null;
  categoria: string | null;
  icone: string | null;
  created_by: string | null;
  created_at: string;
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

function MateriaisApoio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkRow | null>(null);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");
  const [tab, setTab] = useState("arquivos");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["materiais-apoio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materiais_apoio")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: links = [], isLoading: loadingLinks } = useQuery({
    queryKey: ["links-uteis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links_uteis")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LinkRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (row: Row) => {
      await supabase.storage.from("materiais-apoio").remove([row.arquivo_path]);
      const { error } = await supabase.from("materiais_apoio").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Material removido"); qc.invalidateQueries({ queryKey: ["materiais-apoio"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("links_uteis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Link removido"); qc.invalidateQueries({ queryKey: ["links-uteis"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleDownload(row: Row) {
    const { data, error } = await supabase.storage
      .from("materiais-apoio")
      .createSignedUrl(row.arquivo_path, 60, { download: row.arquivo_nome });
    if (error || !data?.signedUrl) { toast.error("Erro ao gerar link de download"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleVisualizar(row: Row) {
    const { data, error } = await supabase.storage
      .from("materiais-apoio")
      .createSignedUrl(row.arquivo_path, 300);
    if (error || !data?.signedUrl) { toast.error("Erro ao gerar link de visualização"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const categorias = Array.from(new Set(rows.map((r) => r.categoria).filter(Boolean))) as string[];
  const categoriasLinks = Array.from(new Set(links.map((r) => r.categoria).filter(Boolean))) as string[];
  const filtered = rows.filter((r) => {
    const matchBusca = !busca ||
      r.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (r.descricao ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      r.arquivo_nome.toLowerCase().includes(busca.toLowerCase());
    const matchCat = !categoriaFiltro || r.categoria === categoriaFiltro;
    return matchBusca && matchCat;
  });
  const filteredLinks = links.filter((r) => {
    const matchBusca = !busca ||
      r.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (r.descricao ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      r.url.toLowerCase().includes(busca.toLowerCase());
    const matchCat = !categoriaFiltro || r.categoria === categoriaFiltro;
    return matchBusca && matchCat;
  });

  const catsToShow = tab === "arquivos" ? categorias : categoriasLinks;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight flex items-center gap-2">
            <FolderOpen className="size-7 text-primary" /> Material de Apoio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Documentos, apresentações, arquivos e links úteis para acesso rápido da equipe.
          </p>
        </div>
        {tab === "arquivos" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-1" /> Novo material</Button>
            </DialogTrigger>
            <UploadDialog onClose={() => setOpen(false)} />
          </Dialog>
        ) : (
          <Dialog open={linkOpen} onOpenChange={(o) => { setLinkOpen(o); if (!o) setEditingLink(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingLink(null)}><Plus className="size-4 mr-1" /> Novo link</Button>
            </DialogTrigger>
            <LinkDialog onClose={() => { setLinkOpen(false); setEditingLink(null); }} link={editingLink} />
          </Dialog>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setCategoriaFiltro(""); }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="arquivos"><FileText className="size-4 mr-1" /> Arquivos</TabsTrigger>
          <TabsTrigger value="links"><LinkIcon className="size-4 mr-1" /> Links úteis</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            {catsToShow.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant={categoriaFiltro === "" ? "default" : "outline"} onClick={() => setCategoriaFiltro("")}>Todas</Button>
                {catsToShow.map((c) => (
                  <Button key={c} size="sm" variant={categoriaFiltro === c ? "default" : "outline"} onClick={() => setCategoriaFiltro(c)}>{c}</Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <TabsContent value="arquivos" className="mt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">
              <FolderOpen className="size-12 mx-auto mb-3 opacity-40" />
              Nenhum material disponível. Clique em "Novo material" para enviar o primeiro arquivo.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((row) => {
                const canDelete = isAdmin || row.created_by === user?.id;
                return (
                  <Card key={row.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium leading-tight truncate" title={row.titulo}>{row.titulo}</h3>
                          <p className="text-xs text-muted-foreground truncate" title={row.arquivo_nome}>{row.arquivo_nome}</p>
                        </div>
                      </div>
                      {row.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{row.descricao}</p>}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        {row.categoria && <Badge variant="secondary">{row.categoria}</Badge>}
                        <span>{formatBytes(row.arquivo_tamanho)}</span>
                        <span>·</span>
                        <span>{new Date(row.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleVisualizar(row)}>
                          <Eye className="size-4 mr-1" /> Visualizar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(row)} title="Baixar">
                          <Download className="size-4" />
                        </Button>
                        {canDelete && (
                          <Button size="sm" variant="ghost" className="text-destructive"
                            onClick={() => { if (confirm("Remover este material?")) del.mutate(row); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="links" className="mt-0">
          {loadingLinks ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filteredLinks.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">
              <LinkIcon className="size-12 mx-auto mb-3 opacity-40" />
              Nenhum link cadastrado. Clique em "Novo link" para adicionar o primeiro.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredLinks.map((row) => {
                const canEdit = isAdmin || row.created_by === user?.id;
                return (
                  <Card key={row.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <LinkIcon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium leading-tight truncate" title={row.titulo}>{row.titulo}</h3>
                          <p className="text-xs text-muted-foreground truncate" title={row.url}>{row.url}</p>
                        </div>
                      </div>
                      {row.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{row.descricao}</p>}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        {row.categoria && <Badge variant="secondary">{row.categoria}</Badge>}
                        <span>{new Date(row.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a href={row.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4 mr-1" /> Abrir
                          </a>
                        </Button>
                        {canEdit && (
                          <>
                            <Button size="sm" variant="ghost"
                              onClick={() => { setEditingLink(row); setLinkOpen(true); }}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive"
                              onClick={() => { if (confirm("Remover este link?")) delLink.mutate(row.id); }}>
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function UploadDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !titulo.trim() || !user) {
      toast.error("Informe um título e selecione um arquivo");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("materiais-apoio").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (up.error) throw up.error;
      const { error } = await supabase.from("materiais_apoio").insert({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        categoria: categoria.trim() || null,
        arquivo_path: path,
        arquivo_nome: file.name,
        arquivo_tipo: file.type || null,
        arquivo_tamanho: file.size,
        created_by: user.id,
      });
      if (error) {
        await supabase.storage.from("materiais-apoio").remove([path]);
        throw error;
      }
      toast.success("Material enviado");
      qc.invalidateQueries({ queryKey: ["materiais-apoio"] });
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo material de apoio</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título *</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <Input id="categoria" placeholder="Ex.: Tabela de preços, Apresentação, Contrato..." value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="arquivo">Arquivo *</Label>
          <Input id="arquivo" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          {file && <p className="text-xs text-muted-foreground">{file.name} — {formatBytes(file.size)}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Enviar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function LinkDialog({ onClose, link }: { onClose: () => void; link: LinkRow | null }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [titulo, setTitulo] = useState(link?.titulo ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [descricao, setDescricao] = useState(link?.descricao ?? "");
  const [categoria, setCategoria] = useState(link?.categoria ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !url.trim() || !user) {
      toast.error("Informe um título e uma URL");
      return;
    }
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;

    setSaving(true);
    try {
      if (link) {
        const { error } = await supabase.from("links_uteis").update({
          titulo: titulo.trim(),
          url: finalUrl,
          descricao: descricao.trim() || null,
          categoria: categoria.trim() || null,
        }).eq("id", link.id);
        if (error) throw error;
        toast.success("Link atualizado");
      } else {
        const { error } = await supabase.from("links_uteis").insert({
          titulo: titulo.trim(),
          url: finalUrl,
          descricao: descricao.trim() || null,
          categoria: categoria.trim() || null,
          created_by: user.id,
        });
        if (error) throw error;
        toast.success("Link adicionado");
      }
      qc.invalidateQueries({ queryKey: ["links-uteis"] });
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{link ? "Editar link" : "Novo link útil"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="link-titulo">Título *</Label>
          <Input id="link-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="link-url">URL *</Label>
          <Input id="link-url" type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="link-categoria">Categoria</Label>
          <Input id="link-categoria" placeholder="Ex.: Ferramenta, Documentação, Portal..." value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="link-descricao">Descrição</Label>
          <Textarea id="link-descricao" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : link ? "Salvar" : "Adicionar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
