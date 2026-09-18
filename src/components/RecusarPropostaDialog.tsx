import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { marcarPropostaRecusada } from "@/lib/propostas.functions";

interface Props {
  propostaId: string | null;
  numero?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MOTIVOS = [
  "Preço acima do orçamento",
  "Optou por concorrente",
  "Adiou a campanha",
  "Sem retorno do cliente",
  "Não é o momento",
  "Outro",
];

export function RecusarPropostaDialog({ propostaId, numero, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [motivoSel, setMotivoSel] = useState<string>("");
  const [detalhe, setDetalhe] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!propostaId) return;
      const motivo = [motivoSel, detalhe.trim()].filter(Boolean).join(" — ");
      await marcarPropostaRecusada({ data: { id: propostaId, motivo: motivo || undefined } });
    },
    onSuccess: () => {
      toast.success("Proposta marcada como não interessada");
      qc.invalidateQueries({ queryKey: ["propostas"] });
      setMotivoSel("");
      setDetalhe("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cliente não tem interesse{numero ? ` — Proposta ${numero}` : ""}</DialogTitle>
          <DialogDescription>
            Registre o motivo para acompanhamento comercial. A proposta será marcada como Recusada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Motivo</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOTIVOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivoSel(m)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    motivoSel === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="detalhe">Observação (opcional)</Label>
            <Textarea
              id="detalhe"
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              placeholder="Ex.: cliente pediu para retomar no próximo trimestre…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvando…" : "Marcar como não interessado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
