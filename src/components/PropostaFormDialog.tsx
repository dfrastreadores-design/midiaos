import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ParceiroFormDialog } from "@/components/ParceiroFormDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileUp, RotateCcw, History } from "lucide-react";
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
import { PropostaIaAssistant } from "@/components/proposta/PropostaIaAssistant";
import { Planejamento360Modal } from "@/components/planejamento360/Planejamento360Modal";
import { Badge } from "@/components/ui/badge";
import { Compass } from "lucide-react";
import { errorFieldClass, errorInputClass } from "@/lib/form-errors";
import { QuickDateInput } from "@/components/ui/quick-date-input";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  onOpenImport?: () => void;
};

export function PropostaFormDialog({ open, onOpenChange, initial, onOpenImport }: Props) {
  const { isAdmin, isDiretoria } = useUserRoles();
  const canAssignCollaborator = isAdmin || isDiretoria;
  const { state, save, isSaving, hasError } = usePropostaForm(open ? initial : null, onOpenChange);
  const [cadastrarParceiroOpen, setCadastrarParceiroOpen] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(),
    enabled: open,
  });
  const { data: agencias = [] } = useQuery({
    queryKey: ["agencias"],
    queryFn: () => listAgencias(),
    enabled: open,
  });
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: () => listProdutos(),
    enabled: open,
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listUsuarios(),
    enabled: open && canAssignCollaborator,
  });

  const executivos = usuarios
    .filter((u) => !u.roles?.includes("parceiro_comercial") && !u.roles?.includes("teste"))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  const parceiros = usuarios.filter((u) => u.roles?.includes("parceiro_comercial"));
  const obsProdutos = buildProdutoObservacoes(state.items, produtos || []);
  const clienteSelecionado = clientes.find((c: any) => c.id === state.clienteId) || null;

  const handleApplyIaSuggestion = (sugestao: any) => {
    if (sugestao.campanha) {
      state.setCampanha(sugestao.campanha);
    }
    if (sugestao.itens && sugestao.itens.length > 0) {
      state.setItems(sugestao.itens);
    }
    const blocosTexto: string[] = [];
    if (sugestao.estrategia) {
      blocosTexto.push(`🎯 ESTRATÉGIA COMERCIAL:\n${sugestao.estrategia}`);
    }
    if (sugestao.escopo_detalhado) {
      blocosTexto.push(`📋 ESCOPO & ENTREGÁVEIS:\n${sugestao.escopo_detalhado}`);
    }
    if (sugestao.justificativa_comercial) {
      blocosTexto.push(
        `💼 CONDIÇÕES COMERCIAIS & INVESTIMENTO:\n${sugestao.justificativa_comercial}`,
      );
    }

    if (blocosTexto.length > 0) {
      const textoFinal = blocosTexto.join("\n\n");
      const novaObs = state.observacao ? `${textoFinal}\n\n---\n${state.observacao}` : textoFinal;
      state.setObservacao(novaObs);
    }
  };

  const [modalPlanejamento360Open, setModalPlanejamento360Open] = useState(false);

  const handleAplicarPlano360 = (itens: any[], defesa: string) => {
    if (!itens || itens.length === 0) return;

    const novosItens = itens.map((it) => ({
      tipo: it.tipo || "DOOH",
      programa: it.nome,
      horario: "Rotativo",
      formato: it.formato,
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
      insercoes_dia: Math.max(1, Math.round((it.insercoes_mes || 30) / 30)),
      dias_semana: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
      dias_mes: Array.from({ length: 30 }, (_, i) => i + 1),
      desconto: it.desconto_pct || 0,
      valor_unit: it.valor_negociado / Math.max(1, it.insercoes_mes || 1),
      valor_tabela: it.valor_tabela || it.valor_negociado,
      valor_negociado: it.valor_negociado,
      total_insercoes: it.insercoes_mes || 30,
      produto_id: it.produto_id || null,
      parceiro_nome: it.parceiro_nome || null,
      latitude: it.latitude || null,
      longitude: it.longitude || null,
      link_maps: it.link_maps || null,
      sentido_via: it.sentido_via || null,
      ponto_referencia: it.ponto_referencia || null,
      endereco_ponto: it.localizacao || null,
      canal_macro: "OFF" as const,
    }));

    state.setItems(novosItens);

    if (defesa) {
      const novaObs = state.observacao ? `${defesa}\n\n---\n${state.observacao}` : defesa;
      state.setObservacao(novaObs);
    }

    if (!state.campanha || state.campanha.trim() === "") {
      state.setCampanha(`Estratégia 360° — ${itens[0]?.regiao || "DF"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto rounded-[1.5rem]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {initial?.id && !initial.isCopy ? "Editar Proposta" : "Nova Proposta"}
          </DialogTitle>
          <DialogDescription>Numeração automática ao salvar.</DialogDescription>
        </DialogHeader>

        {!state.isLoading ? (
          <div className="space-y-4 py-2">
            {state.draftRestored && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <History className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Rascunho recuperado:</strong> Os dados desta proposta foram restaurados automaticamente do seu navegador.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 gap-1"
                  onClick={state.handleDiscardDraft}
                >
                  <RotateCcw className="size-3" />
                  Descartar Rascunho
                </Button>
              </div>
            )}

            {!initial?.id && onOpenImport && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <FileUp className="size-4 text-primary shrink-0" />
                  <span>
                    Possui uma proposta pronta em <strong>PDF</strong> ou{" "}
                    <strong>PowerPoint (.pptx)</strong>? Importe para preenchimento automático.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8 text-xs border-primary/40 text-primary hover:bg-primary hover:text-white"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenImport();
                  }}
                >
                  Importar Arquivo
                </Button>
              </div>
            )}

            {/* Banner de Disparo: Planejamento 360° & Radar de Expansão */}
            <div className="p-3 bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border border-sky-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
                <div className="size-8 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
                  <Compass className="size-4 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2 text-foreground">
                    <span>Planejamento Estratégico 360° & Radar de Expansão</span>
                    <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40 text-[9px] uppercase font-semibold">
                      Ao Vivo na Reunião
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Diagnóstico de público (DF), histórico de sucesso do cliente e radar de novas oportunidades com vias troncais.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-sm font-semibold"
                onClick={() => setModalPlanejamento360Open(true)}
              >
                <Compass className="size-3.5" />
                Abrir Planejador 360°
              </Button>
            </div>

            <PropostaIaAssistant
              clienteNome={
                clienteSelecionado?.nome_fantasia ||
                clienteSelecionado?.razao_social ||
                state.clienteAvulso
              }
              onApplySuggestion={handleApplyIaSuggestion}
            />

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
              {canAssignCollaborator && (
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Executivo / Colaborador Responsável
                    </Label>
                    {isDiretoria && !isAdmin && (
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                        Diretoria: gerando em nome de outro colaborador
                      </span>
                    )}
                  </div>
                  <Select
                    value={state.executivoId || "none"}
                    onValueChange={(v) => state.setExecutivoId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Usar meu próprio perfil —</SelectItem>
                      {executivos.map((e) => {
                        const rolesLabel = e.roles?.length ? ` (${e.roles.join(", ")})` : "";
                        return (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome || e.email}
                            {rolesLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    O colaborador selecionado constará na proposta comercial, nos documentos
                    impressos e na atribuição de resultados.
                  </p>
                </div>
              )}
              {canAssignCollaborator && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Executivo Parceiro (Briefing)</Label>
                  <Select
                    value={state.executivoParceiroId || "none"}
                    onValueChange={(v) => {
                      if (v === "__novo_parceiro__") {
                        setCadastrarParceiroOpen(true);
                        return;
                      }
                      state.setExecutivoParceiroId(v === "none" ? "" : v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o parceiro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="__novo_parceiro__"
                        className="text-primary font-semibold border-b border-border/80 mb-1 pb-1.5 focus:bg-primary/10 cursor-pointer"
                      >
                        ➕ Cadastrar Novo Parceiro...
                      </SelectItem>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Vincula a proposta a um parceiro comercial que originou a solicitação.
                  </p>
                  <ParceiroFormDialog
                    open={cadastrarParceiroOpen}
                    onOpenChange={setCadastrarParceiroOpen}
                    onSuccess={(p) => {
                      if (p?.id) state.setExecutivoParceiroId(p.id);
                    }}
                  />
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2" data-field="campanha">
                <Label>
                  Campanha{" "}
                  {hasError("campanha") && (
                    <span className="text-destructive text-xs">*obrigatório</span>
                  )}
                </Label>
                <Input
                  value={state.campanha}
                  onChange={(e) => state.setCampanha(e.target.value)}
                  className={errorInputClass(hasError("campanha"))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Validade</Label>
                <QuickDateInput
                  value={state.validade}
                  onChange={(v) => state.setValidade(v)}
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, ao enviar será preenchido com 10 dias úteis.
                </p>
              </div>
            </div>

            <div data-field="items" className={errorFieldClass(hasError("items"))}>
              <PriceCalculator
                title="Itens da Proposta"
                initialItems={state.items}
                onChange={(its, tt) => {
                  state.setItems(its);
                  state.setTotals(tt);
                }}
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
              <PropostaAnexosSection
                propostaId={initial?.id && !initial.isCopy ? initial.id : null}
              />
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin" />
            <p>Carregando dados...</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            disabled={isSaving}
            onClick={() => save("rascunho", obsProdutos)}
          >
            Salvar Rascunho
          </Button>
          <Button disabled={isSaving} onClick={() => save("enviada", obsProdutos)}>
            Salvar e Enviar
          </Button>
        </DialogFooter>
      </DialogContent>

      <Planejamento360Modal
        open={modalPlanejamento360Open}
        onOpenChange={setModalPlanejamento360Open}
        clienteNome={
          clienteSelecionado?.nome_fantasia ||
          clienteSelecionado?.razao_social ||
          state.clienteAvulso
        }
        clienteId={state.clienteId}
        onAplicarAoPlano={handleAplicarPlano360}
      />
    </Dialog>
  );
}
