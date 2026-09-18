import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { LandingPage, LandingSection, LandingProductItem } from "@/lib/landing-pages.functions";
import { submitLead } from "@/lib/landing-pages.functions";

const TEMPLATE_STYLES: Record<string, { font: string; radius: string; heroClass: string }> = {
  modern:  { font: "'Inter', system-ui, sans-serif", radius: "0.75rem", heroClass: "py-24 text-center" },
  minimal: { font: "'Inter', system-ui, sans-serif", radius: "0.25rem", heroClass: "py-20 text-left max-w-3xl mx-auto" },
  bold:    { font: "'Archivo Black', Impact, sans-serif", radius: "0.5rem", heroClass: "py-28 text-center uppercase tracking-tight" },
  elegant: { font: "'Cormorant Garamond', Georgia, serif", radius: "1.25rem", heroClass: "py-24 text-center" },
};

export function LandingRenderer({ page, preview = false }: { page: LandingPage; preview?: boolean }) {
  const cor = page.cor_primaria || "hsl(var(--primary))";
  const corTxt = page.cor_texto || "#ffffff";
  const template = (page as any).template || "modern";
  const tpl = TEMPLATE_STYLES[template] || TEMPLATE_STYLES.modern;
  return (
    <div
      style={{
        ["--lp-color" as any]: cor,
        ["--lp-text" as any]: corTxt,
        ["--lp-radius" as any]: tpl.radius,
        fontFamily: tpl.font,
      }}
      className="min-h-screen bg-background"
      data-lp-template={template}
    >
      {page.logo_url ? (
        <header className="border-b py-4 px-6">
          <img src={page.logo_url} alt="" className="h-10" />
        </header>
      ) : null}
      <main>
        {(page.sections || []).map((s, i) => (
          <SectionView key={i} section={s} slug={page.slug} preview={preview} heroFallback={page.hero_image_url} tpl={tpl} />
        ))}
      </main>
      <footer className="text-center text-xs text-muted-foreground py-6 border-t">
        Feito com mídia.OS
      </footer>
      <AvailabilityModal slug={page.slug} preview={preview} />
    </div>
  );
}

