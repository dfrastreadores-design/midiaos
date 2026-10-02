import { useState } from "react";
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
import { ClienteFormDialog } from "@/components/ClienteFormDialog";
import { AgenciaFormDialog } from "@/components/AgenciaFormDialog";
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
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [modalAgenciaOpen, setModalAgenciaOpen] = useState(false);

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>
          Cliente {hasError && <span className="text-destructive text-xs">*obrigatório</span>}
        </Label>
        <div className="flex gap-2">
          <Select
            value={clienteId || "none"}
            onValueChange={(v) => {
              if (v === "__novo_cliente__") {
                setModalClienteOpen(true);
                return;
              }
              setClienteId(v === "none" ? "" : v);
            }}
          >
            <SelectTrigger className={errorInputClass(hasError)}>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="__novo_cliente__"
                className="text-primary font-semibold border-b border-border/80 mb-1 pb-1.5 focus:bg-primary/10 cursor-pointer"
              >
                ➕ Cadastrar Novo Cliente...
              </SelectItem>
              <SelectItem value="none">— Sem cliente —</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_fantasia || c.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NovoClienteButton
            onCreated={(c) => {
              if (c?.id) setClienteId(c.id);
            }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Agência</Label>
        <div className="flex gap-2">
          <Select
            value={agenciaId || "none"}
            onValueChange={(v) => {
              if (v === "__nova_agencia__") {
                setModalAgenciaOpen(true);
                return;
              }
              setAgenciaId(v === "none" ? "" : v);
            }}
          >
            <SelectTrigger className={errorInputClass(hasError)}>
              <SelectValue placeholder="Selecione a agência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="__nova_agencia__"
                className="text-primary font-semibold border-b border-border/80 mb-1 pb-1.5 focus:bg-primary/10 cursor-pointer"
              >
                ➕ Cadastrar Nova Agência...
              </SelectItem>
              <SelectItem value="none">— Direto (Sem agência) —</SelectItem>
              {agencias.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome_fantasia || a.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NovaAgenciaButton
            onCreated={(a) => {
              if (a?.id) setAgenciaId(a.id);
            }}
          />
        </div>
      </div>

      <ClienteFormDialog
        open={modalClienteOpen}
        onOpenChange={setModalClienteOpen}
        agencias={agencias.map((a) => ({
          id: a.id,
          nome: a.nome_fantasia || a.razao_social,
        }))}
        onSuccess={(saved) => {
          if (saved?.id) setClienteId(saved.id);
        }}
      />

      <AgenciaFormDialog
        open={modalAgenciaOpen}
        onOpenChange={setModalAgenciaOpen}
        onSuccess={(saved) => {
          if (saved?.id) setAgenciaId(saved.id);
        }}
      />
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
