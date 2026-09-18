import { useSyncExternalStore } from "react";

const KEY = "acting-as-executivo-id";
const listeners = new Set<() => void>();

function read(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

let cached: string | null = read();

function emit() {
  cached = read();
  listeners.forEach((l) => l());
}

export function setActingAsExecutivo(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Executivo "atuando como" — definido pelo filtro do admin no dashboard. */
export function useActingAsExecutivo(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => cached,
    () => null,
  );
}
