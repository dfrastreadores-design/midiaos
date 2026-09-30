import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProposalObservationsProps = {
  observacao: string;
  setObservacao: (val: string) => void;
  obsProdutos: string;
};

export function ProposalObservations({
  observacao,
  setObservacao,
  obsProdutos,
}: ProposalObservationsProps) {
  return (
    <div className="space-y-1.5">
      <Label>Observações da negociação</Label>
      <Textarea
        rows={4}
        placeholder="Anote aqui condições negociadas, contrapartidas, descontos especiais, prazos acordados, etc."
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
      />
      {obsProdutos && (
        <div className="rounded-md border border-amber-300/60 bg-amber-50 text-amber-900 px-3 py-2 text-xs whitespace-pre-line dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Observações dos produtos selecionados (serão incluídas automaticamente):</strong>
          {"\n"}
          {obsProdutos}
        </div>
      )}
    </div>
  );
}
