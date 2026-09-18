import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Entidade = {
  id: string;
  nome_fantasia?: string | null;
  razao_social?: string | null;
};

type Props = {
  value: string;
  onChange: (id: string) => void;
  items: Entidade[];
  placeholder?: string;
  emptyLabel?: string;
};

export function EntidadeSearchSelect({ value, onChange, items, placeholder = "Selecione", emptyLabel = "— Nenhum —" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);
  const label = selected
    ? selected.nome_fantasia || selected.razao_social || "—"
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por nome ou razão social..." />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={emptyLabel}
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <X className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-30")} />
                {emptyLabel}
              </CommandItem>
              {items.map((i) => {
                const fantasia = i.nome_fantasia || "";
                const razao = i.razao_social || "";
                const display = fantasia || razao || "—";
                const searchKey = `${fantasia} ${razao} ${display}`.trim();
                return (
                  <CommandItem
                    key={i.id}
                    value={searchKey}
                    onSelect={() => {
                      onChange(i.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === i.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span>{display}</span>
                      {fantasia && razao && fantasia !== razao && (
                        <span className="text-xs text-muted-foreground">{razao}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
