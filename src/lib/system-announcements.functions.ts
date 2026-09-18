import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SystemAnnouncement = {
  id: string;
  titulo: string;
  mensagem: string;
  emoji: string | null;
  versao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export const listAnnouncementsAtivos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("system_announcements")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data ?? []) as SystemAnnouncement[];
  });

export const listTodasAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("system_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SystemAnnouncement[];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(2).max(120),
  mensagem: z.string().min(2).max(2000),
  emoji: z.string().max(8).optional().nullable(),
  versao: z.string().max(40).optional().nullable(),
  ativo: z.boolean().default(true),
});

export const salvarAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: userId });
    if (!isSuper) throw new Error("Apenas o super administrador pode publicar avisos.");

    if (data.id) {
      const { error } = await supabase
        .from("system_announcements")
        .update({
          titulo: data.titulo,
          mensagem: data.mensagem,
          emoji: data.emoji ?? "✨",
          versao: data.versao ?? null,
          ativo: data.ativo,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    const { data: row, error } = await supabase
      .from("system_announcements")
      .insert({
        titulo: data.titulo,
        mensagem: data.mensagem,
        emoji: data.emoji ?? "✨",
        versao: data.versao ?? null,
        ativo: data.ativo,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const excluirAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: userId });
    if (!isSuper) throw new Error("Apenas o super administrador pode excluir avisos.");
    const { error } = await supabase.from("system_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
