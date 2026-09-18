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
import { getPiLayout, savePiLayout, DEFAULT_PI_LAYOUT, invalidatePiLayoutCache, type PiLayoutConfig } from "@/lib/pi-layout.functions";
import { Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/layouts")({
  component: LayoutsPage,
  head: () => ({ meta: [{ title: "Layouts — PI e Propostas" }] }),
});

function LayoutsPage() {
  const qc = useQueryClient();
  const [propostasOpen, setPropostasOpen] = useState(false);
  const [cfg, setCfg] = useState<PiLayoutConfig>(DEFAULT_PI_LAYOUT);

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
              <CardDescription>Configurações aplicadas ao PDF do Pedido de Inserção.</CardDescription>
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
                    <Input type="color" value={cfg.corPrimaria}
                      onChange={(e) => setCfg({ ...cfg, corPrimaria: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor do texto</Label>
                    <Input type="color" value={cfg.corTexto}
                      onChange={(e) => setCfg({ ...cfg, corTexto: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Margem (mm)</Label>
                    <Input type="number" min={0} max={30} value={cfg.margemMm}
                      onChange={(e) => setCfg({ ...cfg, margemMm: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tamanho da fonte base (pt)</Label>
                    <Input type="number" min={6} max={14} value={cfg.tamanhoFonteBase}
                      onChange={(e) => setCfg({ ...cfg, tamanhoFonteBase: Number(e.target.value) || 8 })} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Mostrar logo da empresa</Label>
                      <p className="text-xs text-muted-foreground">Logo cadastrada no inquilino.</p>
                    </div>
                    <Switch checked={cfg.mostrarLogoTenant}
                      onCheckedChange={(v) => setCfg({ ...cfg, mostrarLogoTenant: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Mostrar logo da emissora</Label>
                      <p className="text-xs text-muted-foreground">Logo cadastrada na emissora vinculada.</p>
                    </div>
                    <Switch checked={cfg.mostrarLogoEmissora}
                      onCheckedChange={(v) => setCfg({ ...cfg, mostrarLogoEmissora: v })} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Texto fixo de rodapé</Label>
                    <Textarea rows={2} value={cfg.rodapeTexto}
                      onChange={(e) => setCfg({ ...cfg, rodapeTexto: e.target.value })}
                      placeholder="Ex.: Documento válido apenas após aprovação." />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Observação padrão</Label>
                    <Textarea rows={3} value={cfg.observacaoPadrao}
                      onChange={(e) => setCfg({ ...cfg, observacaoPadrao: e.target.value })}
                      placeholder="Adicionada como observação inicial em novos PIs." />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCfg(DEFAULT_PI_LAYOUT)}>Restaurar padrão</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
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

        <TabsContent value="propostas">
          <Card>
            <CardHeader>
              <CardTitle>Layouts de Proposta</CardTitle>
              <CardDescription>Cores, fontes, logo e opções de exibição da apresentação comercial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => setPropostasOpen(true)}>
                <Settings2 className="size-4 mr-2" /> Abrir gerenciador de layouts
              </Button>
              <p className="text-xs text-muted-foreground border-t pt-3">
                Para ajustes finos no código, edite <code>src/components/GerarApresentacaoDialog.tsx</code> (renderização)
                e <code> src/components/LayoutManagerDialog.tsx</code> (campos configuráveis).
              </p>
            </CardContent>
          </Card>
          <LayoutManagerDialog open={propostasOpen} onOpenChange={setPropostasOpen} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
