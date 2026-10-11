import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProdutos, type Produto } from "@/lib/produtos.functions";
import {
  type PontoMidiaPlanejamento,
  PILARES_DEFINICAO,
} from "@/lib/planejamento-estrategico.functions";
import { formatBRL } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Plus,
  Trash2,
  Package,
  Layers,
  MapPin,
  Eye,
  Sliders,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaSelectorProps {
  pontosSelecionados: PontoMidiaPlanejamento[];
  onChange: (pontos: PontoMidiaPlanejamento[]) => void;
  regioesCampanha?: string[];
  investimentoPrevisto?: number;
  className?: string;
}

export function MediaSelector({
  pontosSelecionados,
  onChange,
  regioesCampanha = [],
  investimentoPrevisto = 0,
  className,
}: MediaSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedMidia, setSelectedMidia] = useState<string>("todos");
  const [filterPilar, setFilterPilar] = useState<string>("todos");

  // Carrega produtos reais e existentes do inventário de mídia sem duplicação
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos-planejamento"],
    queryFn: () => listProdutos(),
    staleTime: 5 * 60_000,
  });

  // Filtra inventário de produtos
  const produtosFiltrados = useMemo(() => {
    return (produtos as Produto[]).filter((p) => {
      if (!p.ativo) return false;
      const matchesSearch =
        !search ||
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.endereco_ponto && p.endereco_ponto.toLowerCase().includes(search.toLowerCase())) ||
        (p.tipo && p.tipo.toLowerCase().includes(search.toLowerCase())) ||
        (p.formato && p.formato.toLowerCase().includes(search.toLowerCase())) ||
        (p.parceiro_nome && p.parceiro_nome.toLowerCase().includes(search.toLowerCase()));

      const matchesMidia =
        selectedMidia === "todos" ||
        p.midia.toLowerCase() === selectedMidia.toLowerCase();

      return matchesSearch && matchesMidia;
    });
  }, [produtos, search, selectedMidia]);

  // Lista única de tipos de mídia existentes no inventário
  const midiasDisponiveis = useMemo(() => {
    const set = new Set((produtos as Produto[]).map((p) => p.midia).filter(Boolean));
    return ["todos", ...Array.from(set)];
  }, [produtos]);

  const mapSelecionados = useMemo(() => {
    const map = new Map<string, PontoMidiaPlanejamento>();
    for (const ponto of pontosSelecionados) {
      map.set(ponto.produto_id, ponto);
    }
    return map;
  }, [pontosSelecionados]);

  // Adiciona produto ao planejamento estratégico
  const handleAddProduto = (prod: Produto) => {
    if (mapSelecionados.has(prod.id!)) {
      handleRemoveProduto(prod.id!);
      return;
    }

    const valorUnit = Number(prod.valor_unit) || 0;
    const regiaoPadrao =
      regioesCampanha.length > 0 ? regioesCampanha[0] : (prod as any).cidade || "Geral";

    const novoPonto: PontoMidiaPlanejamento = {
      produto_id: prod.id!,
      regiao: regiaoPadrao,
      pilar_estrategico: "visibilidade",
      quantidade_insercoes: 1,
      valor_negociado: valorUnit,
      impactos_estimados: Number((prod as any).impactos_mes_estimados) || 120000,
      observacoes: null,
      produto: {
        id: prod.id!,
        nome: prod.nome,
        midia: prod.midia,
        tipo: prod.tipo,
        formato: prod.formato,
        endereco_ponto: prod.endereco_ponto,
        latitude: prod.latitude,
        longitude: prod.longitude,
        link_maps: prod.link_maps,
        sentido_via: prod.sentido_via,
        ponto_referencia: prod.ponto_referencia,
        fotos: (prod as any).fotos,
        parceiro_nome: prod.parceiro_nome,
        valor_unit: valorUnit,
        impactos_mes_estimados: (prod as any).impactos_mes_estimados,
      },
    };

    onChange([...pontosSelecionados, novoPonto]);
  };

  const handleRemoveProduto = (produtoId: string) => {
    onChange(pontosSelecionados.filter((p) => p.produto_id !== produtoId));
  };

  const handleUpdatePonto = (
    produtoId: string,
    field: keyof PontoMidiaPlanejamento,
    value: any
  ) => {
    onChange(
      pontosSelecionados.map((p) => {
        if (p.produto_id !== produtoId) return p;
        return { ...p, [field]: value };
      })
    );
  };

  // Cálculos consolidados
  const totalAlocado = pontosSelecionados.reduce(
    (acc, p) => acc + (Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1),
    0
  );
  const totalImpactos = pontosSelecionados.reduce(
    (acc, p) => acc + (Number(p.impactos_estimados) || 0) * (Number(p.quantidade_insercoes) || 1),
    0
  );
  const saldoPrevisto = investimentoPrevisto - totalAlocado;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Resumo de Indicadores do Inventário Alocado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
          <div className="text-[11px] font-semibold text-primary/80 uppercase tracking-wide">
            Pontos Selecionados
          </div>
          <div className="text-xl font-extrabold text-primary mt-0.5">
            {pontosSelecionados.length}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
            Investimento Alocado
          </div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatBRL(totalAlocado)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
            Saldo do Orçamento
          </div>
          <div
            className={cn(
              "text-xl font-extrabold mt-0.5",
              saldoPrevisto >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {formatBRL(saldoPrevisto)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            Impactos Estimados
          </div>
          <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
            {totalImpactos.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Catálogo de Produtos do Inventário */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Package className="size-4 text-primary" />
              Inventário de Mídia Disponível
            </h4>
            <span className="text-xs text-muted-foreground font-medium">
              {produtosFiltrados.length} produtos
            </span>
          </div>

          {/* Filtros do Inventário */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, formato, endereço ou parceiro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9.5 rounded-xl text-xs"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
              {midiasDisponiveis.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMidia(m)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border",
                    selectedMidia === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/60 text-muted-foreground hover:bg-accent border-transparent"
                  )}
                >
                  {m === "todos" ? "Todas Mídias" : m}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Produtos para Seleção */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Carregando inventário de mídia...
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-2xl">
                Nenhum ponto de mídia encontrado com os filtros aplicados.
              </div>
            ) : (
              produtosFiltrados.map((prod) => {
                const isSelected = mapSelecionados.has(prod.id!);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleAddProduto(prod)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-card border-border/70 hover:border-primary/50 hover:bg-accent/30"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5 font-bold uppercase rounded-md bg-muted text-foreground/80"
                        >
                          {prod.midia}
                        </Badge>
                        {prod.tipo && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            • {prod.tipo}
                          </span>
                        )}
                        {prod.parceiro_nome && (
                          <span className="text-[10px] text-primary/80 font-semibold truncate">
                            ({prod.parceiro_nome})
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors leading-snug">
                        {prod.nome}
                      </div>

                      {prod.endereco_ponto && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{prod.endereco_ponto}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {formatBRL(Number(prod.valor_unit) || 0)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {(prod as any).impactos_mes_estimados
                            ? `${Number((prod as any).impactos_mes_estimados).toLocaleString("pt-BR")} imp.`
                            : "Tabela base"}
                        </div>
                      </div>

                      <div
                        className={cn(
                          "size-8 rounded-xl flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white"
                        )}
                      >
                        {isSelected ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pontos Selecionados & Atribuição de Pilares Estratégicos */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="size-4 text-emerald-600" />
              Mídias no Plano Estratégico ({pontosSelecionados.length})
            </h4>
            {pontosSelecionados.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                className="h-6 text-[11px] text-muted-foreground hover:text-destructive px-2"
              >
                Limpar todas
              </Button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[530px] overflow-y-auto pr-1">
            {pontosSelecionados.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border rounded-2xl space-y-2">
                <Package className="size-8 mx-auto text-muted-foreground/40" />
                <div className="text-xs font-bold text-foreground">Nenhum ponto selecionado</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  Clique nos produtos do inventário à esquerda para vinculá-los aos pilares e regiões desta campanha.
                </div>
              </div>
            ) : (
              pontosSelecionados.map((ponto, index) => {
                const prod = ponto.produto;
                return (
                  <Card
                    key={ponto.produto_id}
                    className="border border-border/80 rounded-2xl bg-card shadow-xs overflow-hidden"
                  >
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground leading-tight truncate">
                            {prod?.nome || `Ponto ${index + 1}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {prod?.midia} • {prod?.formato || "Padrão"}
                            {prod?.parceiro_nome ? ` • ${prod.parceiro_nome}` : ""}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduto(ponto.produto_id)}
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                          title="Remover do plano"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      {/* Configuração de Pilar Estratégico & Região */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Pilar Estratégico
                          </label>
                          <select
                            value={ponto.pilar_estrategico}
                            onChange={(e) =>
                              handleUpdatePonto(ponto.produto_id, "pilar_estrategico", e.target.value)
                            }
                            className="mt-1 w-full h-8 px-2 rounded-lg bg-background border border-border text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                          >
                            {PILARES_DEFINICAO.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Território / Região
                          </label>
                          <input
                            type="text"
                            value={ponto.regiao || ""}
                            placeholder="Ex: Plano Piloto"
                            onChange={(e) =>
                              handleUpdatePonto(ponto.produto_id, "regiao", e.target.value)
                            }
                            className="mt-1 w-full h-8 px-2 rounded-lg bg-background border border-border text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Quantidade de Inserções e Valor Negociado */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Faces / Inserções
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={ponto.quantidade_insercoes}
                            onChange={(e) =>
                              handleUpdatePonto(
                                ponto.produto_id,
                                "quantidade_insercoes",
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="mt-1 h-8 text-xs font-bold rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Valor Unit. (R$)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ponto.valor_negociado}
                            onChange={(e) =>
                              handleUpdatePonto(
                                ponto.produto_id,
                                "valor_negociado",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="mt-1 h-8 text-xs font-bold rounded-lg text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground bg-muted/40 p-2 rounded-xl">
                        <span>Total deste Ponto:</span>
                        <span className="text-foreground font-bold">
                          {formatBRL(
                            (Number(ponto.valor_negociado) || 0) * (Number(ponto.quantidade_insercoes) || 1)
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
