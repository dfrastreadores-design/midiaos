import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, ArrowDown, Copy, ExternalLink, Plus, Trash2, UserPlus } from "lucide-react";
import {
  getLandingPage,
  upsertLandingPage,
  listLeads,
  convertLeadToCliente,
  type LandingSection,
  type LandingPage,
} from "@/lib/landing-pages.functions";
import { LandingRenderer } from "@/components/landing/LandingRenderer";

export const Route = createFileRoute("/landing-pages/$id")({
  head: () => ({ meta: [{ title: "Editor de Landing Page — mídia.OS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell>
      <Editor />
    </AppShell>
  ),
});

const SECTION_TEMPLATES: Record<LandingSection["type"], () => LandingSection> = {
  hero: () => ({ type: "hero", title: "Título principal", subtitle: "Descrição", ctaLabel: "Quero saber mais", ctaAnchor: "#form" }),
  features: () => ({
    type: "features",
    title: "Diferenciais",
    items: [
      { title: "Item 1", description: "Descrição" },
      { title: "Item 2", description: "Descrição" },
      { title: "Item 3", description: "Descrição" },
    ],
  }),
  stats: () => ({ type: "stats", items: [{ value: "100+", label: "Clientes" }, { value: "10 anos", label: "Experiência" }] }),
  testimonials: () => ({
    type: "testimonials",
    items: [{ quote: "Depoimento incrível.", author: "Cliente Feliz", role: "Cargo" }],
  }),
  rich_text: () => ({ type: "rich_text", content: "<p>Texto livre em HTML.</p>" }),
  cta: () => ({ type: "cta", title: "Vamos conversar?", description: "", buttonLabel: "Fale conosco", buttonAnchor: "#form" }),
  form: () => ({
    type: "form",
    title: "Fale com a gente",
    submitLabel: "Enviar",
    fields: [
      { key: "nome", label: "Nome", required: true },
      { key: "email", label: "E-mail", required: true },
      { key: "telefone", label: "Telefone" },
      { key: "empresa", label: "Empresa" },
      { key: "mensagem", label: "Mensagem" },
    ],
  }),
  products: () => ({
    type: "products",
    title: "Nossos produtos",
    description: "Consulte disponibilidade sob medida.",
    ctaLabel: "Consultar disponibilidade",
    items: [
      { nome: "Produto exemplo", categoria: "Categoria", descricao: "Descrição breve", cta_label: "Consultar disponibilidade" },
    ],
  }),
};

const SECTION_LABELS: Record<LandingSection["type"], string> = {
  hero: "Hero",
  features: "Benefícios",
  stats: "Números / Stats",
  testimonials: "Depoimentos",
  rich_text: "Texto livre",
  cta: "Chamada (CTA)",
  form: "Formulário",
  products: "Vitrine de produtos",
};

function Editor() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getLandingPage);
  const upsertFn = useServerFn(upsertLandingPage);
  const listLeadsFn = useServerFn(listLeads);
  const convertFn = useServerFn(convertLeadToCliente);
  const qc = useQueryClient();

  const { data: page } = useQuery({ queryKey: ["landing-page", id], queryFn: () => getFn({ data: { id } }) });
  const [draft, setDraft] = useState<LandingPage | null>(null);

  useEffect(() => {
    if (page) setDraft(page);
  }, [page]);

  const saveMut = useMutation({
    mutationFn: async (patch?: Partial<LandingPage>) => {
      if (!draft) return;
      const payload: any = {
        id: draft.id,
        slug: draft.slug,
        titulo: draft.titulo,
        status: draft.status,
        sections: draft.sections,
        cor_primaria: draft.cor_primaria,
        cor_texto: draft.cor_texto,
        logo_url: draft.logo_url,
        hero_image_url: draft.hero_image_url,
        meta_title: draft.meta_title,
        meta_description: draft.meta_description,
        meta_og_image: draft.meta_og_image,
        template: (draft as any).template ?? "modern",
        executivo_id: draft.executivo_id,
        ...patch,
      };
      return await upsertFn({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing-page", id] });
      qc.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  if (!draft) return <div className="text-muted-foreground">Carregando…</div>;

  const url = typeof window !== "undefined" ? `${window.location.origin}/${draft.slug}` : `/${draft.slug}`;

  function updateSection(idx: number, patch: Partial<LandingSection>) {
    setDraft((d) =>
      d
        ? { ...d, sections: d.sections.map((s, i) => (i === idx ? ({ ...s, ...patch } as LandingSection) : s)) }
        : d,
    );
  }
  function moveSection(idx: number, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.sections];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...d, sections: arr };
    });
  }
  function removeSection(idx: number) {
    setDraft((d) => (d ? { ...d, sections: d.sections.filter((_, i) => i !== idx) } : d));
  }
  function addSection(type: LandingSection["type"]) {
    setDraft((d) => (d ? { ...d, sections: [...d.sections, SECTION_TEMPLATES[type]()] } : d));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={draft.titulo}
        description={`URL: /${draft.slug}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/landing-pages">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.success("Link copiado");
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/${draft.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir
              </a>
            </Button>
            {draft.status !== "publicada" ? (
              <Button
                size="sm"
                onClick={() => {
                  setDraft((d) => (d ? { ...d, status: "publicada" } : d));
                  setTimeout(() => saveMut.mutate({ status: "publicada" }), 0);
                }}
              >
                Publicar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraft((d) => (d ? { ...d, status: "rascunho" } : d));
                  setTimeout(() => saveMut.mutate({ status: "rascunho" }), 0);
                }}
              >
                Despublicar
              </Button>
            )}
            <Button size="sm" onClick={() => saveMut.mutate(undefined)} disabled={saveMut.isPending}>
              Salvar
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="conteudo">
        <TabsList>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="space-y-3">
          <div className="rounded-lg border p-3 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground mr-2">Adicionar seção:</span>
            {(Object.keys(SECTION_TEMPLATES) as LandingSection["type"][]).map((t) => (
              <Button key={t} size="sm" variant="outline" onClick={() => addSection(t)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> {SECTION_LABELS[t]}
              </Button>
            ))}
          </div>

          {draft.sections.map((s, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <Badge variant="secondary">{SECTION_LABELS[s.type]}</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => moveSection(idx, -1)}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => moveSection(idx, 1)}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeSection(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <SectionEditor section={s} onChange={(patch) => updateSection(idx, patch)} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="aparencia" className="space-y-3">
          <div>
            <Label>Estilo (template)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
              {([
                { id: "modern", label: "Moderno", desc: "Limpo, sans-serif, bordas suaves" },
                { id: "minimal", label: "Minimalista", desc: "Alinhado à esquerda, bordas retas" },
                { id: "bold", label: "Ousado", desc: "Tipografia forte e caixa alta" },
                { id: "elegant", label: "Elegante", desc: "Serifado com bordas arredondadas" },
              ] as const).map((t) => {
                const active = ((draft as any).template || "modern") === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDraft((d) => (d ? ({ ...d, template: t.id } as any) : d))}
                    className={`text-left rounded-lg border p-3 transition ${active ? "border-primary ring-2 ring-primary/30" : "hover:border-muted-foreground/40"}`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">

            <div>
              <Label>Cor primária</Label>
              <Input
                type="color"
                value={draft.cor_primaria || "#0f172a"}
                onChange={(e) => setDraft((d) => (d ? { ...d, cor_primaria: e.target.value } : d))}
              />
            </div>
            <div>
              <Label>Cor do texto sobre cor primária</Label>
              <Input
                type="color"
                value={draft.cor_texto || "#ffffff"}
                onChange={(e) => setDraft((d) => (d ? { ...d, cor_texto: e.target.value } : d))}
              />
            </div>
            <div>
              <Label>Logo (URL)</Label>
              <Input
                value={draft.logo_url || ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, logo_url: e.target.value } : d))}
              />
            </div>
            <div>
              <Label>Imagem hero (URL)</Label>
              <Input
                value={draft.hero_image_url || ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, hero_image_url: e.target.value } : d))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-3">
          <div>
            <Label>Slug</Label>
            <Input value={draft.slug} onChange={(e) => setDraft((d) => (d ? { ...d, slug: e.target.value } : d))} />
          </div>
          <div>
            <Label>Meta title</Label>
            <Input
              value={draft.meta_title || ""}
              onChange={(e) => setDraft((d) => (d ? { ...d, meta_title: e.target.value } : d))}
            />
          </div>
          <div>
            <Label>Meta description</Label>
            <Textarea
              value={draft.meta_description || ""}
              onChange={(e) => setDraft((d) => (d ? { ...d, meta_description: e.target.value } : d))}
            />
          </div>
          <div>
            <Label>OG image (URL)</Label>
            <Input
              value={draft.meta_og_image || ""}
              onChange={(e) => setDraft((d) => (d ? { ...d, meta_og_image: e.target.value } : d))}
            />
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <LeadsTab id={id} listFn={listLeadsFn} convertFn={convertFn} />
        </TabsContent>

        <TabsContent value="preview">
          <div className="rounded-lg border overflow-hidden">
            <LandingRenderer page={draft} preview />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
}: {
  section: LandingSection;
  onChange: (patch: Partial<LandingSection>) => void;
}) {
  switch (section.type) {
    case "hero":
      return (
        <div className="grid md:grid-cols-2 gap-2">
          <Input placeholder="Título" value={section.title} onChange={(e) => onChange({ title: e.target.value } as any)} />
          <Input
            placeholder="Subtítulo"
            value={section.subtitle || ""}
            onChange={(e) => onChange({ subtitle: e.target.value } as any)}
          />
          <Input
            placeholder="Rótulo do botão"
            value={section.ctaLabel || ""}
            onChange={(e) => onChange({ ctaLabel: e.target.value } as any)}
          />
          <Input
            placeholder="Âncora do botão (ex: #form)"
            value={section.ctaAnchor || ""}
            onChange={(e) => onChange({ ctaAnchor: e.target.value } as any)}
          />
        </div>
      );
    case "features":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título"
            value={section.title || ""}
            onChange={(e) => onChange({ title: e.target.value } as any)}
          />
          {section.items.map((it, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-2 border rounded p-2">
              <Input
                placeholder="Título do item"
                value={it.title}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = { ...items[i], title: e.target.value };
                  onChange({ items } as any);
                }}
              />
              <Input
                placeholder="Descrição"
                value={it.description || ""}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = { ...items[i], description: e.target.value };
                  onChange({ items } as any);
                }}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange({ items: [...section.items, { title: "Novo", description: "" }] } as any)}
            >
              <Plus className="w-3 h-3 mr-1" /> Item
            </Button>
            {section.items.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => onChange({ items: section.items.slice(0, -1) } as any)}
              >
                Remover último
              </Button>
            )}
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="space-y-2">
          {section.items.map((it, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-2 border rounded p-2">
              <Input
                placeholder="Valor (ex: 100+)"
                value={it.value}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = { ...items[i], value: e.target.value };
                  onChange({ items } as any);
                }}
              />
              <Input
                placeholder="Rótulo"
                value={it.label}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = { ...items[i], label: e.target.value };
                  onChange({ items } as any);
                }}
              />
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange({ items: [...section.items, { value: "0", label: "" }] } as any)}
          >
            <Plus className="w-3 h-3 mr-1" /> Stat
          </Button>
        </div>
      );
    case "testimonials":
      return (
        <div className="space-y-2">
          {section.items.map((it, i) => (
            <div key={i} className="grid md:grid-cols-3 gap-2 border rounded p-2">
              <Textarea
                className="md:col-span-3"
                placeholder="Depoimento"
                value={it.quote}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = { ...items[i], quote: e.target.value };
                  onChange({ items } as any);
                }}
              />
              <Input
                placeholder="Autor"
                value={it.author}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = { ...items[i], author: e.target.value };
                  onChange({ items } as any);
                }}
              />
              <Input
                placeholder="Cargo"
                value={it.role || ""}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = { ...items[i], role: e.target.value };
                  onChange({ items } as any);
                }}
              />
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange({ items: [...section.items, { quote: "", author: "" }] } as any)}
          >
            <Plus className="w-3 h-3 mr-1" /> Depoimento
          </Button>
        </div>
      );
    case "rich_text":
      return (
        <Textarea
          rows={6}
          placeholder="HTML"
          value={section.content}
          onChange={(e) => onChange({ content: e.target.value } as any)}
        />
      );
    case "cta":
      return (
        <div className="grid md:grid-cols-2 gap-2">
          <Input placeholder="Título" value={section.title} onChange={(e) => onChange({ title: e.target.value } as any)} />
          <Input
            placeholder="Rótulo do botão"
            value={section.buttonLabel}
            onChange={(e) => onChange({ buttonLabel: e.target.value } as any)}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Descrição"
            value={section.description || ""}
            onChange={(e) => onChange({ description: e.target.value } as any)}
          />
          <Input
            className="md:col-span-2"
            placeholder="Âncora do botão"
            value={section.buttonAnchor || ""}
            onChange={(e) => onChange({ buttonAnchor: e.target.value } as any)}
          />
        </div>
      );
    case "form":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título"
            value={section.title || ""}
            onChange={(e) => onChange({ title: e.target.value } as any)}
          />
          <Input
            placeholder="Rótulo do botão"
            value={section.submitLabel || "Enviar"}
            onChange={(e) => onChange({ submitLabel: e.target.value } as any)}
          />
          <Textarea
            placeholder="Descrição"
            value={section.description || ""}
            onChange={(e) => onChange({ description: e.target.value } as any)}
          />
          <div className="space-y-1">
            {section.fields.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center border rounded p-2">
                <Select
                  value={f.key}
                  onValueChange={(v) => {
                    const fields = [...section.fields];
                    fields[i] = { ...fields[i], key: v as any };
                    onChange({ fields } as any);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome">nome</SelectItem>
                    <SelectItem value="email">email</SelectItem>
                    <SelectItem value="telefone">telefone</SelectItem>
                    <SelectItem value="empresa">empresa</SelectItem>
                    <SelectItem value="mensagem">mensagem</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-2"
                  value={f.label}
                  onChange={(e) => {
                    const fields = [...section.fields];
                    fields[i] = { ...fields[i], label: e.target.value };
                    onChange({ fields } as any);
                  }}
                />
                <label className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => {
                      const fields = [...section.fields];
                      fields[i] = { ...fields[i], required: e.target.checked };
                      onChange({ fields } as any);
                    }}
                  />
                  Obrigatório
                </label>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

function LeadsTab({
  id,
  listFn,
  convertFn,
}: {
  id: string;
  listFn: (args: any) => Promise<any>;
  convertFn: (args: any) => Promise<any>;
}) {
  const qc = useQueryClient();
  const { data: leads } = useQuery({
    queryKey: ["landing-leads", id],
    queryFn: () => listFn({ data: { landingPageId: id } }),
  });
  const convertMut = useMutation({
    mutationFn: (leadId: string) => convertFn({ data: { leadId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing-leads", id] });
      toast.success("Convertido em cliente");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  if (!leads || leads.length === 0) {
    return <div className="text-muted-foreground text-sm py-6 text-center">Nenhum lead ainda.</div>;
  }
  return (
    <div className="rounded-lg border divide-y">
      {leads.map((l: any) => (
        <div key={l.id} className="p-3 flex flex-wrap justify-between gap-2 items-center">
          <div className="min-w-0">
            <div className="font-medium">{l.nome}</div>
            <div className="text-xs text-muted-foreground">
              {l.email} {l.telefone ? `• ${l.telefone}` : ""} {l.empresa ? `• ${l.empresa}` : ""}
            </div>
            {l.mensagem ? <div className="text-xs mt-1">{l.mensagem}</div> : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={l.status === "convertido" ? "default" : "secondary"}>{l.status}</Badge>
            {!l.cliente_id && (
              <Button size="sm" variant="outline" onClick={() => convertMut.mutate(l.id)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Virar cliente
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
