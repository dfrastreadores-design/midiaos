import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { upsertProduto, upsertProdutoTipo } from "@/lib/produtos.functions";
import { listEmissoras } from "@/lib/emissoras.functions";
import { useQuery } from "@tanstack/react-query";
import { CreatableCombobox } from "@/components/CreatableCombobox";
import { LocationPickerMap } from "@/components/LocationPickerMap";

type Midia = "TV" | "Radio" | "DOOH";

export type Produto = {
  id: string;
  nome: string;
  midia: Midia;
  tipo: string | null;
  programa: string | null;
  formato: string | null;
  faixa: string | null;
  duracao_segundos: number;
  insercoes_padrao: number;
  valor_unit: number;
  ativo: boolean;
  observacao: string | null;
  link_modelo: string | null;
  requer_producao: boolean;
  emissora_id?: string | null;
  veiculacao_tipo?: "livre" | "dias_uteis" | "seg_sab" | "dias_fixos" | "dias_semana";
  dias_fixos?: number[];
  dias_semana_fixos?: number[];
  endereco_ponto?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  quantidade_telas?: number | null;
  ambientes?: string[];
  formato_tela?: string | null;
  resolucao?: string | null;
  tempo_exibicao_segundos?: number | null;
  loop_minutos?: number | null;
  insercoes_por_hora?: number | null;
  horas_operacao_dia?: number | null;
  detalhes_venda?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Produto> | null;
  sugestoes?: {
    tipos: string[];
    programas: string[];
    formatos: string[];
    faixas?: string[];
  };
};

