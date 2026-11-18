// Deneme: Vikipedi kupa sayfalarının yapısı ve FIFA'nın en yeni sıralama kimliği
const al = async (u, metin) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'SkorbordVeri/1.0 (github.com/azataslan065-png/skorbord)' } }); if(!r.ok) return null; return metin ? r.text() : r.json(); }catch(e){ return null; } };
(async () => {
  for(const b of ['2026 Turkish Super Cup', '2027 Turkish Super Cup', '2025 Turkish Super Cup', '2026–27 Turkish Cup']){
    const j = await al('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' + encodeURIComponent(b));
    const wt = (j && j.parse && j.parse.wikitext && j.parse.wikitext['*']) || '';
    console.log('=====', b, wt.length);
    console.log((wt.match(/^={2,4}[^=\n]+={2,4}\s*$/gm) || []).join(' | '));
    const i = wt.search(/\{\{\s*Football ?box/i); if(i >= 0) console.log(wt.slice(i, i + 1500));
    console.log('referee alanları:', (wt.match(/\|\s*referee\s*=\s*[^\n|]*/g) || []).slice(0, 8).join(' ; '));
  }
  const tr = await al('https://tr.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' + encodeURIComponent('2026-27 Türkiye Kupası'));
  const tw = (tr && tr.parse && tr.parse.wikitext && tr.parse.wikitext['*']) || ''; console.log('===== TR kupa', tw.length, (tw.match(/hakem\s*=\s*[^\n|]*/gi) || []).slice(0, 8).join(' ; '));
  const tr2 = await al('https://tr.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' + encodeURIComponent('2026 Turkcell Süper Kupa'));
  const tw2 = (tr2 && tr2.parse && tr2.parse.wikitext && tr2.parse.wikitext['*']) || ''; console.log('===== TR süper', tw2.length, tw2.slice(0, 1200));
  // FIFA: kimliksiz çağrı ve daha yüksek kimlikler
  const f0 = await al('https://inside.fifa.com/api/ranking-overview?locale=en'); console.log('FIFA kimliksiz', f0 && f0.rankings && f0.rankings.length, f0 && f0.rankings && f0.rankings[0] && f0.rankings[0].lastUpdateDate);
  for(const k of [15175, 15200, 15250, 15300, 15350, 15400, 15500, 15600, 15700, 15800, 16000]){ const f = await al('https://inside.fifa.com/api/ranking-overview?locale=en&dateId=id' + k); console.log('id' + k, f && f.rankings ? f.rankings.length + ' ' + (f.rankings[0] && f.rankings[0].lastUpdateDate) : '-'); }
  const sy = await al('https://inside.fifa.com/fifa-world-ranking/men', true); const ids = [...new Set(String(sy || '').match(/id1\d{4}/g) || [])]; console.log('sayfa kimlikleri', ids.slice(0, 5), ids.length, sy ? sy.length : 0);
  const m2 = String(sy || '').match(/"dateId"\s*:\s*"[^"]+"/g); console.log('dateId', (m2 || []).slice(0, 5));
  const m3 = String(sy || '').match(/lastUpdate[^,]{0,80}/g); console.log('lastUpdate', (m3 || []).slice(0, 3));
})();
