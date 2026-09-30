import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { ativarPlanoUpgrade } from "@/lib/upgrade.functions";

export function UpgradePlanoDialog({
  open,
  onOpenChange,
  plano,
  onUpgraded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plano: string;
  onUpgraded: () => void;
}) {
  const ativar = useServerFn(ativarPlanoUpgrade);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    contato_nome: "",
    contato_whatsapp: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razao_social || !form.contato_nome) {
      toast.error("Informe a razão social e o responsável.");
      return;
    }
    setSaving(true);
    try {
      await ativar({ data: { plano_nome: plano, ...form } });
      toast.success("Plano ativado! Bem-vindo ao mídia.OS.");
      onUpgraded();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao ativar plano");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Ativar plano {plano}
          </DialogTitle>
          <DialogDescription>
            Cadastre sua empresa para liberar o acesso imediato. Seus dados do teste são mantidos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-2">
            <Label>Razão social *</Label>
            <Input value={form.razao_social} onChange={set("razao_social")} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Nome fantasia</Label>
              <Input value={form.nome_fantasia} onChange={set("nome_fantasia")} />
            </div>
            <div className="grid gap-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Responsável *</Label>
              <Input value={form.contato_nome} onChange={set("contato_nome")} required />
            </div>
            <div className="grid gap-2">
              <Label>WhatsApp</Label>
              <Input
                value={form.contato_whatsapp}
                onChange={set("contato_whatsapp")}
                placeholder="(61) 9 9999-9999"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Ativar plano {plano}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
