import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  generateWhatsappQrDataUrl,
  openWhatsapp,
  sanitizePhone,
  sanitizeMessage,
  isValidWhatsappPhone,
} from "@/lib/whatsapp-share";
import {
  Loader2,
  ExternalLink,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface WhatsappQrDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Telefone único (compatibilidade) */
  phone?: string;
  /** Telefones iniciais para múltiplos destinatários */
  phones?: string[];
  message: string;
  title?: string;
}

/** Formata BR: +55 (61) 99999-8888 */
function formatBrPhone(sanitized: string): string {
  if (!sanitized) return "";
  if (sanitized.startsWith("55") && (sanitized.length === 12 || sanitized.length === 13)) {
    const ddd = sanitized.slice(2, 4);
    const rest = sanitized.slice(4);
    const mid = rest.length === 9 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : `${rest.slice(0, 4)}-${rest.slice(4)}`;
    return `+55 (${ddd}) ${mid}`;
  }
  return `+${sanitized}`;
}

interface Recipient {
  raw: string;
  clean: string;
  valid: boolean;
  qr?: string;
}

export function WhatsappQrDialog({
  open,
  onOpenChange,
  phone = "",
  phones,
  message,
  title = "Enviar por WhatsApp",
}: WhatsappQrDialogProps) {
  const STORAGE_KEY = "wa-qr-dialog:last";

  const initialList = useMemo(() => {
    const list = phones && phones.length > 0 ? phones : phone ? [phone] : [];
    return list.filter(Boolean);
  }, [phones, phone]);

  const [step, setStep] = useState<"preview" | "qr">("preview");
  const [phoneList, setPhoneList] = useState<string[]>(initialList);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [messageInput, setMessageInput] = useState(message);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  useEffect(() => {
    if (open) {
      let restoredPhones: string[] = [];
      let restoredMsg: string | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as { phones?: string[]; message?: string };
          restoredPhones = Array.isArray(data.phones) ? data.phones.filter(Boolean) : [];
          restoredMsg = typeof data.message === "string" ? data.message : null;
        }
      } catch {
        // ignore corrupted storage
      }
      const usedStoredPhones = initialList.length === 0 && restoredPhones.length > 0;
      const usedStoredMsg = !message && !!restoredMsg;
      setPhoneList(initialList.length > 0 ? initialList : restoredPhones);
      setPhoneDraft("");
      setMessageInput(message || restoredMsg || "");
      setStep("preview");
      setRecipients([]);
      setActiveIdx(0);
      setCopied(false);
      setRestoredFromStorage(usedStoredPhones || usedStoredMsg);
    }
  }, [open, initialList, message]);

  const cleanedMessage = useMemo(() => sanitizeMessage(messageInput), [messageInput]);

  function addPhone(raw: string) {
    const parts = raw
      .split(/[,\n;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setPhoneList((prev) => Array.from(new Set([...prev, ...parts])));
    setPhoneDraft("");
  }

  function removePhone(idx: number) {
    setPhoneList((prev) => prev.filter((_, i) => i !== idx));
  }

  const phoneRows = useMemo(
    () =>
      phoneList.map((raw) => ({
        raw,
        clean: sanitizePhone(raw),
        valid: isValidWhatsappPhone(raw),
      })),
    [phoneList],
  );

  const invalidCount = phoneRows.filter((p) => !p.valid).length;
  const canConfirm = phoneRows.length > 0 && invalidCount === 0 && cleanedMessage.length > 0;

  async function handleCopy() {
    if (!cleanedMessage) return;
    try {
      await navigator.clipboard.writeText(cleanedMessage);
      setCopied(true);
      toast.success("Mensagem copiada para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  // Atalho global no diálogo: Ctrl/Cmd + Shift + C copia a mensagem
  useEffect(() => {
    if (!open || step !== "preview") return;
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        void handleCopy();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, cleanedMessage]);

  async function handleConfirm() {
    setStep("qr");
    setLoading(true);
    try {
      const results = await Promise.all(
        phoneRows.map(async (p) => ({
          raw: p.raw,
          clean: p.clean,
          valid: p.valid,
          qr: await generateWhatsappQrDataUrl(p.clean, cleanedMessage, 320),
        })),
      );
      setRecipients(results);
      setActiveIdx(0);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ phones: phoneList, message: messageInput }),
        );
      } catch {
        // ignore quota errors
      }
    } finally {
      setLoading(false);
    }
  }

  function clearRestored() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPhoneList([]);
    setMessageInput("");
    setRestoredFromStorage(false);
  }

  const active = recipients[activeIdx];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {step === "preview"
              ? "Adicione um ou mais destinatários e revise a mensagem antes de gerar os QR Codes."
              : `Gerado ${recipients.length} QR Code${recipients.length === 1 ? "" : "s"} — selecione o destinatário.`}
          </DialogDescription>
        </DialogHeader>

        {step === "preview" ? (
          <div className="flex flex-col gap-4 py-2">
            {restoredFromStorage && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span>Restauramos o último envio para agilizar o reenvio.</span>
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2" onClick={clearRestored}>
                  Limpar
                </Button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone">Destinatários</Label>
              <div className="flex gap-2">
                <input
                  id="wa-phone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addPhone(phoneDraft);
                    }
                  }}
                  onBlur={() => phoneDraft && addPhone(phoneDraft)}
                  placeholder="Digite e pressione Enter (aceita vários separados por vírgula)"
                />
                <Button type="button" variant="outline" onClick={() => addPhone(phoneDraft)} disabled={!phoneDraft.trim()}>
                  Adicionar
                </Button>
              </div>

              {phoneRows.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {phoneRows.map((p, i) => (
                    <Badge
                      key={`${p.raw}-${i}`}
                      variant={p.valid ? "secondary" : "destructive"}
                      className="gap-1 pl-2 pr-1"
                    >
                      {p.valid ? formatBrPhone(p.clean) : p.raw}
                      <button
                        type="button"
                        onClick={() => removePhone(i)}
                        className="ml-1 rounded-sm hover:bg-black/10 p-0.5"
                        aria-label="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs">
                {invalidCount > 0 ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-destructive">
                      {invalidCount} telefone(s) inválido(s). Corrija removendo e adicionando novamente.
                    </span>
                  </>
                ) : phoneRows.length > 0 ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-muted-foreground">
                      {phoneRows.length} destinatário(s) prontos.
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Adicione pelo menos um telefone.</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wa-msg">Mensagem</Label>
              <Textarea
                id="wa-msg"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                rows={6}
                maxLength={4000}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Prévia após formatação: {cleanedMessage.length} caracteres</span>
                <span>{messageInput.length}/4000</span>
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="font-medium text-foreground">Prévia da mensagem</div>
                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:inline-block rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Ctrl/⌘ + Shift + C
                  </kbd>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={handleCopy}
                    disabled={!cleanedMessage}
                    aria-label="Copiar mensagem para a área de transferência"
                    aria-keyshortcuts="Control+Shift+C Meta+Shift+C"
                    title="Copiar (Ctrl/⌘ + Shift + C)"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>
              <pre
                tabIndex={0}
                role="textbox"
                aria-readonly="true"
                aria-label="Prévia da mensagem — pressione Ctrl ou Command mais C para copiar"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
                    const sel = window.getSelection?.()?.toString();
                    if (!sel) {
                      e.preventDefault();
                      void handleCopy();
                    }
                  }
                }}
                className="whitespace-pre-wrap font-sans text-muted-foreground max-h-32 overflow-auto rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {cleanedMessage || "(mensagem vazia)"}
              </pre>
              <span role="status" aria-live="polite" className="sr-only">
                {copied ? "Mensagem copiada para a área de transferência" : ""}
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={!canConfirm}>
                Gerar QR{phoneRows.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            {recipients.length > 1 && (
              <div className="flex flex-wrap gap-1.5 w-full">
                {recipients.map((r, i) => (
                  <Button
                    key={`${r.raw}-${i}`}
                    size="sm"
                    variant={i === activeIdx ? "default" : "outline"}
                    onClick={() => setActiveIdx(i)}
                    className="h-7 text-xs"
                  >
                    {formatBrPhone(r.clean) || r.raw}
                  </Button>
                ))}
              </div>
            )}

            {loading || !active?.qr ? (
              <div className="h-[320px] w-[320px] flex items-center justify-center bg-muted rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <img src={active.qr} alt="QR Code WhatsApp" className="h-[320px] w-[320px] rounded-md border" />
            )}

            <div className="text-xs text-muted-foreground text-center">
              {active?.clean ? formatBrPhone(active.clean) : "Link genérico"} · {cleanedMessage.length} caracteres
            </div>

            <div className="flex gap-2 w-full flex-wrap">
              <Button variant="outline" onClick={() => setStep("preview")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Editar
              </Button>
              <Button variant="outline" className="flex-1" disabled={!active?.qr} asChild>
                <a href={active?.qr} download={`whatsapp-qr-${active?.clean || "link"}.png`}>
                  <Download className="h-4 w-4 mr-2" /> Baixar
                </a>
              </Button>
              <Button className="flex-1" onClick={() => active && openWhatsapp(active.clean, cleanedMessage)}>
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
