async function testDownload() {
  const fileId = "18QJFkhMqKsaUWTxZNf16BkpXpzpVEGql"; // Tabela com desconto para 30 dias.xlsx
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  console.log("Testing download from:", url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
    },
    redirect: "follow",
  });
  console.log("Status:", res.status, "Content-Type:", res.headers.get("content-type"));
  const buf = await res.arrayBuffer();
  console.log("Downloaded bytes:", buf.byteLength);
}

testDownload().catch(console.error);
