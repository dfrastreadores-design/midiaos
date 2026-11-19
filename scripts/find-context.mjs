import fs from "node:fs";

const html = fs.readFileSync("drive_response.html", "utf-8");

const terms = ["Visão", "Rede Mobi", "Jovem Pan", "P.O Mídia", "TV Cars"];
for (const term of terms) {
  const idx = html.indexOf(term);
  if (idx !== -1) {
    console.log(`\n=== Found "${term}" at index ${idx} ===`);
    const start = Math.max(0, idx - 150);
    const end = Math.min(html.length, idx + 250);
    console.log(html.substring(start, end));
  } else {
    console.log(`\n=== Term "${term}" NOT found ===`);
  }
}
