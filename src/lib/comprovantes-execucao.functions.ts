import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ComprovanteExecucao {
  id: string;
  tenant_id?: string;
  pi_id: string;
  pi_item_id?: string | null;
  parceiro_id?: string | null;
  tipo: "foto" | "video" | "print" | "link" | "relatorio" | "documento";
  titulo: string;
  descricao?: string | null;
  arquivo_url?: string | null;
  link_externo?: string | null;
  data_veiculacao?: string | null;
  hora_veiculacao?: string | null;
  validado: boolean;
  created_at: string;

  // Relações
  parceiro?: { razao_social: string; nome_fantasia: string } | null;
  pi_item?: { tipo: string; programa: string; formato: string } | null;
}

/**
 * Lista os comprovantes de execução vinculados a uma Campanha / PI
 */
export const listComprovantes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { piId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("comprovantes_execucao")
      .select(`
        *,
        parceiro:parceiros(razao_social, nome_fantasia),
        pi_item:pi_itens(tipo, programa, formato)
      `)
      .eq("pi_id", data.piId)
      .order("data_veiculacao", { ascending: false });

    if (error) {
      console.warn("Aviso ao listar comprovantes:", error.message);
      return [] as ComprovanteExecucao[];
    }
    return (rows || []) as ComprovanteExecucao[];
  });

/**
 * Salva um novo comprovante de veiculação
 */
export const salvarComprovante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      pi_id: string;
      pi_item_id?: string | null;
      parceiro_id?: string | null;
      tipo: ComprovanteExecucao["tipo"];
      titulo: string;
      descricao?: string | null;
      arquivo_url?: string | null;
      link_externo?: string | null;
      data_veiculacao?: string | null;
      hora_veiculacao?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("comprovantes_execucao")
        .update({
          pi_item_id: data.pi_item_id || null,
          parceiro_id: data.parceiro_id || null,
          tipo: data.tipo,
          titulo: data.titulo.trim(),
          descricao: data.descricao?.trim() || null,
          arquivo_url: data.arquivo_url || null,
          link_externo: data.link_externo?.trim() || null,
          data_veiculacao: data.data_veiculacao || null,
          hora_veiculacao: data.hora_veiculacao?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as ComprovanteExecucao;
    }

    const { data: created, error } = await supabase
      .from("comprovantes_execucao")
      .insert({
        pi_id: data.pi_id,
        pi_item_id: data.pi_item_id || null,
        parceiro_id: data.parceiro_id || null,
        tipo: data.tipo,
        titulo: data.titulo.trim(),
        descricao: data.descricao?.trim() || null,
        arquivo_url: data.arquivo_url || null,
        link_externo: data.link_externo?.trim() || null,
        data_veiculacao: data.data_veiculacao || null,
        hora_veiculacao: data.hora_veiculacao?.trim() || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as ComprovanteExecucao;
  });

/**
 * Valida / aprova um comprovante de veiculação
 */
export const validarComprovante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; validado: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("comprovantes_execucao")
      .update({ validado: data.validado, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * Exclui um comprovante de execução
 */
export const excluirComprovante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("comprovantes_execucao").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
