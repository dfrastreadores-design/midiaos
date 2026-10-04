import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export type FieldErrors = Record<string, string>;

/**
 * Rola suavemente até o primeiro campo com erro (marcado por `data-field="..."` ou `name="..."` ou `id="..."`)
 * e foca o elemento.
 */
export function scrollToFirstError(errors: FieldErrors) {
  const first = Object.keys(errors)[0];
  if (!first || typeof document === "undefined") return;
  const el =
    document.querySelector<HTMLElement>(`[data-field="${first}"]`) ||
    document.querySelector<HTMLElement>(`#${first}`) ||
    document.querySelector<HTMLElement>(`[name="${first}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable =
    el.matches("input, textarea, select, button")
      ? el
      : el.querySelector<HTMLElement>(
          'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
        );
  setTimeout(() => focusable?.focus?.(), 300);
}

export function useFormErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const setAll = useCallback((errs: FieldErrors) => {
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Por favor, preencha os campos obrigatórios destacados em vermelho.");
      scrollToFirstError(errs);
    }
  }, []);

  const clear = useCallback((field?: string) => {
    setErrors((prev) => {
      if (!field) return {};
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const has = useCallback((field: string) => !!errors[field], [errors]);

  return { errors, setErrors: setAll, clear, has };
}

/** Retorna classes para destacar o container do campo em erro com fundo e borda vermelhos. */
export function errorFieldClass(hasError: boolean, extra = "") {
  return [
    hasError
      ? "rounded-xl border-2 !border-red-500 !bg-red-50/40 dark:!bg-red-950/20 p-2.5 transition-all shadow-xs ring-2 ring-red-500/20"
      : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Classe de destaque em vermelho para inputs, selects e textareas individuais. */
export function errorInputClass(hasError: boolean, extra = "") {
  return [
    hasError
      ? "!border-red-500 !bg-red-50/70 dark:!bg-red-950/30 !ring-2 !ring-red-500/40 focus-visible:!ring-red-500 text-foreground"
      : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Classe para Labels ficarem em vermelho quando o campo correspondente tiver erro. */
export function errorLabelClass(hasError: boolean, extra = "") {
  return [
    hasError ? "!text-red-600 dark:!text-red-400 font-bold" : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Componente de mensagem de erro com ícone em vermelho. */
export function FormFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return React.createElement(
    "p",
    {
      className:
        "text-[11px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150",
    },
    React.createElement(AlertCircle, { className: "size-3.5 shrink-0 text-red-500" }),
    React.createElement("span", null, message),
  );
}

