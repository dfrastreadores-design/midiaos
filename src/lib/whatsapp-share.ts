import { supabase } from "@/integrations/supabase/client";

/** Limite do WhatsApp para texto em wa.me (deixa margem para encoding) */
const WHATSAPP_MAX_MESSAGE = 4000;

/** Remove tudo que não é dígito; mantém só números do telefone e adiciona DDI 55 quando aplicável */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/\D+/g, "");
  // Remove zeros à esquerda (ex.: "021...") e prefixo internacional "00"
  digits = digits.replace(/^0+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Adiciona código do Brasil se vier sem DDI e tiver 10/11 dígitos
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/** Valida se o telefone está em um formato aceitável para wa.me (E.164 sem +, 10 a 15 dígitos) */
export function isValidWhatsappPhone(phone: string | null | undefined): boolean {
  const p = sanitizePhone(phone);
  return /^[1-9]\d{9,14}$/.test(p);
}

/** Normaliza e limita o texto da mensagem (trim, colapsa espaços em branco, aplica limite) */
export function sanitizeMessage(message: string | null | undefined): string {
  if (!message) return "";
  // Remove caracteres de controle exceto quebras de linha e tab
  let m = message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // Colapsa >2 quebras de linha e espaços redundantes
  m = m
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (m.length > WHATSAPP_MAX_MESSAGE) m = m.slice(0, WHATSAPP_MAX_MESSAGE - 1) + "…";
  return m;
}

/** Monta a URL do WhatsApp Web (wa.me) com validação e formatação automática */
export function buildWhatsappUrl(phone: string, message: string): string {
  const p = sanitizePhone(phone);
  const msg = sanitizeMessage(message);
  const text = encodeURIComponent(msg);
  if (p && !isValidWhatsappPhone(p)) {
    throw new Error(
      "Telefone inválido para WhatsApp. Informe com DDD (10 ou 11 dígitos) ou no formato internacional.",
    );
  }
  return p ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`;
}

/** Abre o WhatsApp em nova aba */
export function openWhatsapp(phone: string, message: string) {
  const url = buildWhatsappUrl(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Sobe um PDF (Blob) para o bucket informado e retorna uma URL assinada (7 dias) */
export async function uploadPdfSigned(
  bucket: "proposta-anexos" | "pi-anexos",
  parentId: string,
  fileName: string,
  blob: Blob,
  expiresInSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
  const safe = fileName.replace(/[^\w.\-]+/g, "_");
  const path = `${parentId}/share-${Date.now()}-${safe}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "application/pdf",
    upsert: false,
    cacheControl: "3600",
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw error ?? new Error("Falha ao gerar URL assinada");
  return data.signedUrl;
}

/**
 * Envio em lote via wa.me — abre uma aba por destinatário.
 * Navegadores bloqueiam múltiplos window.open; usa delay entre aberturas.
 */
export async function openWhatsappBatch(
  recipients: Array<{ phone: string; message: string }>,
  delayMs = 800,
): Promise<{ opened: number; blocked: number }> {
  let opened = 0;
  let blocked = 0;
  for (const r of recipients) {
    const url = buildWhatsappUrl(r.phone, r.message);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) opened++;
    else blocked++;
    await new Promise((res) => setTimeout(res, delayMs));
  }
  return { opened, blocked };
}

/** Gera Data URL (PNG base64) de um QR Code para o link do WhatsApp */
export async function generateWhatsappQrDataUrl(
  phone: string,
  message: string,
  size = 320,
): Promise<string> {
  const { default: QRCode } = await import("qrcode");
  const url = buildWhatsappUrl(phone, message);
  return QRCode.toDataURL(url, { width: size, margin: 1, errorCorrectionLevel: "M" });
}
