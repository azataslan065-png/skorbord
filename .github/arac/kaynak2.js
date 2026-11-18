// Deneme 36: TFF lig sayfalarındaki lig logosu görselleri
(async () => {
  for (const [s, id] of Object.entries({ 'tur.1': 198, 'tur.2': 142, 'tur.3': 976, 'tur.4': 971, 'kupa': 140 })) {
    const r = await fetch('https://www.tff.org/default.aspx?pageID=' + id, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36' } });
    const t = new TextDecoder('windows-1254').decode(Buffer.from(await r.arrayBuffer()));
    const im = [...new Set([...t.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi)].map(m => m[0].replace(/\s+/g, ' ').slice(0, 260)))].filter(x => !/kulup|Kulup|Logo\/\d|haber|Haber/.test(x));
    console.log('TFF', s, r.status, t.length); im.slice(0, 30).forEach(x => console.log('   ', x));
  }
})();
