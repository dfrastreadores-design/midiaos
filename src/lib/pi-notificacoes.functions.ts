import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Notifica o executivo (email + payload de WhatsApp) após regeneração do PDF
 * do PI decorrente de troca de atendimento/executivo. Apenas admins.
 */
export const notificarPiReemitidoParaExecutivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const request = getRequest();

    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Apenas administradores podem notificar reemissão");

    const { data: pi, error } = await supabase
      .from("pis")
      .select(
        "id, numero, campanha, executivo_id, cliente:cliente_id(razao_social), agencia:agencia_id(razao_social)",
      )
      .eq("id", data.pi_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pi?.executivo_id) return { ok: false, reason: "sem_executivo" as const };

    const [{ data: exec }, { data: admin }] = await Promise.all([
      supabase
        .from("profiles")
        .select("nome, email, whatsapp, telefone")
        .eq("id", pi.executivo_id)
        .maybeSingle(),
      supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
    ]);
    if (!exec) return { ok: false, reason: "executivo_nao_encontrado" as const };

    const clienteNome =
      (pi.cliente as any)?.razao_social || (pi.agencia as any)?.razao_social || "N/A";
    const origin = request ? new URL(request.url).origin : "https://midiaos.online";
    const linkPi = `${origin}/pi?id=${pi.id}`;

    // Notificação in-app
    await supabase.from("notificacoes").insert({
      user_id: pi.executivo_id,
      tipo: "outro" as never,
      titulo: `PI ${pi.numero} reatribuído a você`,
      mensagem: `${pi.campanha} — ${clienteNome}. O PDF foi regenerado.`,
      link: `/pi?id=${pi.id}`,
      metadata: { ref_id: pi.id, evento: "pi-reemitido" } as never,
    } as never);

    // Email transacional
    let emailOk = false;
    if (exec.email && request) {
      try {
        const res = await fetch(`${origin}/lovable/email/transactional/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(context as any).token}`,
          },
          body: JSON.stringify({
            templateName: "pi-regenerado",
            recipientEmail: exec.email,
            idempotencyKey: `pi-reemitido-${pi.id}-${pi.executivo_id}-${Date.now()}`,
            templateData: {
              nome: exec.nome,
              numeroPi: pi.numero,
              campanha: pi.campanha,
              cliente: clienteNome,
              alteradoPor: (admin as any)?.nome || "Administrador",
              linkPi,
            },
          }),
        });
        emailOk = res.ok;
      } catch (e) {
        console.error("Falha ao enviar email de reemissão:", e);
      }
    }

    const phone = (exec as any).whatsapp || (exec as any).telefone || null;
    const message = `Olá ${exec.nome || ""}! O PI ${pi.numero} (${pi.campanha} — ${clienteNome}) foi reatribuído a você e o PDF já foi regenerado. Acesse: ${linkPi}`;

    return { ok: true as const, emailOk, whatsapp: { phone, message } };
  });
