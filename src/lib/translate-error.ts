// Tradução centralizada de mensagens de erro (Supabase Auth, PostgREST, rede)
// para pt-BR. Use translateError(err) em qualquer toast/alerta.

const MAP: Array<{ test: RegExp; pt: string }> = [
  // Auth
  {
    test: /invalid login|invalid credentials|invalid email or password/i,
    pt: "E-mail ou senha incorretos.",
  },
  {
    test: /email not confirmed/i,
    pt: "E-mail ainda não confirmado. Verifique sua caixa de entrada.",
  },
  {
    test: /user is banned|user.*banned/i,
    pt: "Usuário bloqueado. Entre em contato com o administrador.",
  },
  { test: /user not found/i, pt: "Usuário não encontrado." },
  { test: /user already registered|already registered/i, pt: "Este e-mail já está cadastrado." },
  {
    test: /email rate limit|too many requests|rate limit/i,
    pt: "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
  },
  { test: /password should be at least/i, pt: "A senha deve ter pelo menos 6 caracteres." },
  {
    test: /weak password|password.*pwned|compromised/i,
    pt: "Senha muito fraca ou já vazada. Escolha outra.",
  },
  { test: /signups? (not allowed|disabled)/i, pt: "Cadastros desativados no momento." },
  { test: /jwt expired|token.*expired/i, pt: "Sessão expirada. Faça login novamente." },
  {
    test: /unauthorized|not authenticated|no authorization/i,
    pt: "Não autorizado. Faça login novamente.",
  },
  {
    test: /forbidden|permission denied|insufficient/i,
    pt: "Você não tem permissão para esta ação.",
  },
  { test: /unsupported provider/i, pt: "Provedor de login não habilitado." },
  // Rede
  {
    test: /failed to fetch|networkerror|network request failed|load failed/i,
    pt: "Falha de conexão. Verifique sua internet.",
  },
  { test: /timeout|timed out/i, pt: "Tempo de resposta esgotado. Tente novamente." },
  // PostgREST / DB
  { test: /duplicate key|already exists|unique constraint/i, pt: "Registro duplicado." },
  {
    test: /violates foreign key/i,
    pt: "Existe um vínculo com outro registro que impede esta operação.",
  },
  { test: /violates not-null/i, pt: "Preencha todos os campos obrigatórios." },
  { test: /row-level security|new row violates/i, pt: "Sem permissão para gravar este registro." },
  { test: /not found/i, pt: "Registro não encontrado." },
];

export function translateError(err: unknown, fallback = "Ocorreu um erro inesperado."): string {
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : ((err as { message?: string })?.message ?? "");
  if (!raw) return fallback;
  for (const { test, pt } of MAP) if (test.test(raw)) return pt;
  return raw;
}
