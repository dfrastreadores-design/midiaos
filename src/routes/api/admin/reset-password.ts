import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey } from "@/integrations/supabase/client.server";
import { isMasterEmail } from "@/lib/master-user";

export const Route = createFileRoute("/api/admin/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Obtenção das credenciais do Supabase
          const supabaseUrl =
            process.env.SUPABASE_URL ||
            process.env.VITE_SUPABASE_URL ||
            "https://tvniawyweymutjiybxyo.supabase.co";

          const anonKey =
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ";

          const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
            getSupabaseServiceRoleKey();

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

          // 3. Validação da sessão do usuário chamador via cliente com seu próprio token
          const callerClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
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
            const { data: prof } = await callerClient
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
            const { data: userRole } = await callerClient
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

          // Obter dados do usuário alvo para e-mail/notificação
          let targetEmail = "";
          try {
            const { data: targetProfile } = await callerClient
              .from("profiles")
              .select("email")
              .eq("id", targetUserId)
              .maybeSingle();
            if (targetProfile?.email) {
              targetEmail = targetProfile.email;
            }
          } catch {}

          let resetSuccess = false;
          let successMessage = "Senha redefinida com sucesso.";

          // 6. Estratégia A: Caso haja serviceRoleKey, usa a API Auth Admin
          if (serviceRoleKey) {
            try {
              const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false },
              });
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
                password: newPassword,
              });
              if (!updateError) {
                resetSuccess = true;
              }
            } catch {}
          }

          // 6. Estratégia B: RPC segura no banco de dados com SECURITY DEFINER
          if (!resetSuccess) {
            try {
              const { data: rpcRes, error: rpcErr } = await callerClient.rpc(
                "admin_reset_user_password" as any,
                {
                  target_user_id: targetUserId,
                  new_plain_password: newPassword,
                },
              );
              if (!rpcErr && (rpcRes as any)?.success) {
                resetSuccess = true;
              }
            } catch {}
          }

          // 6. Estratégia C: Envio de link de recuperação por e-mail pelo Supabase Auth
          if (!resetSuccess && targetEmail) {
            try {
              const { error: resetMailError } = await callerClient.auth.resetPasswordForEmail(targetEmail, {
                redirectTo: `${request.headers.get("origin") || "https://midiaos.online"}/minha-conta`,
              });
              if (!resetMailError) {
                resetSuccess = true;
                successMessage = `Como a alteração direta requer autorização elevada, enviamos um link seguro de redefinição para o e-mail de ${targetEmail}.`;
              }
            } catch {}
          }

          if (!resetSuccess) {
            return new Response(
              JSON.stringify({
                success: false,
                error:
                  "Não foi possível redefinir a senha diretamente. Solicite ao suporte a sincronização da chave SUPABASE_SERVICE_ROLE_KEY no ambiente.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // 7. Auditoria do evento
          try {
            await callerClient.from("auditoria_acessos").insert({
              actor_id: callerId,
              actor_email: callerEmail,
              acao: "senha_redefinida",
              target_user_id: targetUserId,
              target_email: targetEmail || null,
              detalhes: {
                origem: "api/admin/reset-password",
                timestamp: new Date().toISOString(),
              },
            });
          } catch {}

          return new Response(
            JSON.stringify({
              success: true,
              ok: true,
              message: successMessage,
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
