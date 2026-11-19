import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  Plus,
  FileText,
  FileCheck2,
  Tv,
  MapPin,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Camera,
  Layers,
  Settings,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listPis } from "@/lib/pi.functions";
import { listPropostas } from "@/lib/propostas.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { Badge } from "@/components/ui/badge";

export function GlobalSpotlightCommand() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchClientes = useServerFn(listClientes);
  const fetchAgencias = useServerFn(listAgencias);
  const fetchPis = useServerFn(listPis);
  const fetchPropostas = useServerFn(listPropostas);
  const fetchProdutos = useServerFn(listProdutos);

  // Escuta atalhos globais Ctrl+K ou Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Consultas sob demanda quando o Spotlight abre
  const qOpts = { staleTime: 60_000, enabled: open } as const;

  const { data: clientes = [] } = useQuery({
    queryKey: ["gs-clientes"],
    queryFn: () => fetchClientes(),
    ...qOpts,
  });

  const { data: agencias = [] } = useQuery({
    queryKey: ["gs-agencias"],
    queryFn: () => fetchAgencias(),
    ...qOpts,
  });

  const { data: pis = [] } = useQuery({
    queryKey: ["gs-pis"],
    queryFn: () => fetchPis(),
    ...qOpts,
  });

  const { data: propostas = [] } = useQuery({
    queryKey: ["gs-propostas"],
    queryFn: () => fetchPropostas(),
    ...qOpts,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["gs-produtos"],
    queryFn: () => fetchProdutos(),
    ...qOpts,
  });

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite para buscar ativos, clientes, PIs, propostas ou ações rápidas…" />
      <CommandList className="max-h-[380px] overflow-y-auto">
        <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
          Nenhum resultado encontrado no Mídia OS.
        </CommandEmpty>

        {/* 1. AÇÕES RÁPIDAS (1-CLIQUE) */}
        <CommandGroup heading="⚡ Ações Rápidas (Produtividade)">
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/propostas" });
              })
            }
            className="flex items-center gap-2.5 cursor-pointer py-2.5"
          >
            <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Plus className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-xs text-foreground block">
                Nova Proposta Comercial
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Abrir simulador e calculadora de mídia OOH
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              /propostas
            </Badge>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/pi" });
              })
            }
            className="flex items-center gap-2.5 cursor-pointer py-2.5"
          >
            <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck2 className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-xs text-foreground block">
                Emitir Pedidos de Inserção (PIs)
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Duplo fluxo: PI Cliente + desmembramento para Parceiros
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              /pi
            </Badge>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/produtos" });
              })
            }
            className="flex items-center gap-2.5 cursor-pointer py-2.5"
          >
            <div className="size-6 rounded-md bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Tv className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-xs text-foreground block">
                Cadastrar Novo Ponto / Face OOH
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Adicionar inventário com geolocalização e fotos
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              /produtos
            </Badge>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/historico-veiculacao" });
              })
            }
            className="flex items-center gap-2.5 cursor-pointer py-2.5"
          >
            <div className="size-6 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Camera className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-xs text-foreground block">
                Subir Comprovante de Checking / Auditoria
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Auditoria fotográfica e relatórios de exibição
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              /checking
            </Badge>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 2. PONTOS / ATIVOS OOH (BUSCA RÁPIDA POR CÓDIGO OU NOME) */}
        {produtos.length > 0 && (
          <CommandGroup heading="📍 Inventário & Faces OOH">
            {produtos.slice(0, 5).map((p: any) => (
              <CommandItem
                key={p.id}
                value={`${p.codigo || ""} ${p.nome || p.programa || ""} ${p.bairro || ""} ${p.tipo || ""}`}
                onSelect={() =>
                  handleSelect(() => {
                    navigate({ to: "/produtos" });
                  })
                }
                className="flex items-center justify-between py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0 font-bold">
                    {p.codigo || p.codigo_face || p.tipo || "OOH"}
                  </Badge>
                  <span className="text-xs font-semibold truncate text-foreground">
                    {p.nome || p.programa}
                  </span>
                  {p.bairro && (
                    <span className="text-[10px] text-muted-foreground truncate">• {p.bairro}</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                  {p.valor_unitario || p.valor_tabela
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(p.valor_unitario || p.valor_tabela)
                    : ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* 3. PROPOSTAS COMERCIAIS */}
        {propostas.length > 0 && (
          <CommandGroup heading="📑 Propostas Comerciais">
            {propostas.slice(0, 4).map((pr: any) => (
              <CommandItem
                key={pr.id}
                value={`${pr.numero || ""} ${pr.campanha || ""} ${pr.cliente?.nome_fantasia || pr.cliente_avulso || ""}`}
                onSelect={() =>
                  handleSelect(() => {
                    navigate({ to: "/propostas" });
                  })
                }
                className="flex items-center justify-between py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                    {pr.numero || "PROP"}
                  </Badge>
                  <span className="text-xs font-medium truncate text-foreground">
                    {pr.campanha || "Sem campanha"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    ({pr.cliente?.nome_fantasia || pr.cliente?.razao_social || pr.cliente_avulso || "Cliente"})
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-semibold text-muted-foreground shrink-0"
                >
                  {pr.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* 4. PEDIDOS DE INSERÇÃO (PIS) */}
        {pis.length > 0 && (
          <CommandGroup heading="📄 Pedidos de Inserção (PIs)">
            {pis.slice(0, 4).map((pi: any) => (
              <CommandItem
                key={pi.id}
                value={`${pi.numero || pi.numero_pi || ""} ${pi.campanha || ""} ${pi.cliente?.nome_fantasia || ""}`}
                onSelect={() =>
                  handleSelect(() => {
                    navigate({ to: "/pi" });
                  })
                }
                className="flex items-center justify-between py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] font-mono text-primary font-bold shrink-0">
                    {pi.numero_pi || pi.numero || "PI"}
                  </Badge>
                  <span className="text-xs font-medium truncate text-foreground">
                    {pi.campanha || "Veiculação"}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                  {pi.valor_negociado || pi.valor_liquido
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(pi.valor_negociado || pi.valor_liquido)
                    : ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* 5. CLIENTES & AGÊNCIAS */}
        {clientes.length > 0 && (
          <CommandGroup heading="🏢 Clientes & Anunciantes">
            {clientes.slice(0, 4).map((c: any) => (
              <CommandItem
                key={c.id}
                value={`${c.nome_fantasia || ""} ${c.razao_social || ""} ${c.cnpj || ""}`}
                onSelect={() =>
                  handleSelect(() => {
                    navigate({ to: "/clientes" });
                  })
                }
                className="flex items-center justify-between py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate text-foreground">
                    {c.nome_fantasia || c.razao_social}
                  </span>
                </div>
                {c.cnpj && (
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {c.cnpj}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* 6. MÓDULOS DE NAVEGAÇÃO */}
        <CommandGroup heading="🧭 Ir Para Módulo">
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/" });
              })
            }
            className="flex items-center gap-2 cursor-pointer text-xs"
          >
            <TrendingUp className="size-3.5 text-muted-foreground" />
            <span>Dashboard / Painel Geral</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/produtos" });
              })
            }
            className="flex items-center gap-2 cursor-pointer text-xs"
          >
            <MapPin className="size-3.5 text-muted-foreground" />
            <span>Mapa OOH & Inventário de Ativos</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/financeiro" });
              })
            }
            className="flex items-center gap-2 cursor-pointer text-xs"
          >
            <DollarSign className="size-3.5 text-muted-foreground" />
            <span>Fluxo Financeiro & Faturamento</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate({ to: "/relatorios" });
              })
            }
            className="flex items-center gap-2 cursor-pointer text-xs"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            <span>Relatórios & Desempenho Comercial</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
