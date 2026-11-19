import fs from "node:fs";

const subfolders = [
  { name: "Asa Branca - Toninho POP e Juliana", id: "19tzmPpCZNB-Swv-dOtlADJUaYWasolOU" },
  { name: "Cerradus Guilherme", id: "1QAiD1ky4aWdmgHEdx-BuorHzBGcgpMNs" },
  { name: "Eagle Publi - Fred e Mariana", id: "1AUzmAWZWIuLQQujsmG8iODQqYngOo3Hn" },
  { name: "JK, Mix e alfa - Wandersson", id: "1fjI6ycgcW0thLf5JbcNyHvJaVGWfL5CK" },
  { name: "Jovem Pan - Marcos", id: "13M2W7yn2Hy8CVY5GBw7fDbx26MTQRbZI" },
  { name: "Megavi - Artmidia - Wmidia - @Radar Aguas Claras ( Todi)", id: "1IRhaKmQWkG6GPQ1FAmmE_wiSl1j-9kbs" },
  { name: "Midia Kit Sistema", id: "1Euqt0lnX88v-HVFQ4docUTpU8Hyxal5r" },
  { name: "P.O - Midia - Leão", id: "1kxvW7EN9yn1CwrbQVfQihLYWcbJJNvr4" },
  { name: "Rede Mobi TV- Marcos", id: "1WEDNfJf2wizJ6o84TFNtgAjYiIxsPpMP" },
  { name: "TV Cars - Marco", id: "13OK1cXbXLgQfLqV-mbQyaTsAMsguoez4" },
  { name: "Visão Paineis - Raimundo", id: "1VkKKdHVhUSVc2_PJEvw5CCtj5LzfiIRg" },
];

async function scanAll() {
  const results = [];
  for (const sf of subfolders) {
    const url = `https://drive.google.com/drive/folders/${sf.id}`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await res.text();
      // Look for files or sub-items
      // In TV Cars we saw: aria-label="<filename> PDF Shared" ssk='5:auSv138:<file_id>-0-16'
      const items = [];
      const ariaMatches = [...html.matchAll(/aria-label="([^"]+?)"[^>]*?ssk='5:auSv138:([a-zA-Z0-9_-]+)-0-16'/g)];
      for (const m of ariaMatches) {
        items.push({ label: m[1], fileId: m[2] });
      }
      
      // Also look for any other ssk='5:auSv138:<file_id>-0-16'
      const allFileMatches = [...html.matchAll(/ssk='5:auSv138:([a-zA-Z0-9_-]{25,})-0-16'/g)];
      
      console.log(`📁 ${sf.name} -> ${items.length} items with label, ${allFileMatches.length} total file IDs`);
      for (const it of items) {
        console.log(`   📄 ${it.label} (${it.fileId})`);
      }

      results.push({
        folder: sf,
        items,
        totalFileIds: allFileMatches.length,
      });
    } catch (err) {
      console.error(`Error scanning ${sf.name}:`, err.message);
    }
  }
}

scanAll().catch(console.error);
