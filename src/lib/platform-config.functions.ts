import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlatformConfig = {
  /** true = multi-empresa (várias emissoras/CNPJs); false = uma única empresa */
  multi_empresa: boolean;
  /** CNPJ padrão quando modo single (informativo — a emissora cadastrada é a fonte da verdade) */
  cnpj_padrao: string;
  razao_social_padrao: string;
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  multi_empresa: true,
  cnpj_padrao: "",
  razao_social_padrao: "",
};

const KEY = "platform_config";

export const getPlatformConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("system_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ...DEFAULT_PLATFORM_CONFIG, ...((data?.value as Partial<PlatformConfig>) ?? {}) };
  });

export const savePlatformConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        multi_empresa: z.boolean(),
        cnpj_padrao: z.string().default(""),
        razao_social_padrao: z.string().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: userAuth } = await context.supabase.auth.getUser();
    const isSuper = userAuth?.user?.email?.toLowerCase() === "rafaelrodrigo.as@gmail.com";
    if (!isSuper) {
      const { data: sa, error: eSa } = await context.supabase.rpc("is_super_admin", {
        _user_id: context.userId,
      });
      if (eSa) throw new Error(eSa.message);
      if (!sa)
        throw new Error(
          "Apenas o proprietário da plataforma (rafaelrodrigo.as@gmail.com) pode alterar esta configuração.",
        );
    }
    const { error } = await context.supabase
      .from("system_settings")
      .upsert({ key: KEY, value: data, updated_by: context.userId } as never, {
        onConflict: "key",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
