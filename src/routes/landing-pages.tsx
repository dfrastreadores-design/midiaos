import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listLandingPages,
  upsertLandingPage,
  deleteLandingPage,
  generateLandingFromCliente,
} from "@/lib/landing-pages.functions";
import { listClientes } from "@/lib/clientes.functions";

export const Route = createFileRoute("/landing-pages")({
  head: () => ({
    meta: [
      { title: "Landing Pages — mídia.OS" },
      { name: "description", content: "Crie páginas de captação com formulário integrado ao CRM." },
      { property: "og:title", content: "Landing Pages — mídia.OS" },
      {
        property: "og:description",
        content: "Crie páginas de captação com formulário integrado ao CRM.",
      },
    ],
  }),
  component: LandingPagesRoute,
});

function LandingPagesRoute() {
  return (
    <AppShell>
      <LandingPagesList />
    </AppShell>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function LandingPagesList() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const listFn = useServerFn(listLandingPages);
  const upsertFn = useServerFn(upsertLandingPage);
  const delFn = useServerFn(deleteLandingPage);
  const genFn = useServerFn(generateLandingFromCliente);
  const listClientesFn = useServerFn(listClientes);
  const { data, isLoading } = useQuery({ queryKey: ["landing-pages"], queryFn: () => listFn() });
  const { data: clientes } = useQuery({
    queryKey: ["landing-pages:clientes"],
    queryFn: () => listClientesFn(),
  });
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [clienteId, setClienteId] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");

  const genMut = useMutation({
    mutationFn: async () => genFn({ data: { clienteId } }),
    onSuccess: (page: any) => {
      qc.invalidateQueries({ queryKey: ["landing-pages"] });
      setGenOpen(false);
      setClienteId("");
      toast.success("Landing gerada a partir do cliente");
      nav({ to: "/landing-pages/$id", params: { id: page.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar"),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const page = await upsertFn({
        data: {
          titulo,
          slug: slug || slugify(titulo),
          status: "rascunho",
          sections: [
            {
              type: "hero",
              title: titulo,
              subtitle: "Fale com nosso time",
              ctaLabel: "Quero saber mais",
              ctaAnchor: "#form",
            },
            {
              type: "features",
              title: "Por que escolher a gente",
              items: [
                { title: "Rápido", description: "Implantação em dias." },
                { title: "Seguro", description: "Dados protegidos." },
                { title: "Personalizado", description: "Feito para seu negócio." },
              ],
            },
            {
              type: "form",
              title: "Deixe seus dados",
              description: "Vamos entrar em contato em breve.",
              submitLabel: "Enviar",
              fields: [
                { key: "nome", label: "Nome", required: true },
                { key: "email", label: "E-mail", required: true },
                { key: "telefone", label: "Telefone / WhatsApp" },
                { key: "empresa", label: "Empresa" },
                { key: "mensagem", label: "Mensagem" },
              ],
            },
          ],
        },
      });
      return page;
    },
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ["landing-pages"] });
      setOpen(false);
      setTitulo("");
      setSlug("");
      toast.success("Landing criada");
      nav({ to: "/landing-pages/$id", params: { id: page.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Excluída");
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Landing Pages"
        description="Crie páginas para captar leads e converter direto no CRM."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGenOpen(true)}>
              <Wand2 className="w-4 h-4 mr-2" /> Gerar do cliente
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nova landing
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhuma landing page criada ainda.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeira
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((p: any) => {
            const url =
              typeof window !== "undefined" ? `${window.location.origin}/${p.slug}` : `/${p.slug}`;
            return (
              <div key={p.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.titulo}</div>
                    <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
                  </div>
                  <Badge variant={p.status === "publicada" ? "default" : "secondary"}>
                    {p.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3">
                  <span>{p.views_count ?? 0} views</span>
                  <span>{p.leads_count ?? 0} leads</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/landing-pages/$id" params={{ id: p.id }}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      toast.success("Link copiado");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar link
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/${p.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Excluir esta landing?")) delMut.mutate(p.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova landing page</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  if (!slug) setSlug(slugify(e.target.value));
                }}
                placeholder="Campanha Natal 2026"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="campanha-natal-2026"
              />
              <p className="text-xs text-muted-foreground mt-1">Ficará em /{slug || "seu-slug"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={!titulo || createMut.isPending}>
              {createMut.isPending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar landing a partir do cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A landing usará a logo do cliente e exibirá os produtos cadastrados como vitrine (sem
              preços) com o botão "Consultar disponibilidade".
            </p>
            <div>
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {(clientes ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => genMut.mutate()} disabled={!clienteId || genMut.isPending}>
              {genMut.isPending ? "Gerando…" : "Gerar landing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