export function ProdutoFormDialog({ open, onOpenChange, initial, sugestoes = { tipos: [], programas: [], formatos: [], faixas: [] } }: Props) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertProduto);
  const upsertTipoFn = useServerFn(upsertProdutoTipo);
  const [creatingTipo, setCreatingTipo] = useState(false);
  const { data: emissoras = [] } = useQuery({ queryKey: ["emissoras"], queryFn: () => listEmissoras() });
  
  
  const [form, setForm] = useState<Partial<Produto>>({
    midia: "TV",
    nome: "",
    duracao_segundos: 30,
    insercoes_padrao: 1,
    valor_unit: 0,
    ativo: true,
  });

  useEffect(() => {
    if (open) {
      setForm(initial || {
        midia: "TV",
        nome: "",
        duracao_segundos: 30,
        insercoes_padrao: 1,
        valor_unit: 0,
        ativo: true,
      });
    }
  }, [open, initial]);

  const saveMut = useMutation({
    mutationFn: (p: any) => upsertFn({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto salvo");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (patch: Partial<Produto>) => setForm({ ...form, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mídia</Label>
              <Select value={form.midia} onValueChange={(v) => set({ midia: v as Midia })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TV">TV</SelectItem>
                  <SelectItem value="Radio">Rádio</SelectItem>
                  <SelectItem value="DOOH">DOOH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo do Produto</Label>
              <CreatableCombobox
                value={form.tipo ?? ""}
                onChange={(v) => set({ tipo: v })}
                options={sugestoes.tipos}
                placeholder="Selecione ou crie (VT, Spot...)"
                creating={creatingTipo}
                onCreate={async (v) => {
                  if (!form.midia) return;
                  try {
                    setCreatingTipo(true);
                    await upsertTipoFn({ data: { nome: v, midia: form.midia } });
                    await qc.invalidateQueries({ queryKey: ["produto_tipos"] });
                    toast.success(`Tipo "${v}" adicionado`);
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setCreatingTipo(false);
                  }
                }}
              />
            </div>
          </div>
          <div>
            <Label>Nome</Label>
            <Input required value={form.nome ?? ""} onChange={(e) => set({ nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Programa</Label>
              <CreatableCombobox
                value={form.programa ?? ""}
                onChange={(v) => set({ programa: v })}
                options={sugestoes.programas}
                placeholder="Selecione ou crie"
              />
            </div>
            <div>
              <Label>Formato</Label>
              <CreatableCombobox
                value={form.formato ?? ""}
                onChange={(v) => set({ formato: v })}
                options={sugestoes.formatos}
                placeholder="Selecione ou crie (30s, Página...)"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Faixa horária</Label>
              <CreatableCombobox
                value={form.faixa ?? ""}
                onChange={(v) => set({ faixa: v })}
                options={sugestoes.faixas ?? []}
                placeholder="Selecione ou crie (Manhã, Tarde...)"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Duração (s)</Label>
                <Input type="number" min={1} required
                  value={form.duracao_segundos ?? 30}
                  onChange={(e) => set({ duracao_segundos: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Ins. padrão</Label>
                <Input type="number" min={1} required
                  value={form.insercoes_padrao ?? 1}
                  onChange={(e) => set({ insercoes_padrao: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <div>
            <Label>Valor unitário (R$)</Label>
            <Input type="number" min={0} step="0.01" required
              value={form.valor_unit ?? 0}
              onChange={(e) => set({ valor_unit: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Link do modelo do produto (opcional)</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={form.link_modelo ?? ""}
              onChange={(e) => set({ link_modelo: e.target.value })}
            />
          </div>
          <div>
            <Label>Emissora (CNPJ que emitirá o PI)</Label>
            <Select
              value={form.emissora_id ?? "none"}
              onValueChange={(v) => set({ emissora_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione a emissora" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem vínculo —</SelectItem>
                {(emissoras as Array<{ id: string; nome: string; cnpj: string | null; ativo: boolean }>)
                  .filter((e) => e.ativo)
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}{e.cnpj ? ` — ${e.cnpj}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Ao selecionar este produto em um PI, a emissora correspondente será sugerida automaticamente.
            </p>
          </div>
          {form.midia === "DOOH" && (
            <div className="rounded-md border p-3 bg-muted/30 space-y-3">
              <div>
                <Label className="text-sm">Rede de telas / ponto com múltiplas telas</Label>
                <p className="text-xs text-muted-foreground">
                  Preencha se o ponto tem mais de uma tela (edifícios, gastronomia, bares, academias, etc.).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantidade de telas</Label>
                  <Input
                    type="number" min={0}
                    value={form.quantidade_telas ?? ""}
                    onChange={(e) => set({ quantidade_telas: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="Ex.: 12"
                  />
                </div>
                <div>
                  <Label className="text-xs">Formato da tela</Label>
                  <Input
                    value={form.formato_tela ?? ""}
                    onChange={(e) => set({ formato_tela: e.target.value })}
                    placeholder="LED, LCD, Painel Digital, Outdoor…"
                  />
                </div>
                <div>
                  <Label className="text-xs">Resolução</Label>
                  <Input
                    value={form.resolucao ?? ""}
                    onChange={(e) => set({ resolucao: e.target.value })}
                    placeholder="Full HD, 4K, 1920x1080…"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tempo de exibição por inserção (s)</Label>
                  <Input
                    type="number" min={0}
                    value={form.tempo_exibicao_segundos ?? ""}
                    onChange={(e) => set({ tempo_exibicao_segundos: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="Ex.: 15"
                  />
                </div>
                <div>
                  <Label className="text-xs">Loop (minutos)</Label>
                  <Input
                    type="number" min={0}
                    value={form.loop_minutos ?? ""}
                    onChange={(e) => set({ loop_minutos: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="Ex.: 10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Inserções por hora</Label>
                  <Input
                    type="number" min={0}
                    value={form.insercoes_por_hora ?? ""}
                    onChange={(e) => set({ insercoes_por_hora: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="Ex.: 6"
                  />
                </div>
                <div>
                  <Label className="text-xs">Horas de operação/dia</Label>
                  <Input
                    type="number" min={0} max={24}
                    value={form.horas_operacao_dia ?? ""}
                    onChange={(e) => set({ horas_operacao_dia: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="Ex.: 12"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Ambientes atendidos</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["Edifícios corporativos","Edifícios residenciais","Gastronomia","Bares","Academias","Shoppings","Farmácias","Postos de combustível","Padarias","Clínicas","Hospitais","Universidades","Aeroportos","Rodoviárias"].map((a) => {
                    const active = (form.ambientes ?? []).includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          const cur = new Set(form.ambientes ?? []);
                          if (cur.has(a)) cur.delete(a); else cur.add(a);
                          set({ ambientes: Array.from(cur) });
                        }}
                        className={`px-2 py-1 rounded border text-[11px] font-medium ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-xs">Detalhes de venda / observações técnicas</Label>
                <Textarea
                  rows={3}
                  value={form.detalhes_venda ?? ""}
                  onChange={(e) => set({ detalhes_venda: e.target.value })}
                  placeholder="Ex.: 12 telas 55'' distribuídas em elevadores e recepção, exibição das 7h às 22h, 6 inserções/hora em loop de 10 min…"
                />
              </div>
              <div className="border-t pt-3">
                <Label className="text-sm">Geolocalização do ponto (OOH/DOOH)</Label>
                <p className="text-xs text-muted-foreground">
                  Cadastre o endereço e as coordenadas do ponto de mídia. Use o botão para capturar sua localização atual ou cole coordenadas do Google Maps.
                </p>
              </div>
              <div>
                <Label className="text-xs">Endereço do ponto</Label>
                <Input
                  value={form.endereco_ponto ?? ""}
                  onChange={(e) => set({ endereco_ponto: e.target.value })}
                  placeholder="Av. Paulista, 1000 — Bela Vista, São Paulo/SP"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={form.latitude ?? ""}
                    onChange={(e) => set({ latitude: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="-23.5613"
                  />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={form.longitude ?? ""}
                    onChange={(e) => set({ longitude: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="-46.6558"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.error("Geolocalização não suportada neste navegador");
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        set({
                          latitude: Number(pos.coords.latitude.toFixed(7)),
                          longitude: Number(pos.coords.longitude.toFixed(7)),
                        });
                        toast.success("Localização capturada");
                      },
                      (err) => toast.error("Não foi possível obter localização: " + err.message),
                      { enableHighAccuracy: true, timeout: 10000 },
                    );
                  }}
                >
                  Usar minha localização
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const txt = await navigator.clipboard.readText().catch(() => "");
                    const m = txt.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
                    if (!m) {
                      toast.error("Cole coordenadas no formato: -23.5613, -46.6558");
                      return;
                    }
                    set({ latitude: Number(m[1]), longitude: Number(m[2]) });
                    toast.success("Coordenadas coladas");
                  }}
                >
                  Colar do Google Maps
                </Button>
                {form.latitude != null && form.longitude != null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver no mapa ↗
                    </a>
                  </Button>
                )}
              </div>
              <div className="mt-2">
                <LocationPickerMap
                  latitude={form.latitude ?? null}
                  longitude={form.longitude ?? null}
                  onChange={(lat, lng) => set({ latitude: lat, longitude: lng })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Clique no mapa ou arraste o marcador para definir o ponto.
                </p>
              </div>
            </div>
          )}
          <div>
            <Label>Observação do produto</Label>
            <Textarea
              rows={3}
              value={form.observacao ?? ""}
              onChange={(e) => set({ observacao: e.target.value })}
              placeholder="Ex.: Material em alta definição, prazo de entrega, condições especiais…"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Quando este produto for adicionado a uma proposta ou PI, esta observação será incluída automaticamente no campo de observações.
            </p>
          </div>
          <div className="rounded-md border p-3 bg-muted/30 space-y-2">
            <div>
              <Label>Veiculação permitida no mapa de inserção</Label>
              <Select
                value={form.veiculacao_tipo ?? "livre"}
                onValueChange={(v) => set({ veiculacao_tipo: v as Produto["veiculacao_tipo"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="livre">Livre (qualquer dia)</SelectItem>
                  <SelectItem value="dias_uteis">Somente dias úteis (Seg–Sex)</SelectItem>
                  <SelectItem value="seg_sab">Segunda a sábado (Seg–Sáb)</SelectItem>
                  <SelectItem value="dias_semana">Somente dias fixos da semana (ex.: toda quarta)</SelectItem>
                  <SelectItem value="dias_fixos">Somente dias fixos do mês</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Ao selecionar este produto no PI/Proposta, o mapa de inserção só permitirá marcar os dias permitidos.
              </p>
            </div>
            {form.veiculacao_tipo === "dias_semana" && (
              <div>
                <Label className="text-xs">Dias da semana permitidos</Label>
                <div className="grid grid-cols-7 gap-1 mt-1">
                  {[
                    { d: 0, label: "Dom" },
                    { d: 1, label: "Seg" },
                    { d: 2, label: "Ter" },
                    { d: 3, label: "Qua" },
                    { d: 4, label: "Qui" },
                    { d: 5, label: "Sex" },
                    { d: 6, label: "Sáb" },
                  ].map(({ d, label }) => {
                    const active = (form.dias_semana_fixos ?? []).includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const cur = new Set(form.dias_semana_fixos ?? []);
                          if (cur.has(d)) cur.delete(d); else cur.add(d);
                          set({ dias_semana_fixos: Array.from(cur).sort((a, b) => a - b) });
                        }}
                        className={`h-8 rounded border text-[11px] font-medium ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Marque os dias da semana em que o programa vai ao ar.
                </p>
              </div>
            )}
            {form.veiculacao_tipo === "dias_fixos" && (
              <div>
                <Label className="text-xs">Dias fixos do mês</Label>
                <div className="grid grid-cols-7 gap-1 mt-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const active = (form.dias_fixos ?? []).includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const cur = new Set(form.dias_fixos ?? []);
                          if (cur.has(d)) cur.delete(d); else cur.add(d);
                          set({ dias_fixos: Array.from(cur).sort((a, b) => a - b) });
                        }}
                        className={`h-7 rounded border text-[11px] font-medium ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ativo ?? true} onCheckedChange={(v) => set({ ativo: v })} />
            <Label>Ativo</Label>
          </div>
          <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/30">
            <Switch
              id="requer_producao"
              checked={form.requer_producao ?? false}
              onCheckedChange={(v) => set({ requer_producao: v })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="requer_producao" className="cursor-pointer">Requer produção</Label>
              <p className="text-xs text-muted-foreground">
                Ao incluir este produto em um PI, o perfil <strong>Produção</strong> será notificado automaticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
