import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, AlertCircle, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

export interface QuickDateInputProps {
  /** Valor no formato ISO (YYYY-MM-DD) ou DD/MM/AAAA */
  value?: string | null;
  /** Callback acionado ao alterar o valor, repassando o formato ISO YYYY-MM-DD (ou vazio) */
  onChange?: (isoDate: string) => void;
  /** Callback para quando o input perde o foco */
  onBlur?: () => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  error?: boolean | string;
  autoFocus?: boolean;
}

/**
 * Converte 'YYYY-MM-DD' para 'DD/MM/AAAA'
 */
function isoToBra(iso: string): string {
  if (!iso) return "";
  const clean = iso.split("T")[0].trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  // Se já estiver em DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }
  return clean;
}

/**
 * Converte 'DD/MM/AAAA' para 'YYYY-MM-DD'
 */
function braToIso(bra: string): string | null {
  if (!bra) return "";
  const match = bra.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  // Validação real de dias no mês (ano bissexto incluso)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Aplica máscara numérica progressiva DD/MM/AAAA
 */
function applyDateMask(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export const QuickDateInput = React.forwardRef<HTMLInputElement, QuickDateInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      id,
      name,
      placeholder = "DD/MM/AAAA",
      disabled = false,
      readOnly = false,
      required = false,
      className,
      error,
      autoFocus = false,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [displayVal, setDisplayVal] = useState<string>(() => isoToBra(value || ""));
    const [isOpen, setIsOpen] = useState(false);
    const [inlineError, setInlineError] = useState<string | null>(null);

    // Sincroniza estado visual quando a prop externa value muda
    useEffect(() => {
      const formatted = isoToBra(value || "");
      setDisplayVal(formatted);
      if (formatted.length === 10) {
        setInlineError(null);
      }
    }, [value]);

    // Trata digitação com máscara
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const masked = applyDateMask(raw);
      setDisplayVal(masked);

      if (masked === "") {
        setInlineError(null);
        onChange?.("");
        return;
      }

      if (masked.length === 10) {
        const iso = braToIso(masked);
        if (iso) {
          setInlineError(null);
          onChange?.(iso);
        } else {
          // Data com formato completo mas dias/meses inválidos
          setInlineError("Data inválida");
        }
      }
    };

    // Suporte para colar datas (Ctrl+V) em múltiplos formatos
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").trim();
      if (!text) return;

      // Caso YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const bra = isoToBra(text);
        setDisplayVal(bra);
        setInlineError(null);
        onChange?.(text);
        return;
      }

      // Caso DD/MM/AAAA ou números puros
      const masked = applyDateMask(text);
      setDisplayVal(masked);
      if (masked.length === 10) {
        const iso = braToIso(masked);
        if (iso) {
          setInlineError(null);
          onChange?.(iso);
        } else {
          setInlineError("Data inválida");
        }
      }
    };

    // Validação suave ao sair do campo (onBlur)
    const handleBlur = () => {
      if (displayVal && displayVal.length > 0 && displayVal.length < 10) {
        setInlineError("Preencha DD/MM/AAAA");
      } else if (displayVal.length === 10 && !braToIso(displayVal)) {
        setInlineError("Data inválida");
      } else {
        setInlineError(null);
      }
      onBlur?.();
    };

    // Atalhos de teclado (seta para baixo abre o calendário popover)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" && !disabled && !readOnly) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    // Seleção no calendário gráfico
    const handleSelectDate = (date: Date | undefined) => {
      if (!date) return;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      const bra = `${d}/${m}/${y}`;

      setDisplayVal(bra);
      setInlineError(null);
      onChange?.(iso);
      setIsOpen(false);

      // Retorna foco para o input permitindo navegação imediata com Tab
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    };

    // Converte displayVal para objeto Date para o calendário
    const selectedDate = React.useMemo(() => {
      if (displayVal.length === 10) {
        const iso = braToIso(displayVal);
        if (iso) {
          const [y, m, d] = iso.split("-").map(Number);
          return new Date(y, m - 1, d);
        }
      }
      return undefined;
    }, [displayVal]);

    const hasError = !!error || !!inlineError;

    return (
      <div className="relative inline-flex flex-col w-full">
        <div
          className={cn(
            "relative flex items-center w-full rounded-md border bg-background transition-colors focus-within:ring-2 focus-within:ring-primary/20",
            hasError ? "border-destructive ring-1 ring-destructive/40" : "border-input",
            disabled && "opacity-50 cursor-not-allowed bg-muted/30",
            className,
          )}
        >
          {/* Input de texto para digitação rápida com teclado */}
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={displayVal}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            autoFocus={autoFocus}
            maxLength={10}
            className="w-full bg-transparent px-3 py-1.5 text-xs font-mono tracking-wider placeholder:text-muted-foreground/60 placeholder:font-sans focus:outline-none"
          />

          {/* Botão para limpar se houver valor */}
          {displayVal && !disabled && !readOnly && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setDisplayVal("");
                setInlineError(null);
                onChange?.("");
                inputRef.current?.focus();
              }}
              className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors mr-0.5"
              title="Limpar data"
            >
              <X className="size-3.5" />
            </button>
          )}

          {/* Popover do Calendário Gráfico como Segunda Opção */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                tabIndex={-1}
                variant="ghost"
                size="icon"
                disabled={disabled || readOnly}
                className="size-7 mr-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-sm shrink-0"
                title="Abrir calendário (ou pressione Seta para Baixo no campo)"
              >
                <CalendarIcon className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 z-50 rounded-xl shadow-xl border bg-popover"
              align="end"
              sideOffset={6}
            >
              <Calendar
                mode="single"
                locale={ptBR}
                selected={selectedDate}
                onSelect={handleSelectDate}
                defaultMonth={selectedDate || new Date()}
                initialFocus
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Mensagem de Erro Inline Não Bloqueante */}
        {inlineError && (
          <span className="flex items-center gap-1 text-[10px] text-destructive font-medium mt-1 animate-in fade-in">
            <AlertCircle className="size-3 shrink-0" />
            {inlineError}
          </span>
        )}
      </div>
    );
  },
);

QuickDateInput.displayName = "QuickDateInput";
