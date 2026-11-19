import fs from "node:fs";

async function main() {
  const folderId = "1rXOF91CjzGnt7jltxbBE87Z6hk06tjHS";
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  console.log("Fetching:", url);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  const html = await res.text();
  console.log("Status:", res.status, "HTML length:", html.length);
  fs.writeFileSync("drive_response.html", html);

  // Look for keywords mentioned by user: "Visão Painéis", "Rede Mobi TV", "Jovem Pan", "P.O Mídia", "TV Cars"
  const keywords = ["Visão", "Mobi", "Jovem Pan", "P.O", "TV Cars", "Cerrado", "Megavi", "ART"];
  for (const kw of keywords) {
    const found = html.includes(kw);
    console.log(`Keyword "${kw}": ${found}`);
  }
}

main().catch(console.error);
