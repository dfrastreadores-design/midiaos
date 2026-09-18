import { useCallback, useState } from "react";
import { toast } from "sonner";

export type FieldErrors = Record<string, string>;

/**
 * Rola até o primeiro campo com erro (marcado por `data-field="..."`)
 * e destaca visualmente. Foca o elemento se possível.
 */
export function scrollToFirstError(errors: FieldErrors) {
  const first = Object.keys(errors)[0];
  if (!first || typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = el.querySelector<HTMLElement>(
    'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
  );
  setTimeout(() => focusable?.focus?.(), 300);
}

export function useFormErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const setAll = useCallback((errs: FieldErrors) => {
    setErrors(errs);
    if (Object.keys(errs).length) {
      const firstMsg = Object.values(errs)[0];
      if (firstMsg) toast.error(firstMsg);
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

/** Retorna classes para destacar o container do campo em erro. */
export function errorFieldClass(hasError: boolean, extra = "") {
  return [
    hasError
      ? "rounded-md ring-2 ring-destructive ring-offset-2 ring-offset-background transition-shadow"
      : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Classe para inputs/selects individuais. */
export function errorInputClass(hasError: boolean) {
  return hasError ? "border-destructive focus-visible:ring-destructive" : "";
}
