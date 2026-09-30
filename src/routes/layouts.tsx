import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { LayoutManagerDialog } from "@/components/LayoutManagerDialog";
import { ImportarModeloPropostaDialog } from "@/components/ImportarModeloPropostaDialog";
import { listProposalLayouts } from "@/lib/layouts.functions";
import {
  getPiLayout,
  savePiLayout,
  DEFAULT_PI_LAYOUT,
  invalidatePiLayoutCache,
  type PiLayoutConfig,
} from "@/lib/pi-layout.functions";
import { Loader2, Save, Settings2, Sliders, Presentation, Plus, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/layouts")({
  component: LayoutsPage,
  head: () => ({ meta: [{ title: "Layouts — PI e Propostas" }] }),
});

function LayoutsPage() {
  const qc = useQueryClient();
  const [propostasOpen, setPropostasOpen] = useState(false);
  const [importarModeloOpen, setImportarModeloOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [cfg, setCfg] = useState<PiLayoutConfig>(DEFAULT_PI_LAYOUT);

  const { data: proposalLayouts = [], isLoading: loadingProposalLayouts } = useQuery({
    queryKey: ["proposal_layouts"],
    queryFn: () => listProposalLayouts(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["pi_layout"],
    queryFn: () => getPiLayout(),
  });

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => savePiLayout({ data: cfg }),
    onSuccess: () => {
      invalidatePiLayoutCache();
      toast.success("Layout do PI salvo");
      qc.invalidateQueries({ queryKey: ["pi_layout"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Layouts dos documentos"
        description="Ajuste a aparência do Pedido de Inserção e das Propostas em um único lugar."
        icon={<Settings2 className="size-5" />}
      />

      <Tabs defaultValue="pi" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pi">Pedido de Inserção</TabsTrigger>
          <TabsTrigger value="propostas">Propostas</TabsTrigger>
        </TabsList>

        <TabsContent value="pi">
          <Card>
            <CardHeader>
              <CardTitle>Layout do PI</CardTitle>
              <CardDescription>
                Configurações aplicadas ao PDF do Pedido de Inserção.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Carregando…
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Cor primária</Label>
                    <Input
                      type="color"
                      value={cfg.corPrimaria}
                      onChange={(e) => setCfg({ ...cfg, corPrimaria: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor do texto</Label>
                    <Input
                      type="color"
                      value={cfg.corTexto}
                      onChange={(e) => setCfg({ ...cfg, corTexto: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Margem (mm)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={cfg.margemMm}
                      onChange={(e) => setCfg({ ...cfg, margemMm: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tamanho da fonte base (pt)</Label>
                    <Input
                      type="number"
                      min={6}
                      max={14}
                      value={cfg.tamanhoFonteBase}
                      onChange={(e) =>
                        setCfg({ ...cfg, tamanhoFonteBase: Number(e.target.value) || 8 })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Mostrar logo da empresa</Label>
                      <p className="text-xs text-muted-foreground">Logo cadastrada no inquilino.</p>
                    </div>
                    <Switch
                      checked={cfg.mostrarLogoTenant}
                      onCheckedChange={(v) => setCfg({ ...cfg, mostrarLogoTenant: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Mostrar logo da emissora</Label>
                      <p className="text-xs text-muted-foreground">
                        Logo cadastrada na emissora vinculada.
                      </p>
                    </div>
                    <Switch
                      checked={cfg.mostrarLogoEmissora}
                      onCheckedChange={(v) => setCfg({ ...cfg, mostrarLogoEmissora: v })}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Texto fixo de rodapé</Label>
                    <Textarea
                      rows={2}
                      value={cfg.rodapeTexto}
                      onChange={(e) => setCfg({ ...cfg, rodapeTexto: e.target.value })}
                      placeholder="Ex.: Documento válido apenas após aprovação."
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Observação padrão</Label>
                    <Textarea
                      rows={3}
                      value={cfg.observacaoPadrao}
                      onChange={(e) => setCfg({ ...cfg, observacaoPadrao: e.target.value })}
                      placeholder="Adicionada como observação inicial em novos PIs."
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCfg(DEFAULT_PI_LAYOUT)}>
                  Restaurar padrão
                </Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <Save className="size-4 mr-2" />
                  )}
                  Salvar layout do PI
                </Button>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Para ajustes finos no código, edite <code>src/lib/pi-pdf.ts</code> (renderização) e
                <code> src/lib/pi-layout.functions.ts</code> (campos configuráveis).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="propostas" className="space-y-4">
          <Card className="border-primary/20 bg-linear-to-b from-primary/[0.03] to-transparent">
            <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Presentation className="size-5 text-primary" />
                  Modelo Próprio da Empresa (PDF & Slides Mapeados)
                </CardTitle>
                <CardDescription className="mt-1">
                  Importe o modelo oficial da sua empresa (PDF ou imagens) e defina em qual slide e
                  coordenadas a tabela de produtos, geolocalização e valores (ou Pacote de Mídia)
                  serão inseridos automaticamente.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setImportarModeloOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="size-4" /> Importar Modelo Próprio
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingProposalLayouts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="size-4 animate-spin" /> Carregando modelos da empresa…
                </div>
              ) : proposalLayouts.filter((l) => l.slides && l.slides.length > 0).length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center bg-muted/10 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Nenhum modelo de slide importado para a sua empresa ainda.
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Você pode subir a apresentação institucional da sua empresa em PDF e configurar
                    exatamente onde a Capa e a Tabela Comercial de Produtos/Valores serão geradas.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setEditingTemplate(null);
                      setImportarModeloOpen(true);
                    }}
                  >
                    <Sliders className="size-3.5 mr-1" /> Começar Importação
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proposalLayouts
                    .filter((l) => l.slides && l.slides.length > 0)
                    .map((layout) => (
                      <div
                        key={layout.id}
                        className="rounded-xl border bg-card p-3 shadow-xs hover:border-primary/50 transition flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm truncate">{layout.name}</span>
                            {layout.is_default && (
                              <Badge variant="default" className="text-[10px] shrink-0">
                                Padrão
                              </Badge>
                            )}
                          </div>
                          {layout.slides?.[0]?.imageUrl && (
                            <div className="aspect-video rounded-md overflow-hidden bg-slate-900 border">
                              <img
                                src={layout.slides[0].imageUrl}
                                alt="Capa"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>🎞️ {layout.slides?.length || 0} slides configurados</p>
                            <p>
                              📍 Slide de produtos: #
                              {Number(layout.mapeamento?.slideProdutosIndex ?? 1) + 1} (Topo:{" "}
                              {layout.mapeamento?.tabela?.margemSuperiorPct ?? 24}%)
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full gap-1"
                            onClick={() => {
                              setEditingTemplate(layout);
                              setImportarModeloOpen(true);
                            }}
                          >
                            <Sliders className="size-3.5" /> Editar Mapeamento
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="size-4" /> Layouts e Temas Padrão (Cores e Fontes)
              </CardTitle>
              <CardDescription>
                Cores, fontes, logo e opções de exibição do tema padrão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={() => setPropostasOpen(true)}>
                <Settings2 className="size-4 mr-2" /> Gerenciar Cores & Temas Padrão
              </Button>
            </CardContent>
          </Card>

          <LayoutManagerDialog open={propostasOpen} onOpenChange={setPropostasOpen} />
          <ImportarModeloPropostaDialog
            open={importarModeloOpen}
            onOpenChange={setImportarModeloOpen}
            initial={editingTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
