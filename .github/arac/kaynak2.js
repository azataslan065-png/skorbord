// Deneme 20: tarihi okunamayan TFF maç sayfası (318962)
(async () => {
  for(const id of ['318962', '318965']){
    const r = await fetch('https://www.tff.org/Default.aspx?pageID=29&macID=' + id, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' } });
    const t = new TextDecoder('windows-1254').decode(Buffer.from(await r.arrayBuffer())); const d = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const i = d.indexOf('Maç Kodu'); console.log('=====', id, r.status, t.length, i, d.slice(Math.max(0, i - 400), i + 600));
    const j = t.indexOf('lblTarih'); console.log('HAM', t.slice(Math.max(0, j - 300), j + 600).replace(/\s+/g, ' '));
  }
})();
