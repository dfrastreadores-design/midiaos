import { supabase } from "./db.mjs";

async function main() {
  const { data, error } = await supabase.from("produtos").select("*").limit(2);
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Columns of produtos:", Object.keys(data[0]));
  console.log("Row 0:", data[0]);
  console.log("Row 1:", data[1]);
}

main().catch(console.error);
