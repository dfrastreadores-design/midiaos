import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PiLayoutConfig = {
  corPrimaria: string;
  corTexto: string;
  mostrarLogoTenant: boolean;
  mostrarLogoEmissora: boolean;
  rodapeTexto: string;
  observacaoPadrao: string;
  margemMm: number;
  tamanhoFonteBase: number;
};

export const DEFAULT_PI_LAYOUT: PiLayoutConfig = {
  corPrimaria: "#0F5C7C",
  corTexto: "#1F2937",
  mostrarLogoTenant: true,
  mostrarLogoEmissora: true,
  rodapeTexto: "",
  observacaoPadrao: "",
  margemMm: 8,
  tamanhoFonteBase: 8,
};

const KEY = "pi_layout";

export const getPiLayout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("system_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ...DEFAULT_PI_LAYOUT, ...((data?.value as Partial<PiLayoutConfig>) ?? {}) };
  });

export const savePiLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      corPrimaria: z.string(),
      corTexto: z.string(),
      mostrarLogoTenant: z.boolean(),
      mostrarLogoEmissora: z.boolean(),
      rodapeTexto: z.string(),
      observacaoPadrao: z.string(),
      margemMm: z.number().min(0).max(30),
      tamanhoFonteBase: z.number().min(6).max(14),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("system_settings")
      .upsert({ key: KEY, value: data, updated_by: context.userId } as never, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

let _layoutCache: Promise<PiLayoutConfig> | null = null;
/** Carrega o layout do PI com cache em memória (cliente). Em falha, devolve o default. */
export async function loadPiLayoutCached(): Promise<PiLayoutConfig> {
  if (!_layoutCache) {
    _layoutCache = getPiLayout().catch(() => DEFAULT_PI_LAYOUT);
  }
  return _layoutCache;
}
export function invalidatePiLayoutCache() { _layoutCache = null; }
