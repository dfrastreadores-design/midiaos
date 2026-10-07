import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, MapPin, Building2, Tag, Check, ArrowRight } from "lucide-react";
import { formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface QuickProductSearchAdderProps {
  produtos: any[];
  onAddProduct: (produto: any) => void;
  className?: string;
  placeholder?: string;
}

export function QuickProductSearchAdder({
  produtos,
  onAddProduct,
  className,
  placeholder = "Adicionar Ativo rápido: digite código, nome, bairro ou tipo (Enter para adicionar)...",
}: QuickProductSearchAdderProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtragem ágil por múltiplos termos
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const terms = q.split(/\s+/);

    return produtos
      .filter((p) => {
        if (p.ativo === false) return false;
        const texto = [
          p.codigo || "",
          p.codigo_face || "",
          p.nome || "",
          p.programa || "",
          p.tipo || "",
          p.formato || "",
          p.bairro || "",
          p.cidade || "",
          p.endereco_ponto || "",
          p.parceiro_nome || "",
        ]
          .join(" ")
          .toLowerCase();

        return terms.every((term) => texto.includes(term));
      })
      .slice(0, 8); // Máximo 8 sugestões rápidas para fluidez
  }, [produtos, query]);

  // Reseta índice selecionado quando a lista muda
  useEffect(() => {
    setSelectedIndex(0);
    setIsOpen(filtered.length > 0 && query.trim().length > 0);
  }, [filtered, query]);

  // Trata navegação por teclado (Enter, Seta Cima, Seta Baixo, Esc)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) {
        handleAdd(item);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleAdd = (produto: any) => {
    onAddProduct(produto);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Fecha popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (filtered.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-24 h-10 text-xs bg-background/90 border-primary/30 focus-visible:ring-primary shadow-xs rounded-lg"
        />
        {query && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-12 h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
          >
            Limpar
          </Button>
        )}
        <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground bg-muted border border-border rounded shadow-2xs">
            ↵ Enter
          </kbd>
        </div>
      </div>

      {/* Dropdown de Autocomplete com Navegação por Teclado */}
      {isOpen && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-2xl backdrop-blur-md max-h-[340px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex justify-between items-center border-b border-border/40 mb-1">
            <span>Resultados Encontrados ({filtered.length})</span>
            <span>Use ↑ ↓ para navegar • Enter para adicionar</span>
          </div>

          <div className="space-y-1">
            {filtered.map((p, idx) => {
              const isSelected = idx === selectedIndex;
              const precoTabela =
                p.valor_tabela ||
                p.preco_base ||
                p.valor_unitario ||
                p.detalhes_venda?.valor_tabela ||
                0;

              return (
                <div
                  key={p.id || idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleAdd(p)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs border border-transparent",
                    isSelected
                      ? "bg-primary/10 border-primary/30 text-primary-950 dark:text-primary-100 shadow-xs"
                      : "hover:bg-muted/50 text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] shrink-0 font-bold bg-background/80"
                    >
                      {p.codigo || p.codigo_face || p.tipo || "OOH"}
                    </Badge>

                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span className="truncate">{p.nome || p.programa}</span>
                        {p.formato && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            • {p.formato}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate mt-0.5">
                        {(p.bairro || p.cidade) && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="size-2.5 shrink-0 text-muted-foreground/70" />
                            {[p.bairro, p.cidade].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {p.parceiro_nome && (
                          <span className="flex items-center gap-0.5 truncate text-sky-600 dark:text-sky-400">
                            <Building2 className="size-2.5 shrink-0" />
                            {p.parceiro_nome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    {precoTabela > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          Tabela
                        </span>
                        <span className="font-bold text-xs font-mono">
                          {formatBRL(precoTabela)}
                        </span>
                      </div>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="h-7 text-xs gap-1 px-2.5"
                    >
                      <Plus className="size-3" />
                      <span>Adicionar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
