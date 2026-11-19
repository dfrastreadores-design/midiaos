import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Landmark,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  QrCode,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  Partner,
  PartnerInput,
  PersonType,
  PartnerStatus,
  PixKeyType,
  BankAccountType,
  isValidCPF,
  isValidCNPJ,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  sanitizeDigits,
  PIX_KEY_TYPE_CONFIG,
} from "@/types/partners.types";
import { upsertPartner } from "@/lib/partners.functions";

interface PartnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  onSaved?: (savedPartner: Partner) => void;
}

export function PartnerFormDialog({
  open,
  onOpenChange,
  partner,
  onSaved,
}: PartnerFormDialogProps) {
  const qc = useQueryClient();
  const upsertPartnerFn = useServerFn(upsertPartner);

  // Form State
  const [personType, setPersonType] = useState<PersonType>("PF");
  const [status, setStatus] = useState<PartnerStatus>("active");

  // Dados PF
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [pisPasep, setPisPasep] = useState("");

  // Dados PJ
  const [corporateName, setCorporateName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [municipalRegistration, setMunicipalRegistration] = useState("");
  const [legalRepresentativeName, setLegalRepresentativeName] = useState("");
  const [legalRepresentativeCpf, setLegalRepresentativeCpf] = useState("");

  // Contato & Endereço
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Brasília");
  const [state, setState] = useState("DF");

  // Regras Comerciais
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(10);
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [allowsCircuitBundles, setAllowsCircuitBundles] = useState(false);

  // Repasse Bancário / PIX
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [pixKey, setPixKey] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountType, setBankAccountType] = useState<BankAccountType>("checking");

  // Notas
  const [notes, setNotes] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  // Popular formulário ao abrir para edição ou resetar
  useEffect(() => {
    if (partner) {
      setPersonType(partner.person_type);
      setStatus(partner.status);
      setFullName(partner.full_name || "");
      setCpf(formatCPF(partner.cpf));
      setRg(partner.rg || "");
      setBirthDate(partner.birth_date || "");
      setPisPasep(partner.pis_pasep || "");

      setCorporateName(partner.corporate_name || "");
      setTradeName(partner.trade_name || "");
      setCnpj(formatCNPJ(partner.cnpj));
      setStateRegistration(partner.state_registration || "");
      setMunicipalRegistration(partner.municipal_registration || "");
      setLegalRepresentativeName(partner.legal_representative_name || "");
      setLegalRepresentativeCpf(formatCPF(partner.legal_representative_cpf));

      setEmail(partner.email || "");
      setPhone(formatPhone(partner.phone));

      setCep(formatCEP(partner.address?.cep));
      setStreet(partner.address?.street || "");
      setNumber(partner.address?.number || "");
      setComplement(partner.address?.complement || "");
      setNeighborhood(partner.address?.neighborhood || "");
      setCity(partner.address?.city || "Brasília");
      setState(partner.address?.state || "DF");

      setDefaultCommissionRate(Number(partner.default_commission_rate) || 10);
      setRequiresInvoice(partner.person_type === "PJ" ? true : Boolean(partner.requires_invoice));
      setAllowsCircuitBundles(Boolean(partner.allows_circuit_bundles));

      setPixKeyType(partner.pix_key_type || (partner.person_type === "PJ" ? "cnpj" : "cpf"));
      setPixKey(partner.pix_key || "");
      setBankName(partner.bank_name || "");
      setBankAgency(partner.bank_agency || "");
      setBankAccount(partner.bank_account || "");
      setBankAccountType(partner.bank_account_type || "checking");

      setNotes(partner.notes || "");
    } else {
      // Defaults para novo cadastro
      setPersonType("PF");
      setStatus("active");
      setFullName("");
      setCpf("");
      setRg("");
      setBirthDate("");
      setPisPasep("");

      setCorporateName("");
      setTradeName("");
      setCnpj("");
      setStateRegistration("");
      setMunicipalRegistration("");
      setLegalRepresentativeName("");
      setLegalRepresentativeCpf("");

      setEmail("");
      setPhone("");

      setCep("");
      setStreet("");
      setNumber("");
      setComplement("");
      setNeighborhood("");
      setCity("Brasília");
      setState("DF");

      setDefaultCommissionRate(10);
      setRequiresInvoice(false);
      setAllowsCircuitBundles(false);

      setPixKeyType("cpf");
      setPixKey("");
      setBankName("");
      setBankAgency("");
      setBankAccount("");
      setBankAccountType("checking");

      setNotes("");
    }
  }, [partner, open]);

  // Se trocar para PJ, ajusta defaults obrigatórios (NFS-e e chave PIX)
  const handlePersonTypeChange = (newType: PersonType) => {
    setPersonType(newType);
    if (newType === "PJ") {
      setRequiresInvoice(true);
      if (pixKeyType === "cpf") setPixKeyType("cnpj");
    } else {
      setRequiresInvoice(false);
      if (pixKeyType === "cnpj") setPixKeyType("cpf");
    }
  };

  // Busca automática de CEP via ViaCEP
  const handleCepBlur = async () => {
    const rawCep = sanitizeDigits(cep);
    if (rawCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setStreet(data.logradouro);
          if (data.bairro) setNeighborhood(data.bairro);
          if (data.localidade) setCity(data.localidade);
          if (data.uf) setState(data.uf);
          toast.success("Endereço preenchido automaticamente pelo CEP.");
        }
      } catch (e) {
        console.warn("Falha ao buscar CEP:", e);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Helper para preenchimento rápido de PIX a partir do documento
  const handlePreencherPixComDocumento = () => {
    if (personType === "PF" && cpf) {
      setPixKeyType("cpf");
      setPixKey(cpf);
      toast.info("Chave PIX preenchida com o CPF.");
    } else if (personType === "PJ" && cnpj) {
      setPixKeyType("cnpj");
      setPixKey(cnpj);
      toast.info("Chave PIX preenchida com o CNPJ.");
    }
  };

  // Status de validação em tempo real
  const cpfValido = cpf ? isValidCPF(cpf) : null;
  const cnpjValido = cnpj ? isValidCNPJ(cnpj) : null;
  const repCpfValido = legalRepresentativeCpf ? isValidCPF(legalRepresentativeCpf) : null;

  // Mutation para envio
  const saveMutation = useMutation({
    mutationFn: async (payload: PartnerInput) => upsertPartnerFn({ data: payload }),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["indicadores"] });
      toast.success(
        partner?.id
          ? "Indicador atualizado com sucesso!"
          : "Indicador/Vendedor externo cadastrado com sucesso!"
      );
      if (onSaved) onSaved(saved as any);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar parceiro comercial");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações imediatas amigáveis antes de disparar
    if (personType === "PF") {
      if (!fullName.trim() || fullName.trim().length < 3) {
        toast.error("Informe o nome completo da pessoa física.");
        return;
      }
      if (!cpf || !isValidCPF(cpf)) {
        toast.error("CPF inválido. Verifique os dígitos informados.");
        return;
      }
    } else {
      if (!corporateName.trim() || corporateName.trim().length < 3) {
        toast.error("Informe a Razão Social da pessoa jurídica.");
        return;
      }
      if (!cnpj || !isValidCNPJ(cnpj)) {
        toast.error("CNPJ inválido. Verifique os números informados.");
        return;
      }
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Informe um endereço de e-mail válido.");
      return;
    }

    if (!phone || sanitizeDigits(phone).length < 10) {
      toast.error("Informe um telefone com DDD válido.");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("A chave PIX é obrigatória para repasses de comissão.");
      return;
    }

    const payload: any = {
      id: partner?.id,
      person_type: personType,
      status,
      email: email.trim().toLowerCase(),
      phone,
      address: {
        cep: sanitizeDigits(cep),
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      },
      default_commission_rate: Number(defaultCommissionRate),
      payment_condition: "post_client_payment",
      requires_invoice: personType === "PJ" ? true : requiresInvoice,
      allows_circuit_bundles: allowsCircuitBundles,
      pix_key_type: pixKeyType,
      pix_key: pixKey.trim(),
      bank_name: bankName || null,
      bank_agency: bankAgency || null,
      bank_account: bankAccount || null,
      bank_account_type: bankAccountType || null,
      notes: notes || null,
    };

    if (personType === "PF") {
      payload.full_name = fullName.trim();
      payload.cpf = cpf;
      payload.rg = rg || null;
      payload.birth_date = birthDate || null;
      payload.pis_pasep = pisPasep || null;
    } else {
      payload.corporate_name = corporateName.trim();
      payload.trade_name = tradeName.trim() || null;
      payload.cnpj = cnpj;
      payload.state_registration = stateRegistration || null;
      payload.municipal_registration = municipalRegistration || null;
      payload.legal_representative_name = legalRepresentativeName || null;
      payload.legal_representative_cpf = legalRepresentativeCpf || null;
    }

    saveMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {personType === "PF" ? <User className="size-4" /> : <Building2 className="size-4" />}
            </div>
            <div>
              <DialogTitle className="text-lg">
                {partner?.id ? "Editar Indicador / Vendedor Externo" : "Cadastrar Indicador / Parceiro Comercial"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure os dados fiscais, regras de comissão e chave PIX para repasse após recebimento do anunciante.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Seletor Tipo de Pessoa (PF vs PJ) */}
          <div className="bg-muted/40 p-1.5 rounded-lg border border-border/60 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePersonTypeChange("PF")}
              className={`flex-1 py-2 px-3 rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                personType === "PF"
                  ? "bg-background text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="size-3.5 text-blue-500" />
              Pessoa Física (PF)
              <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">
                (CPF / RPA)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handlePersonTypeChange("PJ")}
              className={`flex-1 py-2 px-3 rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                personType === "PJ"
                  ? "bg-background text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="size-3.5 text-purple-500" />
              Pessoa Jurídica (PJ)
              <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">
                (CNPJ / Nota Fiscal)
              </span>
            </button>
          </div>

          {/* STATUS DO INDICADOR */}
          <div className="flex items-center justify-between bg-card p-2.5 rounded-lg border border-border/60">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Status Operacional do Indicador</Label>
              <p className="text-[11px] text-muted-foreground">
                Indicadores bloqueados ou inativos não podem ser vinculados a novas vendas ou PIs.
              </p>
            </div>
            <Select value={status} onValueChange={(v: PartnerStatus) => setStatus(v)}>
              <SelectTrigger className="w-44 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo / Liberado</SelectItem>
                <SelectItem value="inactive">Inativo (Temporário)</SelectItem>
                <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CAMPOS PESSOA FÍSICA (PF) */}
          {personType === "PF" && (
            <div className="space-y-3 bg-card border rounded-lg p-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <User className="size-3.5 text-blue-500" />
                  Dados Pessoais (Pessoa Física)
                </span>
                <span className="text-[10px] text-muted-foreground">* Campos obrigatórios</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Nome Completo *</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">CPF *</Label>
                    {cpf && (
                      <span className="text-[10px]">
                        {cpfValido ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="size-3" /> Válido
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <AlertCircle className="size-3" /> Inválido
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <Input
                    className={`mt-1 text-xs font-mono ${
                      cpf && !cpfValido ? "border-rose-500 focus-visible:ring-rose-500" : ""
                    }`}
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Registro Geral (RG)</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="Ex: 1234567 SSP/DF"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Data de Nascimento</Label>
                  <Input
                    type="date"
                    className="mt-1 text-xs"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-semibold">PIS / PASEP (Opcional)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="size-3 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Necessário se a empresa emitir Recibo de Pagamento a Autônomo (RPA).
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    className="mt-1 text-xs font-mono"
                    placeholder="000.00000.00-0"
                    value={pisPasep}
                    onChange={(e) => setPisPasep(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* CAMPOS PESSOA JURÍDICA (PJ) */}
          {personType === "PJ" && (
            <div className="space-y-3 bg-card border rounded-lg p-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <Building2 className="size-3.5 text-purple-500" />
                  Dados Empresariais (Pessoa Jurídica)
                </span>
                <span className="text-[10px] text-muted-foreground">* Campos obrigatórios</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Razão Social *</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="Ex: Alpha Comunicação e Negócios LTDA"
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Nome Fantasia</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="Ex: Alpha Mídia"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">CNPJ *</Label>
                    {cnpj && (
                      <span className="text-[10px]">
                        {cnpjValido ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="size-3" /> Válido
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <AlertCircle className="size-3" /> Inválido
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <Input
                    className={`mt-1 text-xs font-mono ${
                      cnpj && !cnpjValido ? "border-rose-500 focus-visible:ring-rose-500" : ""
                    }`}
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Inscrição Estadual (IE)</Label>
                  <Input
                    className="mt-1 text-xs font-mono"
                    placeholder="Isento ou 07.000.000/001-00"
                    value={stateRegistration}
                    onChange={(e) => setStateRegistration(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Inscrição Municipal (IM)</Label>
                  <Input
                    className="mt-1 text-xs font-mono"
                    placeholder="Número municipal para NFS-e"
                    value={municipalRegistration}
                    onChange={(e) => setMunicipalRegistration(e.target.value)}
                  />
                </div>

                <div className="pt-1 sm:col-span-2 border-t">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
                    Representante Legal / Sócio Administrador
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome do Representante</Label>
                      <Input
                        className="mt-1 text-xs"
                        placeholder="Ex: João da Silva"
                        value={legalRepresentativeName}
                        onChange={(e) => setLegalRepresentativeName(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">CPF do Representante</Label>
                        {legalRepresentativeCpf && (
                          <span className="text-[10px]">
                            {repCpfValido ? (
                              <span className="text-emerald-600">✓ Válido</span>
                            ) : (
                              <span className="text-rose-600">✗ Inválido</span>
                            )}
                          </span>
                        )}
                      </div>
                      <Input
                        className="mt-1 text-xs font-mono"
                        placeholder="000.000.000-00"
                        value={legalRepresentativeCpf}
                        onChange={(e) => setLegalRepresentativeCpf(formatCPF(e.target.value))}
                        maxLength={14}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTATO & ENDEREÇO */}
          <div className="space-y-3 bg-card border rounded-lg p-3.5">
            <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground border-b pb-1.5">
              <Mail className="size-3.5 text-primary" />
              Contato & Localização
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">E-mail Comercial / Pessoal *</Label>
                <Input
                  type="email"
                  className="mt-1 text-xs"
                  placeholder="contato@exemplo.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Telefone / WhatsApp *</Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder="(61) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={15}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  CEP {loadingCep && <span className="text-primary font-normal text-[10px]">(Buscando...)</span>}
                </Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                  onBlur={handleCepBlur}
                  maxLength={9}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Logradouro / Rua</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Av. Comercial Norte, QNF 15"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Número / Sala</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Lote 10, Sala 302"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Bairro / Setor</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Taguatinga Norte"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Cidade</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Brasília"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Estado (UF)</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: DF"
                  value={state}
                  maxLength={2}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>

          {/* REGRAS COMERCIAIS & COMISSIONAMENTO */}
          <div className="space-y-3 bg-card border rounded-lg p-3.5">
            <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground border-b pb-1.5">
              <Percent className="size-3.5 text-emerald-600" />
              Regras Comerciais & Comissionamento
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <Label className="text-xs font-semibold">Taxa Padrão de Comissão (%) *</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    className="text-xs font-mono pr-8"
                    value={defaultCommissionRate}
                    onChange={(e) => setDefaultCommissionRate(parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground font-semibold">
                    %
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Percentual padrão aplicado sobre o valor bruto das vendas intermediadas.
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded border border-border/60 flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold block">Exige Nota Fiscal de Serviço (NFS-e)?</Label>
                  <span className="text-[10px] text-muted-foreground">
                    {personType === "PJ"
                      ? "Obrigatório para Pessoa Jurídica"
                      : "PF pode receber via Recibo/RPA"}
                  </span>
                </div>
                <Switch
                  checked={personType === "PJ" ? true : requiresInvoice}
                  disabled={personType === "PJ"}
                  onCheckedChange={setRequiresInvoice}
                />
              </div>

              <div className="sm:col-span-2 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded border border-blue-500/30 flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
                    <Sparkles className="size-3.5 text-blue-600 dark:text-blue-400" />
                    Venda de Circuitos Completos (Bundles / Combos)
                  </Label>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Habilita este parceiro comercial a comercializar circuitos fechados com descontos especiais agregados.
                  </span>
                </div>
                <Switch
                  checked={allowsCircuitBundles}
                  onCheckedChange={setAllowsCircuitBundles}
                />
              </div>
            </div>
          </div>

          {/* DADOS BANCÁRIOS & REPASSE PIX */}
          <div className="space-y-3 bg-emerald-500/5 border border-emerald-500/25 rounded-lg p-3.5">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
              <span className="font-semibold text-xs flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <Landmark className="size-3.5 text-emerald-600" />
                Dados Bancários & Chave PIX para Liquidação
              </span>

              {(cpf || cnpj) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  onClick={handlePreencherPixComDocumento}
                >
                  <Sparkles className="size-3" />
                  Usar {personType === "PF" ? "CPF" : "CNPJ"} como PIX
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Tipo de Chave PIX *</Label>
                <Select
                  value={pixKeyType}
                  onValueChange={(v: PixKeyType) => setPixKeyType(v)}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf" disabled={personType === "PJ"}>
                      CPF {personType === "PJ" && "(Apenas PF)"}
                    </SelectItem>
                    <SelectItem value="cnpj" disabled={personType === "PF"}>
                      CNPJ {personType === "PF" && "(Apenas PJ)"}
                    </SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Chave Aleatória (EVP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Chave PIX *</Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder={PIX_KEY_TYPE_CONFIG[pixKeyType]?.placeholder || "Informe a chave"}
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Banco / Instituição</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Nubank, Banco do Brasil..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Agência</Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder="Ex: 0001"
                  value={bankAgency}
                  onChange={(e) => setBankAgency(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Conta com Dígito</Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder="Ex: 123456-7"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* OBSERVAÇÕES E NOTAS */}
          <div>
            <Label className="text-xs font-semibold">Observações Internas</Label>
            <Textarea
              rows={2}
              className="mt-1 text-xs"
              placeholder="Histórico comercial, particularidades de acordos contratuais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saveMutation.isPending}
              className="gap-1.5"
            >
              {saveMutation.isPending ? "Gravando..." : partner?.id ? "Atualizar Ficha" : "Salvar Indicador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
