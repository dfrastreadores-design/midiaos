import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NovoClienteButton, NovaAgenciaButton } from "@/components/QuickCadastroButtons";
import { errorInputClass } from "@/lib/form-errors";

type CustomerSelectorProps = {
  clienteId: string;
  setClienteId: (id: string) => void;
  agenciaId: string;
  setAgenciaId: (id: string) => void;
  clienteAvulso: string;
  setClienteAvulso: (val: string) => void;
  clientes: any[];
  agencias: any[];
  hasError?: boolean;
};

export function CustomerSelector({
  clienteId,
  setClienteId,
  agenciaId,
  setAgenciaId,
  clienteAvulso,
  setClienteAvulso,
  clientes,
  agencias,
  hasError = false,
}: CustomerSelectorProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>
          Cliente {hasError && <span className="text-destructive text-xs">*obrigatório</span>}
        </Label>
        <div className="flex gap-2">
          <Select
            value={clienteId || "none"}
            onValueChange={(v) => setClienteId(v === "none" ? "" : v)}
          >
            <SelectTrigger className={errorInputClass(hasError)}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sem cliente —</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_fantasia || c.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NovoClienteButton />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Agência</Label>
        <div className="flex gap-2">
          <Select
            value={agenciaId || "none"}
            onValueChange={(v) => setAgenciaId(v === "none" ? "" : v)}
          >
            <SelectTrigger className={errorInputClass(hasError)}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Direto —</SelectItem>
              {agencias.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome_fantasia || a.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NovaAgenciaButton />
        </div>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Cliente / Agência (avulso)</Label>
        <Input
          value={clienteAvulso}
          onChange={(e) => setClienteAvulso(e.target.value)}
          placeholder="Digite o nome se ainda não houver cadastro"
          maxLength={200}
          className={errorInputClass(hasError)}
        />
        <p className="text-xs text-muted-foreground">
          Opcional. Use quando o cliente/agência ainda não está cadastrado no sistema.
        </p>
      </div>
    </div>
  );
}
