async function checkHostingerJS() {
  const res = await fetch('https://midiaos.online');
  const text = await res.text();
  const scriptMatches = text.match(/src="(\/assets\/[^"]+)"/g);
  console.log('Scripts:', scriptMatches);
  if (scriptMatches && scriptMatches[0]) {
    const src = scriptMatches[0].replace('src="', '').replace('"', '');
    const js = await (await fetch('https://midiaos.online' + src)).text();
    const hasTvnia = js.includes('tvniawyweymutjiybxyo');
    const hasOdgow = js.includes('odgowgvhjhvpeazglsly');
    console.log('Points to tvniawyweymutjiybxyo:', hasTvnia, 'Points to odgow:', hasOdgow);
  }
}
checkHostingerJS();
