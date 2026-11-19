import fs from "node:fs";

async function inspectScripts() {
  const folderId = "1VkKKdHVhUSVc2_PJEvw5CCtj5LzfiIRg";
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  const scriptTags = [...html.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
  for (const s of scriptTags) {
    if (s[1].length > 10000) {
      // Find files like .pdf, .xlsx, .pptx, or folder names
      const fileMatches = [...s[1].matchAll(/["']([a-zA-Z0-9_-]{25,})["']\s*,\s*["']([^"']+\.(?:pdf|xlsx|xls|pptx|png|jpg|mp4))["']/gi)];
      console.log("File matches in large script:", fileMatches.length);
      for (const fm of fileMatches) {
        console.log(`- [${fm[1]}] ${fm[2]}`);
      }

      // Also check general string tokens
      const genMatches = [...s[1].matchAll(/\[\"([a-zA-Z0-9_-]{25,})\",\[\"([^\"\]]+)\"/g)];
      console.log("General matches:", genMatches.length);
      for (const gm of genMatches.slice(0, 10)) {
        console.log(`- [${gm[1]}] ${gm[2]}`);
      }
    }
  }
}

inspectScripts().catch(console.error);
