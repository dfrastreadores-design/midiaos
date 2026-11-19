import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  MapPin,
  Building2,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import type { ProdutoExtraidoMidiaKit } from "@/lib/midia-kit-ai.functions";

export interface DadosEdicaoLote {
  // Flag por campo indicando se deve ser aplicado
  aplicar_midia: boolean;
  midia: string;

  aplicar_categoria_midia: boolean;
  categoria_midia: string;

  aplicar_tipo: boolean;
  tipo: string;

  aplicar_tipo_cobranca: boolean;
  tipo_cobranca: string;

  aplicar_cidade_uf: boolean;
  cidade: string;
  estado: string;

  aplicar_regiao_bairro: boolean;
  regiao_administrativa: string;
  bairro: string;

  aplicar_duracao_insercoes: boolean;
  duracao_segundos: number;
  insercoes_padrao: number;

  aplicar_status_validacao: boolean;
  status_validacao: "aprovado" | "pendente_revisao" | "incompleto";

  aplicar_status_operacional: boolean;
  status_operacional: "disponivel" | "reservado" | "bloqueado_comercial";

  aplicar_canal_macro: boolean;
  canal_macro: "OFF" | "ON" | "HIBRIDO";

  // Preço bruto: requer autorização explícita
  substituir_preco_bruto: boolean;
  valor_unit: number;

  // Modo "Aplicar Padrão"
  somente_campos_vazios: boolean;
  substituir_existentes: boolean;
}

interface EdicaoLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtosSelecionados: ProdutoExtraidoMidiaKit[];
  modo: "edicao_lote" | "aplicar_padrao";
  onConfirmar: (dados: DadosEdicaoLote) => void;
}

