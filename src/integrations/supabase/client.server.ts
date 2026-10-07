import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import * as fs from "node:fs";
import * as path from "node:path";

export function getSupabaseServiceRoleKey(): string | null {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  }

  // Se não estiver em process.env, tenta localizar no .env do projeto em tempo de execução Node
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    try {
      const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "../.env"),
      ];
      for (const envPath of candidates) {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
              const val = trimmed.split("=").slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
              if (val) {
                process.env.SUPABASE_SERVICE_ROLE_KEY = val;
                return val;
              }
            }
          }
        }
      }
    } catch {
      // Ignora erro de acesso ao sistema de arquivos em outros runtimes
    }
  }

  return null;
}

export function hasServiceRoleKey(): boolean {
  const key = getSupabaseServiceRoleKey();
  if (!key) return false;
  try {
    const parts = key.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      return payload?.role === "service_role";
    }
  } catch {}
  return Boolean(key);
}

function createSupabaseAdminClient() {
  const SUPABASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://tvniawyweymutjiybxyo.supabase.co";

  const resolvedServiceRoleKey = getSupabaseServiceRoleKey();
  const SUPABASE_SERVICE_ROLE_KEY =
    resolvedServiceRoleKey ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Configure them in .env`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
// Import like: import { supabaseAdmin } from "@/integrations/supabase/client.server";
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});

