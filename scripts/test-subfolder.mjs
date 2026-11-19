async function testSubfolder() {
  const folderId = "13OK1cXbXLgQfLqV-mbQyaTsAMsguoez4"; // TV Cars
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  console.log("Fetching subfolder:", url);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  const html = await res.text();
  console.log("Status:", res.status, "HTML length:", html.length);

  // Search for files in this folder
  // Files typically have aria-label="<filename>" and ssk='...' or data-id='...'
  const fileMatches = [...html.matchAll(/aria-label="([^"]+?)"[^>]*?ssk='([^']+)'/g)];
  console.log("Total aria-labels with ssk:", fileMatches.length);
  for (const m of fileMatches) {
    console.log(`- ${m[1]} (ssk: ${m[2]})`);
  }
}

testSubfolder().catch(console.error);
