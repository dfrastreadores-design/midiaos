import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClienteFormDialog } from "@/components/ClienteFormDialog";
import { AgenciaFormDialog } from "@/components/AgenciaFormDialog";
import { ProdutoFormDialog, type Produto } from "@/components/ProdutoFormDialog";
import { useQuery } from "@tanstack/react-query";
import { listAgencias } from "@/lib/agencias.functions";
import { listProdutos } from "@/lib/produtos.functions";

export function NovoClienteButton() {
  const [open, setOpen] = useState(false);
  const { data: agencias = [] } = useQuery({ queryKey: ["agencias"], queryFn: () => listAgencias() });
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0"
        onClick={() => setOpen(true)}
        title="Cadastrar novo cliente"
      >
        <Plus className="size-4 mr-1" /> Novo
      </Button>
      <ClienteFormDialog
        open={open}
        onOpenChange={setOpen}
        agencias={(agencias as any[]).map((a) => ({ id: a.id, nome: a.nome_fantasia || a.razao_social }))}
      />
    </>
  );
}

export function NovaAgenciaButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0"
        onClick={() => setOpen(true)}
        title="Cadastrar nova agência"
      >
        <Plus className="size-4 mr-1" /> Nova
      </Button>
      <AgenciaFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function NovoProdutoButton({ 
  variant = "outline", 
  size = "sm", 
  className = "h-9 shrink-0",
  initialData 
}: { 
  variant?: "outline" | "default" | "ghost", 
  size?: "sm" | "default" | "icon", 
  className?: string,
  initialData?: Partial<Produto>
}) {
  const [open, setOpen] = useState(false);
  const { data: produtos = [] } = useQuery({ queryKey: ["produtos"], queryFn: () => listProdutos() });
  
  const allProdutos = (produtos as any[]) ?? [];
  const sugestoes = {
    tipos: Array.from(new Set(allProdutos.map(p => p.tipo).filter(Boolean))).sort() as string[],
    programas: Array.from(new Set(allProdutos.map(p => p.programa).filter(Boolean))).sort() as string[],
    formatos: Array.from(new Set(allProdutos.map(p => p.formato).filter(Boolean))).sort() as string[],
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title="Cadastrar novo produto"
      >
        {size === "icon" ? (
          <Plus className="size-4" />
        ) : (
          <>
            <Plus className="size-4 mr-1" /> Novo
          </>
        )}
      </Button>
      <ProdutoFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={initialData}
        sugestoes={sugestoes}
      />
    </>
  );
}

