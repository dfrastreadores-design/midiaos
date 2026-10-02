/**
 * Tradutor centralizado de mensagens de erro do sistema e Supabase / PostgREST para Português (Brasil).
 * Garante que nenhuma notificação técnica em inglês seja exibida aos usuários finais.
 */

export function traduzirErro(erro: unknown): string {
  if (!erro) return "Ocorreu um erro inesperado. Tente novamente.";

  let msg = "";
  if (typeof erro === "string") {
    msg = erro;
  } else if (erro instanceof Error) {
    msg = erro.message;
  } else if (typeof erro === "object" && "message" in erro && typeof (erro as any).message === "string") {
    msg = (erro as any).message;
  } else {
    msg = String(erro);
  }

  const raw = msg.trim();
  const lower = raw.toLowerCase();

  // 1. Tabela ou coluna não encontrada no schema cache do Supabase / PostgREST
  if (lower.includes("could not find the table") && lower.includes("schema cache")) {
    const match = raw.match(/table\s+['"]?([^'"]+)['"]?/i);
    const table = match ? match[1] : "solicitada";
    if (table.includes("parceiros")) {
      return "A tabela de Parceiros de Mídia ainda não está criada no banco de dados Supabase. Execute o script de migração no painel do Supabase.";
    }
    return `A tabela (${table}) não foi encontrada no banco de dados. Atualize o esquema do sistema.`;
  }

  if (lower.includes("could not find the") && lower.includes("column") && lower.includes("schema cache")) {
    const matchCol = raw.match(/['"]([^'"]+)['"]\s+column/i);
    const col = matchCol ? matchCol[1] : "especificada";
    return `A coluna '${col}' ainda não foi sincronizada no banco de dados. Recarregue o cache do Supabase.`;
  }

  // 2. Chave única / duplicidade
  if (lower.includes("duplicate key") || lower.includes("already exists") || lower.includes("unique constraint")) {
    if (lower.includes("cnpj")) {
      return "Já existe um cadastro com este mesmo CNPJ.";
    }
    if (lower.includes("email")) {
      return "Já existe um usuário ou cadastro com este mesmo e-mail.";
    }
    return "Já existe um registro idêntico cadastrado no sistema (duplicidade detectada).";
  }

  // 3. Chave estrangeira / vínculos
  if (lower.includes("foreign key") || lower.includes("violates foreign key constraint")) {
    return "Não foi possível concluir a ação pois este registro possui vínculos obrigatórios em outros cadastros.";
  }

  // 4. Autenticação e Sessão
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "E-mail ou senha incorretos. Verifique suas credenciais.";
  }
  if (lower.includes("jwt expired") || lower.includes("token is expired") || lower.includes("invalid token")) {
    return "Sua sessão de acesso expirou. Por favor, faça login novamente.";
  }
  if (lower.includes("not authorized") || lower.includes("unauthorized") || lower.includes("permission denied")) {
    return "Você não tem permissão para realizar esta operação. Solicite liberação ao administrador.";
  }
  if (lower.includes("user not found")) {
    return "Usuário não localizado no sistema.";
  }

  // 5. Erros internos de script
  if (lower.includes("useserverfn is not defined")) {
    return "Erro interno de inicialização corrigido. Por favor, recarregue a página (F5).";
  }
  if (lower.includes("network error") || lower.includes("failed to fetch")) {
    return "Falha de conexão com o servidor. Verifique sua conexão com a internet e tente novamente.";
  }

  // 6. RLS (Row Level Security)
  if (lower.includes("row-level security") || lower.includes("rls")) {
    return "Acesso restrito pelas políticas de segurança da empresa. Verifique suas permissões.";
  }

  // 7. Retorna a mensagem original se já estiver em português ou não tiver padrão inglês identificado
  return raw;
}
