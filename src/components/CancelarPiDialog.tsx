import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cancelarPi } from "@/lib/pi.functions";
import { toast } from "sonner";

export function CancelarPiDialog({
  piId,
  numero,
  open,
  onOpenChange,
}: {
  piId: string | null;
  numero: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [substituir, setSubstituir] = useState(false);

  const m = useMutation({
    mutationFn: async () => {
      if (!piId) throw new Error("PI inválido");
      if (motivo.trim().length < 3) throw new Error("Descreva o motivo");
      return cancelarPi({ data: { id: piId, motivo: motivo.trim(), substituir } });
    },
    onSuccess: (r) => {
      toast.success(substituir ? "PI substituído. Novo rascunho criado." : "PI cancelado.");
      qc.invalidateQueries({ queryKey: ["pis"] });
      onOpenChange(false);
      setMotivo("");
      setSubstituir(false);
      if (r?.novoId) {
        // Mantém o usuário na lista, o novo aparece em rascunho
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar PI {numero}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={substituir} onCheckedChange={(v) => setSubstituir(Boolean(v))} />
            <span>Substituir por um novo PI (rascunho copiado com os mesmos itens).</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
            {substituir ? "Cancelar e Substituir" : "Cancelar PI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
