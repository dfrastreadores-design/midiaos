import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  emptyLabel?: string;
  /** Chamado ao criar um novo item. Se omitido, apenas seleciona o valor digitado. */
  onCreate?: (v: string) => void | Promise<void>;
  creating?: boolean;
  disabled?: boolean;
};

/**
 * Combobox com busca + opção de criar novo item quando não existir na lista.
 */
export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  emptyLabel = "Nenhum resultado",
  onCreate,
  creating = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const norm = (s: string) => s.trim().toLowerCase();
  const filtered = options.filter((o) => norm(o).includes(norm(search)));
  const exists = options.some((o) => norm(o) === norm(search));
  const showCreate = search.trim().length > 0 && !exists;

  const handleCreate = async () => {
    const v = search.trim();
    if (!v) return;
    if (onCreate) await onCreate(v);
    onChange(v);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ou digitar novo..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !showCreate && <CommandEmpty>{emptyLabel}</CommandEmpty>}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem
                    key={o}
                    value={o}
                    onSelect={() => {
                      onChange(o);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 size-4", value === o ? "opacity-100" : "opacity-0")} />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup heading="Criar novo">
                <CommandItem onSelect={handleCreate} disabled={creating}>
                  <Plus className="mr-2 size-4" />
                  {creating ? "Adicionando..." : `Adicionar "${search.trim()}"`}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
