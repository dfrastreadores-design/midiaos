import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BriefingAnexosSection } from "./BriefingAnexosSection";
import { upsertBriefing, type BriefingType } from "@/lib/briefings.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { listClientes, upsertCliente } from "@/lib/clientes.functions";
import { listAgencias, upsertAgencia } from "@/lib/agencias.functions";
import { fetchCnpj, onlyDigits, formatCNPJ } from "@/lib/cnpj";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<BriefingType> & { id?: string } | null;
};

const empty: BriefingType = {
  status: "novo",
  tipo_entidade: "cliente",
  razao_social: "",
  campanha: "",
  produtos: [],
};

export function BriefingFormDialog({ open, onOpenChange, initial }: Props) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertBriefing);
  const listProdutosFn = useServerFn(listProdutos);
  const listClientesFn = useServerFn(listClientes);
  const listAgenciasFn = useServerFn(listAgencias);
  const upsertClienteFn = useServerFn(upsertCliente);
  const upsertAgenciaFn = useServerFn(upsertAgencia);
  const [form, setForm] = useState<BriefingType>(empty);
  const [cnpjLookup, setCnpjLookup] = useState<"idle" | "searching" | "found" | "fetched" | "created" | "notfound">("idle");
  const [lastLookedCnpj, setLastLookedCnpj] = useState<string>("");

  // Carrega produtos de TV do banco
  const { data: produtosTv = [] } = useQuery({
    queryKey: ["produtos-tv"],
    queryFn: async () => {
      const all = await listProdutosFn();
      return (all as any[]).filter((p) => p.midia === "TV" && p.ativo);
    },
  });

  useEffect(() => {
    if (open) {
      setForm({ ...empty, ...(initial as any) });
      setCnpjLookup("idle");
      setLastLookedCnpj("");
    }
  }, [open, initial?.id]);

  const set = <K extends keyof BriefingType>(k: K, v: BriefingType[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Auto-busca CNPJ
  useEffect(() => {
    const digits = onlyDigits(form.cnpj ?? "");
    if (digits.length !== 14) { setCnpjLookup("idle"); return; }
    if (digits === lastLookedCnpj) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLastLookedCnpj(digits);
      setCnpjLookup("searching");
      try {
        const tipo = form.tipo_entidade;
        const list = tipo === "agencia" ? await listAgenciasFn() : await listClientesFn();
        const match = (list as any[]).find((r) => onlyDigits(r.cnpj ?? "") === digits);
        if (cancelled) return;
        if (match) {
          setForm((f) => ({
            ...f,
            cnpj: formatCNPJ(digits),
            razao_social: match.razao_social ?? f.razao_social,
            nome_fantasia: match.nome_fantasia ?? f.nome_fantasia,
            segmento_cliente: match.segmento ?? f.segmento_cliente,
          }));
          setCnpjLookup("found");
          toast.success(`${tipo === "agencia" ? "Agência" : "Cliente"} encontrado no cadastro`);
          return;
        }
        // Buscar na Receita
        toast.info("CNPJ não cadastrado — buscando na Receita...");
        const r = await fetchCnpj(digits);
        if (cancelled) return;
        const endereco = [r.logradouro, r.numero, r.bairro].filter(Boolean).join(", ");
        setForm((f) => ({
          ...f,
          cnpj: formatCNPJ(digits),
          razao_social: r.razaoSocial || f.razao_social,
          nome_fantasia: r.nomeFantasia || f.nome_fantasia,
        }));
        setCnpjLookup("fetched");
        // Cadastrar automaticamente
        try {
          const payload: any = {
            razao_social: r.razaoSocial,
            nome_fantasia: r.nomeFantasia || null,
            cnpj: formatCNPJ(digits),
            endereco: endereco || null,
            cidade: r.cidade || null,
            uf: r.estado || null,
            cep: r.cep || null,
            cnae: r.cnae || null,
            situacao_cadastral: r.situacaoCadastral || null,
            inscricao_estadual: r.inscricaoEstadual || null,
            inscricao_municipal: r.inscricaoMunicipal || null,
            contatos: [],
          };
          if (tipo === "agencia") await upsertAgenciaFn({ data: payload });
          else await upsertClienteFn({ data: payload });
          if (cancelled) return;
          setCnpjLookup("created");
          toast.success(`${tipo === "agencia" ? "Agência" : "Cliente"} cadastrado automaticamente`);
          qc.invalidateQueries({ queryKey: [tipo === "agencia" ? "agencias" : "clientes"] });
        } catch (e: any) {
          toast.error("Falha ao cadastrar: " + (e.message ?? e));
        }
      } catch (e: any) {
        if (cancelled) return;
        setCnpjLookup("notfound");
        toast.error("CNPJ não encontrado na Receita");
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.cnpj, form.tipo_entidade]);

  const save = useMutation({
    mutationFn: async (payload: BriefingType) => upsertFn({ data: payload }),
    onSuccess: () => {
      toast.success(form.id ? "Briefing atualizado" : "Briefing criado");
      qc.invalidateQueries({ queryKey: ["briefings"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const toggleProduto = (id: string) => {
    const cur = new Set(form.produtos ?? []);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    set("produtos", Array.from(cur));
  };

  const isSaving = save.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Solicitação de Proposta" : "Nova Solicitação de Proposta"}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Preencha os dados abaixo. A solicitação será enviada ao ADM, que ficará responsável por confeccionar a proposta.
          </p>
        </DialogHeader>

        <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="campanha">Campanha</TabsTrigger>
            <TabsTrigger value="anexos" disabled={!form.id}>Anexos</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-2 pr-3">
            <TabsContent value="dados" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo_entidade}
                    onValueChange={(v) => set("tipo_entidade", v as any)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente direto</SelectItem>
                      <SelectItem value="agencia">Agência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    CNPJ
                    {cnpjLookup === "searching" && <Loader2 className="size-3 animate-spin" />}
                    {cnpjLookup === "found" && <span className="text-xs text-green-600">já cadastrado</span>}
                    {cnpjLookup === "created" && <span className="text-xs text-green-600">cadastrado da Receita</span>}
                    {cnpjLookup === "fetched" && <span className="text-xs text-amber-600">dados da Receita</span>}
                    {cnpjLookup === "notfound" && <span className="text-xs text-destructive">não encontrado</span>}
                  </Label>
                  <Input
                    value={form.cnpj ?? ""}
                    onChange={(e) => set("cnpj", formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Razão Social *</Label>
                  <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
                </div>
                <div>
                  <Label>Contato</Label>
                  <Input value={form.contato_nome ?? ""} onChange={(e) => set("contato_nome", e.target.value)} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.contato_telefone ?? ""} onChange={(e) => set("contato_telefone", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.contato_email ?? ""} onChange={(e) => set("contato_email", e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="campanha" className="space-y-4 m-0">
              <div>
                <Label>Campanha *</Label>
                <Input value={form.campanha} onChange={(e) => set("campanha", e.target.value)} placeholder="Nome da campanha" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Período estimado</Label>
                  <Input
                    value={form.periodo_estimado ?? ""}
                    onChange={(e) => set("periodo_estimado", e.target.value)}
                    placeholder="Ex.: 01/03 a 30/04"
                  />
                </div>
                <div>
                  <Label>Verba estimada (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.verba_estimada ?? ""}
                    onChange={(e) => set("verba_estimada", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </div>
              <div>
                <Label>Objetivo da campanha</Label>
                <Textarea rows={3} value={form.objetivo ?? ""} onChange={(e) => set("objetivo", e.target.value)} placeholder="O que se espera alcançar com esta campanha?" />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Produtos de TV de interesse</Label>
                  <span className="text-xs text-muted-foreground">
                    {(form.produtos ?? []).length} selecionado(s) de {produtosTv.length}
                  </span>
                </div>
                {produtosTv.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum produto de TV cadastrado.</p>
                ) : (
                  <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                    {produtosTv.map((p: any) => {
                      const checked = (form.produtos ?? []).includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-start gap-3 p-2.5 cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleProduto(p.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{p.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {[p.programa, p.faixa, p.tipo].filter(Boolean).join(" • ")}
                              {p.duracao_segundos ? ` • ${p.duracao_segundos}s` : ""}
                            </div>
                          </div>
                          <div className="text-xs font-medium whitespace-nowrap">
                            {Number(p.valor_unit).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea rows={3} value={form.detalhes_adicionais ?? ""} onChange={(e) => set("detalhes_adicionais", e.target.value)} placeholder="Público-alvo, concorrentes, preferências, restrições..." />
              </div>
            </TabsContent>

            <TabsContent value="anexos" className="m-0">
              <BriefingAnexosSection briefingId={form.id ?? null} />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate(form)} disabled={isSaving || !form.razao_social || !form.campanha}>
            {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
