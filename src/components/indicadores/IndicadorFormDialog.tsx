import { PartnerFormDialog } from "@/components/partners/PartnerFormDialog";
import { type IndicadorInput } from "@/lib/indicadores.functions";
import { Partner, sanitizeDigits } from "@/types/partners.types";

interface IndicadorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicador?: IndicadorInput | null;
  onSaved: () => void;
}

export function IndicadorFormDialog({
  open,
  onOpenChange,
  indicador,
  onSaved,
}: IndicadorFormDialogProps) {
  const isPJ =
    indicador?.cpf_cnpj && sanitizeDigits(indicador.cpf_cnpj).length > 11;

  const partnerAdapted: Partner | null = indicador
    ? {
        id: indicador.id || "",
        person_type: isPJ ? "PJ" : "PF",
        status: indicador.ativo ? "active" : "inactive",
        full_name: isPJ ? null : indicador.nome,
        corporate_name: isPJ ? indicador.nome : null,
        cpf: isPJ ? null : indicador.cpf_cnpj,
        cnpj: isPJ ? indicador.cpf_cnpj : null,
        email: indicador.email || "",
        phone: indicador.telefone || "",
        address: {},
        default_commission_rate: Number(indicador.percentual_comissao_padrao || 10),
        payment_condition: "post_client_payment",
        requires_invoice: Boolean(isPJ),
        pix_key_type: (indicador.tipo_chave_pix as any) || (isPJ ? "cnpj" : "cpf"),
        pix_key: indicador.chave_pix || "",
        bank_name: indicador.banco_nome,
        notes: indicador.observacoes,
      }
    : null;

  return (
    <PartnerFormDialog
      open={open}
      onOpenChange={onOpenChange}
      partner={partnerAdapted}
      onSaved={() => onSaved()}
    />
  );
}
