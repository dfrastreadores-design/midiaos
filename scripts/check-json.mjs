import fs from "node:fs";

async function checkJson() {
  const folderId = "1VkKKdHVhUSVc2_PJEvw5CCtj5LzfiIRg";
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  console.log("HTML length:", html.length);
  // Look for any string or filename
  const scriptTags = [...html.matchAll(/<script[^>]*>(.*?)<\/script>/gs)];
  console.log("Script tags:", scriptTags.length);
  for (const s of scriptTags) {
    if (s[1].includes("Visão") || s[1].includes("pdf") || s[1].includes("xlsx") || s[1].includes("item")) {
      console.log("Script matching, length:", s[1].length);
    }
  }
}

checkJson().catch(console.error);
