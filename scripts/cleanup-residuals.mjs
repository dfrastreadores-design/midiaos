import { supabase } from "./db.mjs";

async function cleanupResiduals() {
  // Merge residual Rede Mobi TV
  await supabase.from("produtos").update({ parceiro_id: "bb8c3580-035f-4a80-8d1d-ec874df9731a", partner_id: "bb8c3580-035f-4a80-8d1d-ec874df9731a" }).eq("parceiro_id", "dfdcac91-06a9-4fb2-8829-05dae53ae414");
  await supabase.from("parceiros").delete().eq("id", "dfdcac91-06a9-4fb2-8829-05dae53ae414");

  // Delete any other test parceiros
  const { data: tests } = await supabase.from("parceiros").select("id").ilike("razao_social", "%[TESTE%");
  if (tests && tests.length > 0) {
    await supabase.from("parceiros").delete().in("id", tests.map(t => t.id));
  }
  console.log("Residual cleanup complete.");
}

cleanupResiduals().catch(console.error);
