import { z } from "zod";

export type PersonType = "PF" | "PJ";
export type PartnerStatus = "active" | "inactive" | "pending_approval" | "blocked";
export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";
export type BankAccountType = "checking" | "savings";
export type PaymentCondition = "post_client_payment";

export interface PartnerAddress {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Partner {
  id: string;
  tenant_id?: string;
  person_type: PersonType;
  status: PartnerStatus;

  // Pessoa Física (PF)
  full_name?: string | null;
  cpf?: string | null;
  rg?: string | null;
  birth_date?: string | null;
  pis_pasep?: string | null;

  // Pessoa Jurídica (PJ)
  corporate_name?: string | null;
  trade_name?: string | null;
  cnpj?: string | null;
  state_registration?: string | null;
  municipal_registration?: string | null;
  legal_representative_name?: string | null;
  legal_representative_cpf?: string | null;

  // Contato & Endereço
  email: string;
  phone: string;
  address: PartnerAddress;

  // Regras Comerciais & Comissionamento
  default_commission_rate: number;
  payment_condition: PaymentCondition;
  requires_invoice: boolean;
  allows_circuit_bundles?: boolean;

  // Dados Bancários para Repasse
  pix_key_type: PixKeyType;
  pix_key: string;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  bank_account_type?: BankAccountType | null;

  // Auditoria
  notes?: string | null;
  created_at?: string;
  updated_at?: string;

  // Métricas agregadas virtuais
  clientes_count?: number;
  total_comissao_pendente?: number;
  total_comissao_paga?: number;
}

/* =========================================================================
   ALGORITMOS OFICIAIS DE VALIDAÇÃO E SANITIZAÇÃO DE DOCUMENTOS (CPF / CNPJ)
   ========================================================================= */

export function sanitizeDigits(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/\D/g, "");
}

/**
 * Validação rigorosa de CPF brasileiro (11 dígitos com cálculo dos 2 dígitos verificadores)
 */