function SectionView({
  section,
  slug,
  preview,
  heroFallback,
  tpl,
}: {
  section: LandingSection;
  slug: string;
  preview: boolean;
  heroFallback?: string | null;
  tpl: (typeof TEMPLATE_STYLES)[string];
}) {
  switch (section.type) {
    case "hero":
      return (
        <section
          className={`px-6 ${tpl.heroClass}`}
          style={{ background: "var(--lp-color)", color: "var(--lp-text)" }}
        >
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">{section.title}</h1>
            {section.subtitle ? <p className="text-lg opacity-90">{section.subtitle}</p> : null}
            {section.ctaLabel ? (
              <a
                href={section.ctaAnchor || "#form"}
                className="inline-block bg-white text-black font-medium px-6 py-3 mt-4"
                style={{ borderRadius: "var(--lp-radius)" }}
              >
                {section.ctaLabel}
              </a>
            ) : null}
            {(section.imageUrl || heroFallback) && (
              <img
                src={section.imageUrl || heroFallback!}
                alt=""
                className="mx-auto mt-8 max-h-80"
                style={{ borderRadius: "var(--lp-radius)" }}
              />
            )}
          </div>
        </section>
      );
    case "features":
      return (
        <section className="px-6 py-16 max-w-5xl mx-auto">
          {section.title ? <h2 className="text-3xl font-bold text-center mb-10">{section.title}</h2> : null}
          <div className="grid md:grid-cols-3 gap-6">
            {section.items.map((it, i) => (
              <div key={i} className="rounded-lg border p-6 space-y-2">
                <h3 className="font-semibold text-lg">{it.title}</h3>
                {it.description ? <p className="text-sm text-muted-foreground">{it.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      );
    case "stats":
      return (
        <section className="px-6 py-12 bg-muted">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {section.items.map((it, i) => (
              <div key={i}>
                <div className="text-3xl font-bold" style={{ color: "var(--lp-color)" }}>
                  {it.value}
                </div>
                <div className="text-sm text-muted-foreground">{it.label}</div>
              </div>
            ))}
          </div>
        </section>
      );
    case "testimonials":
      return (
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {section.items.map((it, i) => (
              <blockquote key={i} className="rounded-lg border p-6">
                <p className="italic">"{it.quote}"</p>
                <footer className="mt-3 text-sm">
                  <strong>{it.author}</strong>
                  {it.role ? <span className="text-muted-foreground"> — {it.role}</span> : null}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      );
    case "rich_text":
      return (
        <section className="px-6 py-12 max-w-3xl mx-auto prose prose-neutral">
          <div dangerouslySetInnerHTML={{ __html: section.content }} />
        </section>
      );
    case "cta":
      return (
        <section
          className="px-6 py-16 text-center"
          style={{ background: "var(--lp-color)", color: "var(--lp-text)" }}
        >
          <h2 className="text-3xl font-bold">{section.title}</h2>
          {section.description ? <p className="mt-3 opacity-90">{section.description}</p> : null}
          <a
            href={section.buttonAnchor || "#form"}
            className="inline-block rounded-md bg-white text-black font-medium px-6 py-3 mt-6"
          >
            {section.buttonLabel}
          </a>
        </section>
      );
    case "products":
      return (
        <section className="px-6 py-16 max-w-6xl mx-auto">
          {section.title ? <h2 className="text-3xl font-bold text-center mb-2">{section.title}</h2> : null}
          {section.description ? (
            <p className="text-center text-muted-foreground mb-10">{section.description}</p>
          ) : null}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((it, i) => (
              <article
                key={i}
                className="flex flex-col border overflow-hidden bg-card"
                style={{ borderRadius: "var(--lp-radius)" }}
              >
                <div
                  className="aspect-video bg-muted flex items-center justify-center overflow-hidden"
                  style={{ backgroundImage: it.imagem_url ? `url(${it.imagem_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
                >
                  {!it.imagem_url && <span className="text-xs text-muted-foreground">Sem imagem</span>}
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  {it.categoria && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.categoria}</span>
                  )}
                  <h3 className="font-semibold text-lg leading-tight">{it.nome}</h3>
                  {it.endereco && <p className="text-xs text-muted-foreground">{it.endereco}</p>}
                  {it.descricao && <p className="text-sm text-muted-foreground line-clamp-3">{it.descricao}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const ev = new CustomEvent("lp:open-availability", { detail: { product: it } });
                        window.dispatchEvent(ev);
                      } catch {}
                    }}
                    className="mt-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium"
                    style={{ background: "var(--lp-color)", color: "var(--lp-text)", borderRadius: "var(--lp-radius)" }}
                  >
                    {it.cta_label || section.ctaLabel || "Consultar disponibilidade"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    case "form":
      return <FormSection section={section} slug={slug} preview={preview} />;
    default:
      return null;
  }
}

function FormSection({
  section,
  slug,
  preview,
}: {
  section: Extract<LandingSection, { type: "form" }>;
  slug: string;
  preview: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onInterest(e: Event) {
      const nome = (e as CustomEvent).detail?.nome;
      if (!nome) return;
      setValues((v) => ({
        ...v,
        mensagem: v.mensagem
          ? `${v.mensagem}\nTambém tenho interesse em: ${nome}`
          : `Tenho interesse em: ${nome}. Por favor, consultar disponibilidade e valores.`,
      }));
    }
    window.addEventListener("lp:product-interest", onInterest as any);
    return () => window.removeEventListener("lp:product-interest", onInterest as any);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) {
      toast.info("Formulário desabilitado no preview.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      await submitLead({
        data: {
          slug,
          nome: values.nome ?? "",
          email: values.email ?? "",
          telefone: values.telefone ?? "",
          empresa: values.empresa ?? "",
          mensagem: values.mensagem ?? "",
          utm_source: params.get("utm_source") ?? undefined,
          utm_medium: params.get("utm_medium") ?? undefined,
          utm_campaign: params.get("utm_campaign") ?? undefined,
        },
      });
      setSent(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="form" className="px-6 py-16 max-w-2xl mx-auto">
      {section.title ? <h2 className="text-3xl font-bold text-center mb-2">{section.title}</h2> : null}
      {section.description ? <p className="text-center text-muted-foreground mb-6">{section.description}</p> : null}
      {sent ? (
        <div className="rounded-lg border p-6 text-center">
          {section.successMessage || "Recebemos seu contato. Em breve retornaremos!"}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-6">
          {section.fields.map((f) => (
            <div key={f.key}>
              <Label>
                {f.label} {f.required ? <span className="text-destructive">*</span> : null}
              </Label>
              {f.key === "mensagem" ? (
                <Textarea
                  required={f.required}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              ) : (
                <Input
                  type={f.key === "email" ? "email" : "text"}
                  required={f.required}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            style={{ background: "var(--lp-color)", color: "var(--lp-text)" }}
          >
            {loading ? "Enviando..." : section.submitLabel || "Enviar"}
          </Button>
        </form>
      )}
    </section>
  );
}

function AvailabilityModal({ slug, preview }: { slug: string; preview: boolean }) {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<LandingProductItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [values, setValues] = useState({ nome: "", email: "", telefone: "", empresa: "", mensagem: "" });

  useEffect(() => {
    function onOpen(e: Event) {
      const p = (e as CustomEvent).detail?.product as LandingProductItem | undefined;
      if (!p) return;
      setProduct(p);
      setSent(false);
      setValues((v) => ({
        ...v,
        mensagem: `Tenho interesse em: ${p.nome}${p.endereco ? ` (${p.endereco})` : ""}. Por favor, consultar disponibilidade e valores.`,
      }));
      setOpen(true);
    }
    window.addEventListener("lp:open-availability", onOpen as any);
    return () => window.removeEventListener("lp:open-availability", onOpen as any);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) {
      toast.info("Formulário desabilitado no preview.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      await submitLead({
        data: {
          slug,
          nome: values.nome,
          email: values.email,
          telefone: values.telefone,
          empresa: values.empresa,
          mensagem: values.mensagem,
          utm_source: params.get("utm_source") ?? undefined,
          utm_medium: params.get("utm_medium") ?? undefined,
          utm_campaign: params.get("utm_campaign") ?? undefined,
        },
      });
      setSent(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Consultar disponibilidade</DialogTitle>
          <DialogDescription>
            {product ? (
              <>
                Produto: <strong>{product.nome}</strong>
                {product.categoria ? ` — ${product.categoria}` : ""}
              </>
            ) : (
              "Deixe seus dados para retornarmos com condições e valores."
            )}
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="rounded-md border p-4 text-sm text-center">
            Recebemos sua solicitação. Em breve entraremos em contato!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input required value={values.nome} onChange={(e) => setValues((v) => ({ ...v, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input type="email" required value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
              </div>
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input value={values.telefone} onChange={(e) => setValues((v) => ({ ...v, telefone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={values.empresa} onChange={(e) => setValues((v) => ({ ...v, empresa: e.target.value }))} />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea rows={4} value={values.mensagem} onChange={(e) => setValues((v) => ({ ...v, mensagem: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} style={{ background: "var(--lp-color)", color: "var(--lp-text)" }}>
                {loading ? "Enviando..." : "Solicitar contato"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
