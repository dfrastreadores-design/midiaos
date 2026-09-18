import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Plus, CheckCircle2, Trash2, Mail, Phone, UserPlus, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fetchCnpj, formatCNPJ, onlyDigits, type CnpjData } from "@/lib/cnpj";

type Kind = "cliente" | "agencia";

export type Contato = { nome: string; funcao: string };

export type CadastroData = {
  kind: Kind;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  emails: string[];
  telefones: string[];
  contatos: Contato[];
  observacao: string;
  executivo?: string;
  comissao?: string;
  agenciaId?: string;
};

const empty = (): Omit<CadastroData, "kind"> => ({
  nome: "",
  razaoSocial: "",
  cnpj: "",
  cep: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  emails: [""],
  telefones: [""],
  contatos: [{ nome: "", funcao: "" }],
  observacao: "",
  executivo: "",
  comissao: "",
  agenciaId: "",
});

export function CadastroDialog({
  kind,
  triggerLabel,
  onSubmit,
  agencias,
}: {
  kind: Kind;
  triggerLabel?: string;
  onSubmit?: (data: CadastroData) => void;
  agencias?: { id: string; nome: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState(false);
  const [form, setForm] = useState(empty());

  const lookup = async () => {
    if (onlyDigits(form.cnpj).length !== 14) {
      toast.error("Informe um CNPJ válido (14 dígitos)");
      return;
    }
    setLoading(true);
    try {
      const data: CnpjData = await fetchCnpj(form.cnpj);
      setForm((f) => ({
        ...f,
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nome: f.nome || data.nomeFantasia,
        emails: data.email ? [data.email, ...f.emails.filter((e) => e && e !== data.email)] : f.emails,
        telefones: data.telefone ? [data.telefone, ...f.telefones.filter((t) => t && t !== data.telefone)] : f.telefones,
        cep: data.cep || f.cep,
        logradouro: data.logradouro || f.logradouro,
        numero: data.numero || f.numero,
        bairro: data.bairro || f.bairro,
        cidade: data.cidade,
        estado: data.estado,
      }));
      setFilled(true);
      toast.success("Dados preenchidos pela Receita Federal");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateList = <T,>(key: "emails" | "telefones" | "contatos", idx: number, value: T) => {
    setForm((f) => ({ ...f, [key]: (f[key] as T[]).map((v, i) => (i === idx ? value : v)) }));
  };
  const addItem = (key: "emails" | "telefones" | "contatos") => {
    setForm((f) => ({
      ...f,
      [key]: key === "contatos" ? [...f.contatos, { nome: "", funcao: "" }] : [...(f[key] as string[]), ""],
    }));
  };
  const removeItem = (key: "emails" | "telefones" | "contatos", idx: number) => {
    setForm((f) => ({ ...f, [key]: (f[key] as unknown[]).filter((_, i) => i !== idx) }));
  };

  const submit = () => {
    if (!form.nome || !form.cnpj) {
      toast.error("Nome e CNPJ são obrigatórios");
      return;
    }
    const cleaned: CadastroData = {
      ...form,
      kind,
      emails: form.emails.filter(Boolean),
      telefones: form.telefones.filter(Boolean),
      contatos: form.contatos.filter((c) => c.nome || c.funcao),
    };
    onSubmit?.(cleaned);
    toast.success(kind === "cliente" ? "Cliente cadastrado" : "Agência cadastrada");
    setOpen(false);
    setFilled(false);
    setForm(empty());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          {triggerLabel ?? (kind === "cliente" ? "Novo Cliente" : "Nova Agência")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kind === "cliente" ? "Cadastrar Cliente Anunciante" : "Cadastrar Agência de Publicidade"}</DialogTitle>
          <DialogDescription>
            Digite o CNPJ e clique em <strong>Buscar</strong> para preencher automaticamente via Receita Federal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* CNPJ */}
          <div className="space-y-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <div className="flex gap-2">
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: formatCNPJ(e.target.value) }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookup())}
              />
              <Button type="button" variant="secondary" onClick={lookup} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>
            {filled && (
              <p className="text-xs text-primary flex items-center gap-1 mt-1">
                <CheckCircle2 className="size-3" /> Dados puxados da Receita Federal
              </p>
            )}
          </div>

          {/* Identificação */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Razão Social</Label>
              <Input value={form.razaoSocial} onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{kind === "cliente" ? "Nome Fantasia" : "Nome da Agência"}</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))} placeholder="Rua, Avenida…" />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>UF</Label>
              <Input maxLength={2} value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase() }))} />
            </div>
            {kind === "cliente" && (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="flex items-center gap-2"><Building2 className="size-4" /> Agência Vinculada</Label>
                  <Select
                    value={form.agenciaId || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, agenciaId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma agência (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Cliente direto (sem agência)</SelectItem>
                      {(agencias ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Executivo Responsável</Label>
                  <Input value={form.executivo} onChange={(e) => setForm((f) => ({ ...f, executivo: e.target.value }))} placeholder="Ana Carvalho" />
                </div>
              </>
            )}
            {kind === "agencia" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Comissão (%)</Label>
                <Input type="number" value={form.comissao} onChange={(e) => setForm((f) => ({ ...f, comissao: e.target.value }))} placeholder="20" />
              </div>
            )}
          </div>

          {/* E-mails */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Mail className="size-4" /> E-mails</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => addItem("emails")}>
                <Plus className="size-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {form.emails.map((email, i) => (
              <div key={i} className="flex gap-2">
                <Input type="email" placeholder="email@empresa.com" value={email} onChange={(e) => updateList<string>("emails", i, e.target.value)} />
                {form.emails.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeItem("emails", i)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Telefones */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Phone className="size-4" /> Telefones</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => addItem("telefones")}>
                <Plus className="size-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {form.telefones.map((tel, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="(61) 99999-9999" value={tel} onChange={(e) => updateList<string>("telefones", i, e.target.value)} />
                {form.telefones.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeItem("telefones", i)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Contatos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><UserPlus className="size-4" /> Contatos</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => addItem("contatos")}>
                <Plus className="size-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {form.contatos.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input placeholder="Nome" value={c.nome} onChange={(e) => updateList<Contato>("contatos", i, { ...c, nome: e.target.value })} />
                <Input placeholder="Função (ex: Diretor de Mídia)" value={c.funcao} onChange={(e) => updateList<Contato>("contatos", i, { ...c, funcao: e.target.value })} />
                {form.contatos.length > 1 ? (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeItem("contatos", i)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            ))}
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              placeholder="Notas internas, histórico, particularidades comerciais…"
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar Cadastro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
