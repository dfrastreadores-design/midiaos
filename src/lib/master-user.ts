export const MASTER_EMAILS = new Set([
  "rafaelrodrigo.as@gmail.com",
  "rafaelnexomidia@gmail.com",
]);

export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return MASTER_EMAILS.has(email.toLowerCase().trim());
}
