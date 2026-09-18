import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Loader2 } from "lucide-react";
import { listExecutivos, setExecutivoAtendimento } from "@/lib/atendimento.functions";
import { toast } from "sonner";

export function AtribuirExecutivoButton({
  tipo, id, executivoId, executivoNome, queryKey,
}: {
  tipo: "cliente" | "agencia";
  id: string;
  executivoId: string | null;
  executivoNome?: string | null;
  queryKey: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(executivoId ?? "__none");

  const { data: executivos = [] } = useQuery({
    queryKey: ["executivos-atendimento"],
    queryFn: () => listExecutivos() as unknown as Promise<{ id: string; nome: string }[]>,
    enabled: open,
  });

  const m = useMutation({
    mutationFn: () =>
      setExecutivoAtendimento({
        data: { tipo, id, executivo_id: value === "__none" ? null : value },
      }),
    onSuccess: () => {
      toast.success("Atendimento atualizado");
      qc.invalidateQueries({ queryKey: [queryKey] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setValue(executivoId ?? "__none"); }}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5" title="Atribuir executivo">
          <UserCheck className="size-4" />
          <span className="text-xs truncate max-w-[120px]">{executivoNome || "Atribuir"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 space-y-2"
        align="end"
        onInteractOutside={(e) => {
          const t = e.target as Element | null;
          if (t?.closest('[data-radix-select-content],[data-radix-select-viewport],[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="text-xs font-medium text-muted-foreground">Executivo responsável</div>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Sem atendimento</SelectItem>
            {executivos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending && <Loader2 className="size-3 animate-spin mr-1.5" />}
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
