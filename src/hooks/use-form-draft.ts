// Hook: use-form-draft.ts
// Persistência automática de rascunhos em formulários com suporte a auto-save,
// restauração pós-F5 ou pós-fechamento acidental de modais sobrepostos.

import { useState, useEffect, useRef, useCallback } from "react";

interface UseFormDraftOptions<T> {
  draftKey: string;
  initialData: T;
  debounceMs?: number;
  enabled?: boolean;
}

export function useFormDraft<T>({
  draftKey,
  initialData,
  debounceMs = 400,
  enabled = true,
}: UseFormDraftOptions<T>) {
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef<boolean>(false);
  const currentDataRef = useRef<T>(initialData);

  // Prefixo padronizado de storage do Mídia.OS
  const storageKey = `midiaos_draft_${draftKey}`;

  // 1. Carregar rascunho existente
  const loadDraft = useCallback((): T | null => {
    if (typeof window === "undefined" || !enabled) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed.data as T;
      }
    } catch (err) {
      console.warn(`[useFormDraft] Erro ao carregar rascunho de ${storageKey}:`, err);
    }
    return null;
  }, [storageKey, enabled]);

  // Verificar existência de rascunho na inicialização
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    const existing = localStorage.getItem(storageKey);
    setHasDraft(!!existing);
  }, [storageKey, enabled]);

  // 2. Salvar rascunho com debounce
  const saveDraft = useCallback(
    (data: T) => {
      currentDataRef.current = data;
      isDirtyRef.current = true;
      if (typeof window === "undefined" || !enabled) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        try {
          const payload = {
            updatedAt: new Date().toISOString(),
            data,
          };
          localStorage.setItem(storageKey, JSON.stringify(payload));
          setHasDraft(true);
        } catch (err) {
          console.warn(`[useFormDraft] Falha ao persistir rascunho em ${storageKey}:`, err);
        }
      }, debounceMs);
    },
    [storageKey, debounceMs, enabled],
  );

  // 3. Forçar salvamento síncrono imediato
  const saveDraftImmediately = useCallback(
    (data?: T) => {
      const toSave = data !== undefined ? data : currentDataRef.current;
      if (typeof window === "undefined" || !enabled) return;
      try {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const payload = {
          updatedAt: new Date().toISOString(),
          data: toSave,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setHasDraft(true);
      } catch (err) {
        console.warn(`[useFormDraft] Falha ao salvar imediatamente em ${storageKey}:`, err);
      }
    },
    [storageKey, enabled],
  );

  // 4. Limpar rascunho (após submit bem-sucedido ou descarte)
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      isDirtyRef.current = false;
    } catch (err) {
      console.warn(`[useFormDraft] Falha ao limpar rascunho de ${storageKey}:`, err);
    }
  }, [storageKey]);

  // Salvar imediatamente se a aba estiver fechando
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    const handleBeforeUnload = () => {
      if (isDirtyRef.current && currentDataRef.current) {
        saveDraftImmediately();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, saveDraftImmediately]);

  return {
    hasDraft,
    loadDraft,
    saveDraft,
    saveDraftImmediately,
    clearDraft,
  };
}
