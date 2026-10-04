import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, DollarSign, Percent, QrCode, Phone, Mail, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { upsertIndicador, type IndicadorInput } from "@/lib/indicadores.functions";
import { formatCNPJ, onlyDigits } from "@/lib/cnpj";
import { traduzirErro } from "@/lib/error-translator";

interface IndicadorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicador?: IndicadorInput | null;
  onSaved: () => void;
}

export function IndicadorFormDialog({
  open,
  onOpenChange,
  indicador,
  onSaved,
}: IndicadorFormDialogProps) {
  const [form, setForm] = useState<IndicadorInput>({
    nome: "",
    email: "",
    telefone: "",
    cpf_cnpj: "",
    tipo_chave_pix: "cpf",
    chave_pix: "",
    banco_nome: "",
    percentual_comissao_padrao: 5,
    observacoes: "",
    ativo: true,
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (indicador) {
      setForm(indicador);
    } else {
      setForm({
        nome: "",
        email: "",
        telefone: "",
        cpf_cnpj: "",
        tipo_chave_pix: "cpf",
        chave_pix: "",
        banco_nome: "",
        percentual_comissao_padrao: 5,
        observacoes: "",
        ativo: true,
      });
    }
  }, [indicador, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome da pessoa que indica");
      return;
    }

    setSalvando(true);
    try {
      await upsertIndicador({ data: form });
      toast.success(
        indicador?.id ? "Indicador atualizado com sucesso!" : "Indicador cadastrado com sucesso!",
        {
          description: "Agora você pode vincular esta pessoa aos clientes indicados.",
        }
      );
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(traduzirErro(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="size-5 text-primary" />
            {indicador?.id ? "Editar Pessoa que Indica" : "Cadastrar Pessoa que Indica Clientes"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre parceiros, afiliados e promotores que indicam clientes. Ao fechar e pagar contratos, a comissão é calculada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Nome Completo *</Label>
            <Input
              required
              placeholder="Ex: Carlos Eduardo de Oliveira"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">WhatsApp / Telefone</Label>
              <div className="relative">
                <Phone className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="(61) 99999-0000"
                  value={form.telefone ?? ""}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">E-mail</Label>
              <div className="relative">
                <Mail className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-8"
                  placeholder="carlos@exemplo.com"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">CPF ou CNPJ</Label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf_cnpj ?? ""}
                onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>% Comissão Padrão</span>
                <span className="text-primary font-bold">{form.percentual_comissao_padrao}%</span>
              </Label>
              <div className="relative">
                <Percent className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="pl-8 font-semibold"
                  value={form.percentual_comissao_padrao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      percentual_comissao_padrao: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Dados para Pagamento PIX */}
          <div className="rounded-xl border p-3.5 bg-muted/20 space-y-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <QrCode className="size-4 text-emerald-600" />
              Dados para Pagamento da Comissão (PIX)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Tipo de Chave</Label>
                <Select
                  value={form.tipo_chave_pix ?? "cpf"}
                  onValueChange={(v) => setForm({ ...form, tipo_chave_pix: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px]">Chave PIX</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="Informe a chave PIX para repasse"
                  value={form.chave_pix ?? ""}
                  onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Banco / Instituição (Opcional)</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Ex: Nubank, Banco do Brasil, Itaú..."
                value={form.banco_nome ?? ""}
                onChange={(e) => setForm({ ...form, banco_nome: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Observações / Acordos de Parceria</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Indicação direta para propostas acima de R$ 15k, repasse em até 5 dias após liquidação do contrato..."
              value={form.observacoes ?? ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvando}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="size-4" />
              {salvando ? "Salvando..." : "Salvar Indicador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
