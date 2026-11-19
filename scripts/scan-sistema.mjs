import fs from "node:fs";

const midiaKitSistemaFolders = [
  { name: "Ab_Comunicação_Visual", id: "1ChoiRKu9oMj4WTZvbYMRKkL5MTW3aeKw" },
  { name: "Art_Midia", id: "1tKNqhbDeyiZlrrHoOaEQXkR4fXzKACby" },
  { name: "Asa_Branca", id: "1rMeVabUIZNEZ4hR5-riwUmoyFQ4E70oS" },
  { name: "Autooh", id: "10wMlgsF2oeE7TSbZr0IlRaaFRnLJ4uHR" },
  { name: "Cerrado_Mix", id: "1FFn8NgLrSS2-HsBg7yFyxpIFl3p4Jsgz" },
  { name: "Cerradus", id: "1SbeLpzHXXVlim-yN_dYA1HH0SyluVzVk" },
  { name: "Eagle Publicity", id: "1RYrxipEZeyO2gO-PCa6pm_8FAtl5on4k" },
  { name: "JK_FM", id: "1_7aPH6VpBt_eZ4dmhtqnO3VbfBmD36J4" },
  { name: "Megavi", id: "1HS25A-euulZVljJV5n1v711M3D6lSuS-" },
  { name: "MiX_Fm", id: "1cws_N6B7_zKqFixxEmhEeqIxgbz_NUj0" },
  { name: "P.O Midia", id: "1XMoYddEfGA3ZDWJzmsqhTR-6WpMSisNB" },
  { name: "Projetos Especiais parceiros", id: "1wBcecbRLuw9In9kK_n8oWHL__KGj6i5O" },
  { name: "TV Cars", id: "1-LXmVNUOdcx5pHZnl7GEME_7uDSmPzwX" },
  { name: "Visão_Paineis", id: "1K9joRx8UE4K_5Bin5HFog2wfOpSX0RWZ" },
  { name: "WMidia", id: "19nz4iZpguzSCFYvzWnRCuF54hSkiLtGk" },
];

async function scanSistema() {
  for (const sf of midiaKitSistemaFolders) {
    const url = `https://drive.google.com/drive/folders/${sf.id}`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await res.text();
      const items = [];
      const ariaMatches = [...html.matchAll(/aria-label="([^"]+?)"[^>]*?ssk='5:auSv138:([a-zA-Z0-9_-]+)-0-16'/g)];
      for (const m of ariaMatches) {
        items.push({ label: m[1], fileId: m[2] });
      }
      console.log(`📁 ${sf.name} -> ${items.length} items:`);
      for (const it of items) {
        console.log(`   📄 ${it.label} (${it.fileId})`);
      }
    } catch (e) {
      console.error(sf.name, e.message);
    }
  }
}

scanSistema().catch(console.error);
