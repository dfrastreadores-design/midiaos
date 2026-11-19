import fs from "node:fs";

function getEnv() {
  const content = fs.readFileSync(".env.staging", "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[trimmed.slice(0, eq).trim()] = v;
    }
  }
  return env;
}

const env = getEnv();
const url = env.SUPABASE_STAGING_URL;
const key = env.SUPABASE_STAGING_SERVICE_ROLE_KEY;

async function testEndpoints() {
  const paths = ["/pg/query", "/rest/v1/rpc/exec_sql", "/rest/v1/rpc/sql", "/pg", "/sql"];
  for (const p of paths) {
    try {
      const res = await fetch(`${url}${p}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: "SELECT 1;" })
      });
      console.log(`${p}: ${res.status}`);
      if (res.status !== 404) {
        console.log(await res.text());
      }
    } catch (e) {
      console.log(`${p}: Error ${e.message}`);
    }
  }
}

testEndpoints();

