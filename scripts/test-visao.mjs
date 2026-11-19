async function testVisao() {
  const folderId = "1VkKKdHVhUSVc2_PJEvw5CCtj5LzfiIRg";
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  const fileMatches = [...html.matchAll(/aria-label="([^"]+?)"[^>]*?ssk='([^']+)'/g)];
  for (const m of fileMatches) {
    if (m[1].includes(".") || m[1].toLowerCase().includes("shared") || m[1].includes("PDF") || m[1].includes("Sheet")) {
      console.log(`- ${m[1]} (ssk: ${m[2]})`);
    }
  }
}

testVisao().catch(console.error);
