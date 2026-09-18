import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { PriceCalculator } from "@/components/PriceCalculator";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { listUsuarios } from "@/lib/usuarios.functions";
import { buildProdutoObservacoes } from "@/lib/produto-observacoes";
import { useUserRoles } from "@/hooks/use-roles";
import { usePropostaForm } from "@/hooks/use-proposta-form";
import { CustomerSelector } from "@/components/proposta/CustomerSelector";
import { ProposalObservations } from "@/components/proposta/ProposalObservations";
import { PropostaAnexosSection } from "@/components/PropostaAnexosSection";
import { NearbyDoohSuggestions } from "@/components/NearbyDoohSuggestions";
import { errorFieldClass, errorInputClass } from "@/lib/form-errors";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
};

export function PropostaFormDialog({ open, onOpenChange, initial }: Props) {
  const { isAdmin } = useUserRoles();
  const { state, save, isSaving, hasError } = usePropostaForm(open ? initial : null, onOpenChange);
  
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: () => listClientes(), enabled: open });
  const { data: agencias = [] } = useQuery({ queryKey: ["agencias"], queryFn: () => listAgencias(), enabled: open });
  const { data: produtos = [] } = useQuery({ queryKey: ["produtos"], queryFn: () => listProdutos(), enabled: open });
  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => listUsuarios(), enabled: open && isAdmin });

  const executivos = usuarios.filter(u => u.roles?.includes("executivo") || u.roles?.includes("admin"));
  const parceiros = usuarios.filter(u => u.roles?.includes("parceiro_comercial"));
  const obsProdutos = buildProdutoObservacoes(state.items, produtos || []);
  const clienteSelecionado = clientes.find((c: any) => c.id === state.clienteId) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto rounded-[1.5rem]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{initial?.id && !initial.isCopy ? "Editar Proposta" : "Nova Proposta"}</DialogTitle>
          <DialogDescription>Numeração automática ao salvar.</DialogDescription>
        </DialogHeader>

        {!state.isLoading ? (
          <div className="space-y-4 py-2">
            <div data-field="cliente" className={errorFieldClass(hasError("cliente"))}>
              <CustomerSelector 
                clienteId={state.clienteId}
                setClienteId={state.setClienteId}
                agenciaId={state.agenciaId}
                setAgenciaId={state.setAgenciaId}
                clienteAvulso={state.clienteAvulso}
                setClienteAvulso={state.setClienteAvulso}
                clientes={clientes}
                agencias={agencias}
                hasError={hasError("cliente")}
              />
            </div>

            <NearbyDoohSuggestions cliente={clienteSelecionado} />

            <div className="grid sm:grid-cols-2 gap-3">
              {isAdmin && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Executivo Responsável</Label>
                  <Select value={state.executivoId || "none"} onValueChange={(v) => state.setExecutivoId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o executivo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Usar meu perfil —</SelectItem>
                      {executivos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isAdmin && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Executivo Parceiro (Briefing)</Label>
                  <Select value={state.executivoParceiroId || "none"} onValueChange={(v) => state.setExecutivoParceiroId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o parceiro" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Vincula a proposta a um parceiro comercial que originou a solicitação.</p>
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2" data-field="campanha">
                <Label>Campanha {hasError("campanha") && <span className="text-destructive text-xs">*obrigatório</span>}</Label>
                <Input value={state.campanha} onChange={(e) => state.setCampanha(e.target.value)} className={errorInputClass(hasError("campanha"))} />
              </div>
              <div className="space-y-1.5">
                <Label>Validade</Label>
                <Input type="date" value={state.validade} onChange={(e) => state.setValidade(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Se vazio, ao enviar será preenchido com 10 dias úteis.
                </p>
              </div>
            </div>

            <div data-field="items" className={errorFieldClass(hasError("items"))}>
              <PriceCalculator
                title="Itens da Proposta"
                initialItems={state.items}
                onChange={(its, tt) => { state.setItems(its); state.setTotals(tt); }}
                isLoading={state.isLoading}
              />
            </div>

            <ProposalObservations 
              observacao={state.observacao}
              setObservacao={state.setObservacao}
              obsProdutos={obsProdutos}
            />

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Anexos (proposta externa, PDFs, etc.)</Label>
              <PropostaAnexosSection propostaId={initial?.id && !initial.isCopy ? initial.id : null} />
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin" />
            <p>Carregando dados...</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="secondary" disabled={isSaving} onClick={() => save("rascunho", obsProdutos)}>
            Salvar Rascunho
          </Button>
          <Button disabled={isSaving} onClick={() => save("enviada", obsProdutos)}>
            Salvar e Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
