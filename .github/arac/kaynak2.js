// Deneme: Süper Kupa finali sayfasındaki maç kutusu
(async () => {
  const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' + encodeURIComponent('2025 Turkish Super Cup final'), { headers: { 'User-Agent': 'SkorbordVeri/1.0' } });
  const j = await r.json(); const wt = j.parse.wikitext['*']; const i = wt.search(/\{\{\s*Football ?box/i);
  console.log('BAŞLIKLAR', (wt.match(/^={2,4}[^=\n]+={2,4}\s*$/gm) || []).join(' | ')); console.log('KUTU', wt.slice(i, i + 1400));
})();