export function isValidCPF(cpf: string | null | undefined): boolean {
  const clean = sanitizeDigits(cpf);
  if (clean.length !== 11) return false;

  // Rejeita números com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação rigorosa de CNPJ brasileiro (14 dígitos com cálculo dos 2 dígitos verificadores)
 */
export function isValidCNPJ(cnpj: string | null | undefined): boolean {
  const clean = sanitizeDigits(cnpj);
  if (clean.length !== 14) return false;

  // Rejeita números com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let length = clean.length - 2;
  let numbers = clean.substring(0, length);
  const digits = clean.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  length = length + 1;
  numbers = clean.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

/**
 * Formatador visual de CPF: 000.000.000-00
 */
export function formatCPF(cpf: string | null | undefined): string {
  const digits = sanitizeDigits(cpf);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formatador visual de CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  const digits = sanitizeDigits(cnpj);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formatador visual de Telefone / WhatsApp: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(phone: string | null | undefined): string {
  const digits = sanitizeDigits(phone);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formatador visual de CEP: 00000-000
 */
export function formatCEP(cep: string | null | undefined): string {
  const digits = sanitizeDigits(cep);
  if (!digits) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/* =========================================================================
   CONFIGURAÇÕES VISUAIS E STATUS
   ========================================================================= */

export const PARTNER_STATUS_CONFIG: Record<
  PartnerStatus,
  { label: string; badge: string; color: string; desc: string }
> = {
  active: {
    label: "Ativo",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    color: "text-emerald-600 dark:text-emerald-400",
    desc: "Apto para receber indicações e fechamento de negócios",
  },
  inactive: {
    label: "Inativo",
    badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    color: "text-slate-500",
    desc: "Suspenso temporariamente por solicitação",
  },
  pending_approval: {
    label: "Aguardando Aprovação",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    color: "text-amber-600",
    desc: "Cadastro em análise documental pela diretoria",
  },
  blocked: {
    label: "Bloqueado",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    color: "text-rose-600",
    desc: "Bloqueado para novas indicações e comissões",
  },
};

export const PIX_KEY_TYPE_CONFIG: Record<
  PixKeyType,
  { label: string; placeholder: string; maskInfo: string }
> = {
  cpf: {
    label: "CPF",
    placeholder: "000.000.000-00",
    maskInfo: "Apenas para pessoas físicas",
  },
  cnpj: {
    label: "CNPJ",
    placeholder: "00.000.000/0000-00",
    maskInfo: "Apenas para pessoas jurídicas",
  },
  email: {
    label: "E-mail",
    placeholder: "parceiro@exemplo.com.br",
    maskInfo: "E-mail válido cadastrado no banco",
  },
  phone: {
    label: "Telefone / Celular",
    placeholder: "(61) 99999-9999",
    maskInfo: "Número com DDD cadastrado no banco",
  },
  random: {
    label: "Chave Aleatória (EVP)",
    placeholder: "e2b10a24-7832-4d1a-8c31-90fa7bb29a41",
    maskInfo: "Chave UUID aleatória gerada pelo Banco Central",
  },
};

/* =========================================================================
   SCHEMAS ZOD PARA VALIDAÇÃO STRICT SERVER-SIDE E CLIENT-SIDE
   ========================================================================= */

const addressSchema = z.object({
  cep: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
}).default({});

const basePartnerSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  status: z.enum(["active", "inactive", "pending_approval", "blocked"]).default("active"),
  email: z.string().email("E-mail corporativo ou pessoal inválido"),
  phone: z.string().min(10, "Telefone/WhatsApp deve ter DDD e pelo menos 10 dígitos"),
  address: addressSchema,
  default_commission_rate: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%").default(10),
  payment_condition: z.literal("post_client_payment").default("post_client_payment"),
  requires_invoice: z.boolean().default(false),
  allows_circuit_bundles: z.boolean().default(false),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]).default("cpf"),
  pix_key: z.string().min(3, "Chave PIX é obrigatória para repasse"),
  bank_name: z.string().optional().nullable(),
  bank_agency: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  bank_account_type: z.enum(["checking", "savings"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Schema estrito para Pessoa Física (PF)
 */
export const partnerPfSchema = basePartnerSchema.extend({
  person_type: z.literal("PF"),
  full_name: z.string().min(3, "Nome completo é obrigatório para Pessoa Física"),
  cpf: z
    .string()
    .min(11, "CPF deve ter 11 dígitos")
    .refine((val) => isValidCPF(val), {
      message: "CPF informado é inválido pelo algoritmo da Receita Federal",
    }),
  rg: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  pis_pasep: z.string().optional().nullable(),
  corporate_name: z.string().optional().nullable(),
  trade_name: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  state_registration: z.string().optional().nullable(),
  municipal_registration: z.string().optional().nullable(),
  legal_representative_name: z.string().optional().nullable(),
  legal_representative_cpf: z.string().optional().nullable(),
});

/**
 * Schema estrito para Pessoa Jurídica (PJ)
 */
export const partnerPjSchema = basePartnerSchema.extend({
  person_type: z.literal("PJ"),
  corporate_name: z.string().min(3, "Razão Social é obrigatória para Pessoa Jurídica"),
  trade_name: z.string().optional().nullable(),
  cnpj: z
    .string()
    .min(14, "CNPJ deve ter 14 dígitos")
    .refine((val) => isValidCNPJ(val), {
      message: "CNPJ informado é inválido pelo algoritmo da Receita Federal",
    }),
  state_registration: z.string().optional().nullable(),
  municipal_registration: z.string().optional().nullable(),
  legal_representative_name: z.string().optional().nullable(),
  legal_representative_cpf: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || isValidCPF(val), {
      message: "CPF do representante legal é inválido",
    }),
  full_name: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  rg: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  pis_pasep: z.string().optional().nullable(),
});

/**
 * Schema unificado com superRefine para consistência de PIX e Tipo de Pessoa
 */
export const partnerSchema = z
  .discriminatedUnion("person_type", [partnerPfSchema, partnerPjSchema])
  .superRefine((data, ctx) => {
    // Validação de consistência do tipo de chave PIX
    if (data.person_type === "PF" && data.pix_key_type === "cnpj") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pix_key_type"],
        message: "Chave PIX do tipo CNPJ não pode ser selecionada para Pessoa Física",
      });
    }

    if (data.person_type === "PJ" && data.pix_key_type === "cpf") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pix_key_type"],
        message: "Chave PIX do tipo CPF não pode ser a chave primária de Pessoa Jurídica",
      });
    }

    // Se a chave PIX for do tipo CPF, valida o formato
    if (data.pix_key_type === "cpf" && !isValidCPF(data.pix_key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pix_key"],
        message: "A chave PIX do tipo CPF deve ser um CPF válido",
      });
    }

    // Se a chave PIX for do tipo CNPJ, valida o formato
    if (data.pix_key_type === "cnpj" && !isValidCNPJ(data.pix_key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pix_key"],
        message: "A chave PIX do tipo CNPJ deve ser um CNPJ válido",
      });
    }

    // Se PJ, nota fiscal é obrigatória por padrão tributário
    if (data.person_type === "PJ" && !data.requires_invoice) {
      // Aviso / coerção: PJ deve emitir NFS-e
    }
  });

export type PartnerInput = z.infer<typeof partnerSchema>;
