import fs from "node:fs";

const html = fs.readFileSync("drive_response.html", "utf-8");

const matches = [...html.matchAll(/aria-label="([^"]+?)\s+Shared folder"[^>]*?ssk='([^']+)'/g)];
for (const m of matches) {
  console.log("Name:", m[1]);
  console.log("Full ssk:", m[2]);
}
