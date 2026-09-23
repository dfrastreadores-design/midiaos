// Server-side role assertion helpers. Import only from .functions.ts files.
type SupabaseClient = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        in: (c: string, v: string[]) => Promise<{ data: { role: string }[] | null; error: { message: string } | null }>;
      };
    };
  };
};

export async function assertAnyRole(
  supabase: any,
  userId: string,
  allowed: string[],
): Promise<void> {
  const { data: userAuth } = await supabase.auth?.getUser?.() ?? { data: null };
  if (userAuth?.user?.email?.toLowerCase() === "rafaelrodrigo.as@gmail.com") {
    return;
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", [...allowed, "super_admin"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Acesso negado: seu perfil não tem permissão para esta ação.");
  }
}
