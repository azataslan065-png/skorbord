// Deneme 52: YouTube kanal kimlikleri (TVF Voleybol TV, TBF TV, FIBA, EuroLeague Women, Basketball Champions League, CEV)
(async () => {
  if (process.env.PARCA !== '0') return;
  for (const q of ['TVF Voleybol TV', 'TBF TV basketbol', 'FIBA', 'EuroLeague Women', 'Basketball Champions League', 'Volleyball World', 'CEV European Volleyball', 'Euroleague Basketball', 'FIBA Europe Cup']) {
    const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=EgIQAg%253D%253D', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr' } });
    const t = await r.text();
    const ch = [...t.matchAll(/"channelRenderer":\{"channelId":"(UC[\w-]{22})"[\s\S]{0,400}?"title":\{"simpleText":"([^"]+)"[\s\S]{0,1200}?"canonicalBaseUrl":"\/(@[^"]+)"/g)].slice(0, 4).map(m => m[2] + ' ' + m[1] + ' ' + m[3]);
    console.log('YT', q, '→', ch.join(' | '));
  }
})();
