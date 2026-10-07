import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey } from "@/integrations/supabase/client.server";
import { isMasterEmail } from "@/lib/master-user";

export const Route = createFileRoute("/api/admin/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Obtenção das credenciais administrativas do Supabase
          const supabaseUrl =
            process.env.SUPABASE_URL ||
            process.env.VITE_SUPABASE_URL ||
            "https://tvniawyweymutjiybxyo.supabase.co";

          const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
            getSupabaseServiceRoleKey();

          if (!serviceRoleKey) {
            return new Response(
              JSON.stringify({
                success: false,
                error:
                  "Configuração pendente: A variável SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor. Adicione a chave de serviço no arquivo .env para permitir a redefinição administrativa de senhas.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Inicialização do cliente Supabase Admin com a Service Role Key (bypass de RLS e Supabase Auth Admin API)
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });

          // 2. Extração e validação do token de autenticação do chamador
          const authHeader =
            request.headers.get("Authorization") || request.headers.get("authorization");

          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Não autorizado: Token Bearer ausente no cabeçalho Authorization.",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const token = authHeader.replace(/^Bearer\s+/i, "").trim();

          // 3. Validação da sessão do usuário chamador via Supabase Auth
          const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
          if (callerError || !callerData?.user) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Sessão inválida ou expirada: ${callerError?.message || "Usuário não autenticado."}`,
              }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const callerUser = callerData.user;
          const callerId = callerUser.id;
          const callerEmail = callerUser.email || "";

          // 4. Validação estrita de privilégio Administrador / Master
          let isAdmin = false;

          if (
            isMasterEmail(callerEmail) ||
            callerUser.user_metadata?.role === "MASTER" ||
            callerUser.user_metadata?.is_superadmin === true
          ) {
            isAdmin = true;
          }

          if (!isAdmin) {
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("role, is_superadmin")
              .eq("id", callerId)
              .maybeSingle();

            if (
              prof?.is_superadmin === true ||
              prof?.role === "MASTER" ||
              String(prof?.role).toUpperCase() === "MASTER" ||
              prof?.role === "admin" ||
              prof?.role === "super_admin" ||
              prof?.role === "diretoria"
            ) {
              isAdmin = true;
            }
          }

          if (!isAdmin) {
            const { data: userRole } = await supabaseAdmin
              .from("user_roles")
              .select("role")
              .eq("user_id", callerId)
              .in("role", ["admin", "super_admin"])
              .maybeSingle();

            if (userRole) {
              isAdmin = true;
            }
          }

          if (!isAdmin) {
            return new Response(
              JSON.stringify({
                success: false,
                error:
                  "Acesso negado: apenas Administradores possuem autorização para redefinir senhas de outros usuários.",
              }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            );
          }

          // 5. Validação dos parâmetros recebidos no payload JSON
          let body: any;
          try {
            body = await request.json();
          } catch {
            return new Response(
              JSON.stringify({ success: false, error: "Corpo da requisição JSON inválido." }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const targetUserId = body?.userId || body?.user_id;
          const newPassword = body?.newPassword || body?.password;

          if (!targetUserId || typeof targetUserId !== "string") {
            return new Response(
              JSON.stringify({ success: false, error: "Parâmetro 'userId' é obrigatório." }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "A nova senha deve possuir no mínimo 6 caracteres.",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // 6. Execução do método administrativo Supabase Auth
          const { data: updateData, error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
              password: newPassword,
            });

          if (updateError) {
            return new Response(
              JSON.stringify({
                success: false,
                error: updateError.message || "Falha ao atualizar a senha do usuário no Supabase Auth.",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // 7. Auditoria do evento
          try {
            const { data: targetProfile } = await supabaseAdmin
              .from("profiles")
              .select("email")
              .eq("id", targetUserId)
              .maybeSingle();

            await supabaseAdmin.from("auditoria_acessos").insert({
              actor_id: callerId,
              actor_email: callerEmail,
              acao: "senha_redefinida",
              target_user_id: targetUserId,
              target_email: targetProfile?.email || null,
              detalhes: {
                origem: "api/admin/reset-password",
                timestamp: new Date().toISOString(),
              },
            });
          } catch {
            // Auditoria não bloqueia resposta de sucesso
          }

          return new Response(
            JSON.stringify({
              success: true,
              ok: true,
              message: "Senha redefinida com sucesso.",
              userId: targetUserId,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err?.message || "Erro interno no servidor ao processar a redefinição de senha.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
