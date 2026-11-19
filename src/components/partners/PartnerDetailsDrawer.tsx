import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  Phone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Landmark,
  Percent,
  Receipt,
  FileText,
  Calendar,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import {
  Partner,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  PARTNER_STATUS_CONFIG,
  PIX_KEY_TYPE_CONFIG,
} from "@/types/partners.types";
import { toast } from "sonner";

interface PartnerDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner | null;
  onEdit?: (partner: Partner) => void;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function PartnerDetailsDrawer({
  open,
  onOpenChange,
  partner,
  onEdit,
}: PartnerDetailsDrawerProps) {
  const [copiedPix, setCopiedPix] = useState(false);

  if (!partner) return null;

  const isPF = partner.person_type === "PF";
  const nomePrincipal = isPF
    ? partner.full_name || "Pessoa Física"
    : partner.corporate_name || "Pessoa Jurídica";

  const documentoFormatado = isPF
    ? formatCPF(partner.cpf)
    : formatCNPJ(partner.cnpj);

  const statusCfg = PARTNER_STATUS_CONFIG[partner.status] || PARTNER_STATUS_CONFIG.active;
  const pixCfg = PIX_KEY_TYPE_CONFIG[partner.pix_key_type] || PIX_KEY_TYPE_CONFIG.cpf;

  const copiarPix = () => {
    if (partner.pix_key) {
      navigator.clipboard.writeText(partner.pix_key);
      setCopiedPix(true);
      toast.success("Chave PIX copiada para a área de transferência!");
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const whatsappLink = partner.phone
    ? `https://wa.me/55${partner.phone.replace(/\D/g, "")}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={isPF ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"}>
                {isPF ? <User className="size-3 mr-1" /> : <Building2 className="size-3 mr-1" />}
                {isPF ? "Pessoa Física (PF)" : "Pessoa Jurídica (PJ)"}
              </Badge>
              <Badge variant="outline" className={statusCfg.badge}>
                {statusCfg.label}
              </Badge>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(partner);
                }}
              >
                Editar Ficha
              </Button>
            )}
          </div>
          <DialogTitle className="text-xl mt-2 text-foreground font-bold">
            {nomePrincipal}
          </DialogTitle>
          {!isPF && partner.trade_name && (
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Nome Fantasia: {partner.trade_name}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5 py-3 text-xs">
          {/* Métricas e Resumo Comercial */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] text-muted-foreground block font-medium">Comissão Padrão</span>
              <span className="font-mono font-bold text-sm text-foreground">
                {partner.default_commission_rate}%
              </span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] text-muted-foreground block font-medium">Clientes Indicados</span>
              <span className="font-mono font-bold text-sm text-foreground">
                {partner.clientes_count ?? 0}
              </span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] text-muted-foreground block font-medium">Comissões Pendentes</span>
              <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                {fmtBRL(partner.total_comissao_pendente ?? 0)}
              </span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] text-muted-foreground block font-medium">Comissões Pagas</span>
              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {fmtBRL(partner.total_comissao_paga ?? 0)}
              </span>
            </div>
          </div>

          {/* Dados Fiscais e Documentais */}
          <div className="bg-card border rounded-lg p-3.5 space-y-2.5">
            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5 border-b pb-1.5">
              <FileText className="size-3.5 text-primary" />
              Documentação e Identificação Oficial
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground text-[11px] block">
                  {isPF ? "CPF (Cadastro de Pessoa Física):" : "CNPJ:"}
                </span>
                <span className="font-mono font-semibold text-foreground text-xs">
                  {documentoFormatado || "—"}
                </span>
              </div>

              {isPF ? (
                <>
                  {partner.rg && (
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Registro Geral (RG):</span>
                      <span className="font-medium text-foreground text-xs">{partner.rg}</span>
                    </div>
                  )}
                  {partner.birth_date && (
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Data de Nascimento:</span>
                      <span className="font-medium text-foreground text-xs">{partner.birth_date}</span>
                    </div>
                  )}
                  {partner.pis_pasep && (
                    <div>
                      <span className="text-muted-foreground text-[11px] block">PIS / PASEP (RPA):</span>
                      <span className="font-mono font-medium text-foreground text-xs">{partner.pis_pasep}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {partner.state_registration && (
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Inscrição Estadual:</span>
                      <span className="font-mono text-foreground text-xs">{partner.state_registration}</span>
                    </div>
                  )}
                  {partner.municipal_registration && (
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Inscrição Municipal:</span>
                      <span className="font-mono text-foreground text-xs">{partner.municipal_registration}</span>
                    </div>
                  )}
                  {partner.legal_representative_name && (
                    <div className="sm:col-span-2 pt-1 border-t">
                      <span className="text-muted-foreground text-[11px] block">Representante Legal:</span>
                      <span className="font-medium text-foreground text-xs">
                        {partner.legal_representative_name}
                        {partner.legal_representative_cpf && (
                          <span className="text-muted-foreground font-mono ml-1.5">
                            (CPF: {formatCPF(partner.legal_representative_cpf)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dados Bancários para Repasse PIX */}
          <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-lg p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-emerald-500/15 pb-1.5">
              <h4 className="font-semibold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Landmark className="size-3.5 text-emerald-600" />
                Dados de Repasse & Chave PIX
              </h4>
              <Badge variant="outline" className="text-[10px] bg-background">
                Tipo: {pixCfg.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between bg-card p-2.5 rounded border border-emerald-500/20">
              <div>
                <span className="text-[10px] text-muted-foreground block">Chave PIX Registrada:</span>
                <span className="font-mono font-bold text-xs text-foreground select-all">
                  {partner.pix_key || "Não informada"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                onClick={copiarPix}
              >
                {copiedPix ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                Copiar PIX
              </Button>
            </div>

            {(partner.bank_name || partner.bank_agency || partner.bank_account) && (
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Banco:</span>
                  <span className="font-medium">{partner.bank_name || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Agência:</span>
                  <span className="font-mono font-medium">{partner.bank_agency || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Conta ({partner.bank_account_type === "savings" ? "Poupança" : "Corrente"}):</span>
                  <span className="font-mono font-medium">{partner.bank_account || "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Contato & Localização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Contato */}
            <div className="bg-card border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5 border-b pb-1">
                <Phone className="size-3.5 text-primary" />
                Canais de Contato
              </h4>
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Telefone / Whats:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium">{formatPhone(partner.phone)}</span>
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 p-0.5"
                        title="Abrir WhatsApp"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">E-mail:</span>
                  <a
                    href={`mailto:${partner.email}`}
                    className="font-medium text-primary hover:underline truncate max-w-[180px]"
                  >
                    {partner.email}
                  </a>
                </div>

                <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                  <span className="text-muted-foreground">Exigência de NFS-e:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {partner.requires_invoice ? "Sim (Emite NFS-e)" : "Não (Recibo / RPA)"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-card border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5 border-b pb-1">
                <MapPin className="size-3.5 text-primary" />
                Endereço Cadastrado
              </h4>
              <div className="text-[11px] space-y-1 text-muted-foreground pt-0.5">
                {partner.address?.street ? (
                  <>
                    <p className="text-foreground font-medium">
                      {partner.address.street}, {partner.address.number || "S/N"}
                      {partner.address.complement && ` (${partner.address.complement})`}
                    </p>
                    <p>
                      {partner.address.neighborhood || "—"}, {partner.address.city || "—"}/{partner.address.state || "DF"}
                    </p>
                    {partner.address.cep && (
                      <p className="font-mono text-[10px]">CEP: {formatCEP(partner.address.cep)}</p>
                    )}
                  </>
                ) : (
                  <p className="italic text-muted-foreground">Nenhum endereço físico registrado.</p>
                )}
              </div>
            </div>
          </div>

          {/* Observações Internas */}
          {partner.notes && (
            <div className="bg-muted/30 border rounded-lg p-3">
              <span className="text-[11px] font-semibold text-foreground block mb-1">
                Anotações Internas & Condições Comerciais:
              </span>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                {partner.notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
