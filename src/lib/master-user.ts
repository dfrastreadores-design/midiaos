export const MASTER_GLOBAL_EMAIL = "rafaelrodrigo.as@gmail.com";

export const MASTER_EMAILS = new Set([
  MASTER_GLOBAL_EMAIL,
]);

/**
 * Retorna true EXCLUSIVAMENTE para o proprietário / Master Global da plataforma.
 * Administradores de tenant (como rafaelnexomidia@gmail.com da NEXO) são Master da Empresa e NÃO Master Global.
 */
export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return MASTER_EMAILS.has(email.toLowerCase().trim());
}

export const NEXO_ADMIN_EMAIL = "rafaelnexomidia@gmail.com";

/**
 * Retorna true se o e-mail pertencer ao administrador do tenant NEXO
 */
export function isNexoAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === NEXO_ADMIN_EMAIL;
}

