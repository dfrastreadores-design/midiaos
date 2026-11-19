async function testVisaoAll() {
  const folderId = "1VkKKdHVhUSVc2_PJEvw5CCtj5LzfiIRg";
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  const fileMatches = [...html.matchAll(/aria-label="([^"]+?)"/g)];
  console.log("Total aria-labels:", fileMatches.length);
  fileMatches.slice(0, 30).forEach(m => console.log(m[1]));
}

testVisaoAll().catch(console.error);