export function EdicaoLoteDialog({
  open,
  onOpenChange,
  produtosSelecionados,
  modo,
  onConfirmar,
}: EdicaoLoteDialogProps) {
  const isPadrao = modo === "aplicar_padrao";
  const total = produtosSelecionados.length;

  const [form, setForm] = useState<DadosEdicaoLote>({
    aplicar_midia: false,
    midia: "DOOH",
    aplicar_categoria_midia: false,
    categoria_midia: "ooh_dooh",
    aplicar_tipo: false,
    tipo: "",
    aplicar_tipo_cobranca: false,
    tipo_cobranca: "insercao",
    aplicar_cidade_uf: isPadrao,
    cidade: isPadrao ? "Brasília" : "",
    estado: isPadrao ? "DF" : "",
    aplicar_regiao_bairro: false,
    regiao_administrativa: "",
    bairro: "",
    aplicar_duracao_insercoes: false,
    duracao_segundos: 30,
    insercoes_padrao: 1,
    aplicar_status_validacao: false,
    status_validacao: "aprovado",
    aplicar_status_operacional: false,
    status_operacional: "disponivel",
    aplicar_canal_macro: false,
    canal_macro: "OFF",
    substituir_preco_bruto: false,
    valor_unit: 0,
    somente_campos_vazios: isPadrao,
    substituir_existentes: !isPadrao,
  });

  // Reseta campos quando abre ou muda modo
  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...prev,
        aplicar_cidade_uf: isPadrao,
        cidade: isPadrao ? "Brasília" : prev.cidade,
        estado: isPadrao ? "DF" : prev.estado,
        somente_campos_vazios: isPadrao,
        substituir_existentes: !isPadrao,
        substituir_preco_bruto: false,
      }));
    }
  }, [open, isPadrao]);

  // Contagem de campos marcados
  const camposMarcados = [
    form.aplicar_midia,
    form.aplicar_categoria_midia,
    form.aplicar_tipo,
    form.aplicar_tipo_cobranca,
    form.aplicar_cidade_uf,
    form.aplicar_regiao_bairro,
    form.aplicar_duracao_insercoes,
    form.aplicar_status_validacao,
    form.aplicar_status_operacional,
    form.aplicar_canal_macro,
    form.substituir_preco_bruto,
  ].filter(Boolean).length;

  // Cálculo de quantos registros serão afetados por substituição de campos já preenchidos
  const produtosComCidadePreenchida = produtosSelecionados.filter(
    (p) => Boolean(p.cidade && p.cidade.trim().length > 0 && p.cidade !== form.cidade),
  ).length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (camposMarcados === 0) return;
    onConfirmar(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isPadrao ? "bg-purple-500/10 text-purple-600" : "bg-primary/10 text-primary"}`}>
              {isPadrao ? <Sparkles className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                {isPadrao ? "Aplicar Padrão aos Selecionados" : "Edição em Lote de Produtos"}
                <Badge variant="outline" className="text-xs">
                  {total} selecionados
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isPadrao
                  ? "Preencha informações comuns (como Cidade/UF ou Categoria) sem sobrescrever valores já cadastrados, a menos que opte explicitamente."
                  : "Marque os campos que deseja alterar nos produtos selecionados. Os campos desmarcados não serão modificados."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3 overflow-y-auto pr-1 flex-1 text-xs">
          {/* MODO APLICAR PADRÃO: REGRAS DE PREENCHIMENTO */}
          {isPadrao ? (
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-2">
              <span className="font-semibold text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1.5">
                <Info className="size-3.5 text-purple-600" />
                Política de Preservação de Dados
              </span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="somente-vazios"
                    checked={form.somente_campos_vazios}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        somente_campos_vazios: checked,
                        substituir_existentes: !checked,
                      }))
                    }
                  />
                  <Label htmlFor="somente-vazios" className="text-xs cursor-pointer">
                    Preencher somente onde o campo estiver <strong>vazio</strong> (Recomendado)
                  </Label>
                </div>

                {form.aplicar_cidade_uf && produtosComCidadePreenchida > 0 && !form.somente_campos_vazios && (
                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-300">
                    Aviso: {produtosComCidadePreenchida} produtos já têm outra cidade e serão substituídos
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-muted/50 border rounded-lg flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Campos marcados para atualização: <strong>{camposMarcados}</strong> de 11
              </span>
              <span className="font-semibold text-foreground">
                Afetará: {total} produto(s)
              </span>
            </div>
          )}

          {/* GRUPO 1: CIDADE, UF, REGIÃO ADMINISTRATIVA E BAIRRO */}
          <div className="p-3 rounded-xl border space-y-3 bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="chk-cidade-uf"
                  checked={form.aplicar_cidade_uf}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, aplicar_cidade_uf: Boolean(c) }))}
                />
                <Label htmlFor="chk-cidade-uf" className="font-bold flex items-center gap-1 cursor-pointer">
                  <MapPin className="size-3.5 text-primary" />
                  Cidade & UF
                </Label>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Aplica a praça comum sem forçar coordenadas exatas
              </span>
            </div>

            {form.aplicar_cidade_uf && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 pl-6">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Cidade</Label>
                  <Input
                    placeholder="Ex: Brasília"
                    value={form.cidade}
                    onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">UF</Label>
                  <Input
                    placeholder="DF"
                    maxLength={2}
                    value={form.estado}
                    onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value.toUpperCase() }))}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            )}

            {/* Região Administrativa e Bairro */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Checkbox
                id="chk-regiao-bairro"
                checked={form.aplicar_regiao_bairro}
                onCheckedChange={(c) => setForm((p) => ({ ...p, aplicar_regiao_bairro: Boolean(c) }))}
              />
              <Label htmlFor="chk-regiao-bairro" className="font-semibold flex items-center gap-1 cursor-pointer">
                <Building2 className="size-3.5 text-muted-foreground" />
                Região Administrativa / Bairro
              </Label>
            </div>

            {form.aplicar_regiao_bairro && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-6">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Região Administrativa</Label>
                  <Input
                    placeholder="Ex: Plano Piloto, Taguatinga, Barra..."
                    value={form.regiao_administrativa}
                    onChange={(e) => setForm((p) => ({ ...p, regiao_administrativa: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Bairro</Label>
                  <Input
                    placeholder="Ex: Asa Sul, Setor Comercial..."
                    value={form.bairro}
                    onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* GRUPO 2: MÍDIA, CATEGORIA, FORMATO E COBRANÇA */}
          <div className="p-3 rounded-xl border space-y-3 bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mídia */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-midia"
                    checked={form.aplicar_midia}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, aplicar_midia: Boolean(c) }))}
                  />
                  <Label htmlFor="chk-midia" className="font-bold cursor-pointer">
                    Tipo de Mídia
                  </Label>
                </div>
                {form.aplicar_midia && (
                  <Select value={form.midia} onValueChange={(val) => setForm((p) => ({ ...p, midia: val }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOOH">DOOH (Digital Out Of Home)</SelectItem>
                      <SelectItem value="OOH">OOH (Mídia Estática)</SelectItem>
                      <SelectItem value="TV">TV / Emissora</SelectItem>
                      <SelectItem value="Radio">Rádio / Áudio</SelectItem>
                      <SelectItem value="Digital">Digital / Portais / Web</SelectItem>
                      <SelectItem value="Impresso">Impresso / Jornal / Revista</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Unidade de Cobrança */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-cobranca"
                    checked={form.aplicar_tipo_cobranca}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, aplicar_tipo_cobranca: Boolean(c) }))}
                  />
                  <Label htmlFor="chk-cobranca" className="font-bold cursor-pointer">
                    Unidade de Cobrança
                  </Label>
                </div>
                {form.aplicar_tipo_cobranca && (
                  <Select
                    value={form.tipo_cobranca}
                    onValueChange={(val) => setForm((p) => ({ ...p, tipo_cobranca: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insercao">Por Inserção (Unitária)</SelectItem>
                      <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal (7 dias)</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal / Bi-semana</SelectItem>
                      <SelectItem value="cpm">CPM (Custo por Mil Impactos)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Formato / Tipo descritivo */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="chk-tipo"
                  checked={form.aplicar_tipo}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, aplicar_tipo: Boolean(c) }))}
                />
                <Label htmlFor="chk-tipo" className="font-semibold cursor-pointer">
                  Formato / Especificação Comercial
                </Label>
              </div>
              {form.aplicar_tipo && (
                <Input
                  placeholder="Ex: Painel LED 6x3m, Comercial 30s, Banner Super Topo..."
                  value={form.tipo}
                  onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                  className="h-8 text-xs pl-6"
                />
              )}
            </div>
          </div>

          {/* GRUPO 3: STATUS DE REVISÃO E DISPONIBILIDADE */}
          <div className="p-3 rounded-xl border space-y-3 bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-status-validacao"
                    checked={form.aplicar_status_validacao}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, aplicar_status_validacao: Boolean(c) }))}
                  />
                  <Label htmlFor="chk-status-validacao" className="font-semibold cursor-pointer">
                    Status de Revisão
                  </Label>
                </div>
                {form.aplicar_status_validacao && (
                  <Select
                    value={form.status_validacao}
                    onValueChange={(val: any) => setForm((p) => ({ ...p, status_validacao: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aprovado">Aprovado para Cadastro</SelectItem>
                      <SelectItem value="pendente_revisao">Pendente de Revisão</SelectItem>
                      <SelectItem value="incompleto">Incompleto</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-status-op"
                    checked={form.aplicar_status_operacional}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, aplicar_status_operacional: Boolean(c) }))}
                  />
                  <Label htmlFor="chk-status-op" className="font-semibold cursor-pointer">
                    Disponibilidade Operacional
                  </Label>
                </div>
                {form.aplicar_status_operacional && (
                  <Select
                    value={form.status_operacional}
                    onValueChange={(val: any) => setForm((p) => ({ ...p, status_operacional: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponivel">Disponível no Catálogo</SelectItem>
                      <SelectItem value="reservado">Reservado / Em Negociação</SelectItem>
                      <SelectItem value="bloqueado_comercial">Bloqueado Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* GRUPO 4: PREÇO BRUTO DE TABELA — PROTEÇÃO RESTRITA */}
          <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="chk-preco"
                  checked={form.substituir_preco_bruto}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, substituir_preco_bruto: Boolean(c) }))}
                />
                <Label htmlFor="chk-preco" className="font-bold text-amber-900 dark:text-amber-200 cursor-pointer flex items-center gap-1">
                  <DollarSign className="size-3.5 text-amber-600" />
                  Substituir Preço Bruto de Tabela (R$)
                </Label>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-400 bg-amber-100/50">
                Ação Explícita
              </Badge>
            </div>

            <p className="text-[11px] text-amber-800 dark:text-amber-300 pl-6">
              Por regra de segurança, preços individuais extraídos do mídia kit nunca são alterados automaticamente.
              Marque esta opção apenas se deseja impor o mesmo valor bruto a todos os itens selecionados.
            </p>

            {form.substituir_preco_bruto && (
              <div className="pl-6 pt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.valor_unit}
                    onChange={(e) => setForm((p) => ({ ...p, valor_unit: Number(e.target.value) }))}
                    className="h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400 max-w-[200px]"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Será aplicado aos {total} produtos selecionados
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={camposMarcados === 0}
              className={`text-xs gap-1.5 ${
                isPadrao ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-primary text-primary-foreground"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              Aplicar a {total} Produto(s)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
