import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { listProposalLayouts, upsertProposalLayout } from "@/lib/layouts.functions";
import { toast } from "sonner";
import { Loader2, Save, Layout, Settings2 } from "lucide-react";

type LayoutConfig = {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  font: {
    baseSize: number;
    titleSize: number;
  };
  options: {
    showLogo: boolean;
    showIaSummary: boolean;
    compactTable: boolean;
  };
};

const DEFAULT_CONFIG: LayoutConfig = {
  colors: {
    primary: "#0F5C7C",
    secondary: "#F7B500",
    text: "#1F2937",
    accent: "#F9FAFB",
  },
  font: {
    baseSize: 10,
    titleSize: 24,
  },
  options: {
    showLogo: true,
    showIaSummary: true,
    compactTable: false,
  },
};

export function LayoutManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("Novo Layout");
  const [config, setConfig] = useState<LayoutConfig>(DEFAULT_CONFIG);
  const [isDefault, setIsDefault] = useState(false);

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ["proposal_layouts"],
    queryFn: () => listProposalLayouts(),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () => upsertProposalLayout({
      data: { id: editingId || undefined, name, config, is_default: isDefault }
    }),
    onSuccess: () => {
      toast.success("Layout salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["proposal_layouts"] });
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (l: any) => {
    setEditingId(l.id);
    setName(l.name);
    setConfig(l.config);
    setIsDefault(l.is_default);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="size-5" /> Gerenciador de Layouts Interativo
          </DialogTitle>
          <DialogDescription>
            Personalize a aparência das propostas e salve como modelo para uso futuro.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 py-4">
          <div className="space-y-4 border-r pr-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Modelos Salvos</h3>
              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setConfig(DEFAULT_CONFIG); setName("Novo Layout"); }}>
                Novo
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="size-4 animate-spin" /></div>
              ) : layouts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum modelo salvo.</p>
              ) : (
                layouts.map((l: any) => (
                  <button
                    key={l.id}
                    onClick={() => startEdit(l)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${editingId === l.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    <div className="font-medium truncate">{l.name}</div>
                    {l.is_default && <span className="text-[10px] opacity-70">Padrão do Sistema</span>}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Modelo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="flex items-end pb-2 gap-2">
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                <Label className="cursor-pointer" onClick={() => setIsDefault(!isDefault)}>Definir como padrão</Label>
              </div>
            </div>

            <Tabs defaultValue="visual">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual" className="flex items-center gap-2">
                  <Settings2 className="size-4" /> Estilo Visual
                </TabsTrigger>
                <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="space-y-6 pt-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium border-b pb-1">Cores da Marca</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cor Primária</Label>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10" value={config.colors.primary} onChange={e => setConfig({...config, colors: {...config.colors, primary: e.target.value}})} />
                        <Input value={config.colors.primary} onChange={e => setConfig({...config, colors: {...config.colors, primary: e.target.value}})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor Secundária</Label>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10" value={config.colors.secondary} onChange={e => setConfig({...config, colors: {...config.colors, secondary: e.target.value}})} />
                        <Input value={config.colors.secondary} onChange={e => setConfig({...config, colors: {...config.colors, secondary: e.target.value}})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium border-b pb-1">Tipografia</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Tamanho da Fonte (Base)</Label>
                        <span className="text-xs font-mono">{config.font.baseSize}pt</span>
                      </div>
                      <Slider value={[config.font.baseSize]} min={8} max={14} step={0.5} onValueChange={([v]) => setConfig({...config, font: {...config.font, baseSize: v}})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium border-b pb-1">Opções de Exibição</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={config.options.showIaSummary} onCheckedChange={v => setConfig({...config, options: {...config.options, showIaSummary: v}})} />
                      <Label>Resumo da IA</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={config.options.compactTable} onCheckedChange={v => setConfig({...config, options: {...config.options, compactTable: v}})} />
                      <Label>Tabela Compacta</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="pt-4">
                <div className="border rounded-lg p-4 bg-slate-50 min-h-[300px] flex flex-col gap-4 overflow-hidden shadow-inner">
                  <div className="h-10 rounded shadow-sm flex items-center px-4 text-white text-xs font-bold" style={{ backgroundColor: config.colors.primary }}>
                    LOGO / HEADER
                  </div>
                  <div className="flex-1 bg-white rounded shadow-sm p-4 space-y-4">
                    <div className="h-4 w-1/2 rounded" style={{ backgroundColor: config.colors.secondary, opacity: 0.2 }}></div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-slate-100 rounded"></div>
                      <div className="h-2 w-full bg-slate-100 rounded"></div>
                      <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                    </div>
                    <div className="mt-4 border rounded overflow-hidden">
                       <div className="h-8 flex items-center px-2 text-[8px] text-white" style={{ backgroundColor: config.colors.primary }}>
                         TABELA DE ITENS
                       </div>
                       <div className="h-20 bg-white"></div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            {editingId ? "Atualizar Modelo" : "Salvar como Novo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
