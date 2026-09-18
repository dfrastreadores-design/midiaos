import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { listPropostas, deleteProposta } from "@/lib/propostas.functions";
import { Proposta } from "@/types/proposta";
import { toast } from "sonner";

export function usePropostas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ["propostas"],
    queryFn: () => listPropostas() as unknown as Promise<Proposta[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProposta({ data: { id } }),
    onSuccess: () => {
      toast.success("Proposta removida");
      qc.invalidateQueries({ queryKey: ["propostas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredPropostas = useMemo(() => {
    const s = search.toLowerCase();
    return propostas.filter((p) => {
      return !s || 
        p.numero.toLowerCase().includes(s) || 
        p.campanha.toLowerCase().includes(s) ||
        p.cliente?.razao_social?.toLowerCase().includes(s) ||
        p.cliente_avulso?.toLowerCase().includes(s);
    });
  }, [propostas, search]);

  return {
    propostas: filteredPropostas,
    isLoading,
    search,
    setSearch,
    deleteProposta: (id: string) => {
      if (confirm("Excluir proposta?")) {
        deleteMutation.mutate(id);
      }
    },
  };
}
