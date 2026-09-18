import { PropostaStatus } from "@/types/proposta";

export const PROPOSTA_STATUS_CONFIG: Record<PropostaStatus, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  enviada: { label: "Enviada", className: "bg-primary/10 text-primary" },
  aprovada: { label: "Aprovada", className: "bg-success/15 text-success" },
  recusada: { label: "Recusada", className: "bg-destructive/15 text-destructive" },
  convertida: { label: "Convertida", className: "bg-gold/20 text-gold-foreground" },
  finalizada: { label: "Finalizada", className: "bg-green-600 text-white" },
};

export const formatCurrency = (value: number) => 
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const addBusinessDays = (from: Date, n: number) => {
  const d = new Date(from);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
};
