import fs from "fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  }
}

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://tvniawyweymutjiybxyo.supabase.co";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const NEXO_TENANT_ID = "02a5892c-1e6f-4452-89b0-3c4e8f3d3132";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
