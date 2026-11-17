// Skorbord lig teşhisi: uygulamanın kullandığı ligleri ve ESPN'deki bütün futbol liglerini uygulamanın yaptığı isteklerle dener.
const fs = require('fs');
const S = 'https://site.api.espn.com/apis/site/v2/sports/soccer/', ST = 'https://site.api.espn.com/apis/v2/sports/soccer/';
const al = async u => { for(let i = 0; i < 3; i++){ try{ const r = await fetch(u, { headers:{ 'User-Agent':'Mozilla/5.0' } }); const t = await r.text(); let j = null; try{ j = JSON.parse(t); }catch(e){} return { s:r.status, j, t:t.slice(0, 120) }; }catch(e){ if(i === 2) return { s:'HATA ' + e.message }; } } };
(async () => {
  const src = fs.readFileSync('gercek.js', 'utf8'); const m = /var LIGLER=\[([\s\S]*?)\n\];/.exec(src);
  const bizim = [...m[1].matchAll(/\['([^']+)','([^']+)'/g)].map(x => [x[1], x[2]]);
  const sonuc = [];
  const dene = async (slug) => {
    const sb = await al(S + slug + '/scoreboard'); const lg = sb.j && sb.j.leagues && sb.j.leagues[0] || {}; const sez = lg.season || {};
    const tm = await al(S + slug + '/teams?limit=200'); const tl = (((tm.j || {}).sports || [{}])[0].leagues || [{}])[0].teams || [];
    const sd = await al(ST + slug + '/standings'); const ch = (sd.j && sd.j.children) || [];
    const y1 = sez.startDate ? new Date(sez.startDate).getFullYear() : (sez.year || 0), y2 = sez.endDate ? new Date(sez.endDate).getFullYear() : y1;
    let ev = 0, evSez = 0, d = '';
    for(let y = y1; y && y <= y2; y++){ const r = await al(S + slug + '/scoreboard?dates=' + y + '&limit=1000'); const e = (r.j && r.j.events) || []; ev += e.length; evSez += e.filter(x => !x.season || x.season.year === sez.year).length; d += y + ':' + r.s + ' '; }
    return { slug, ad: lg.name || '', s: sb.s, sezon: sez.year + ' ' + (sez.startDate || '').slice(0, 10) + '→' + (sez.endDate || '').slice(0, 10), bugun: ((sb.j && sb.j.events) || []).length, takim: tl.length, puan: sd.s + ' grup:' + ch.length + ' satır:' + ch.reduce((a, c) => a + (((c.standings || {}).entries || []).length), 0), yillar: d, mac: ev, macSezon: evSez };
  };
  console.log('===== UYGULAMADAKİ LİGLER =====');
  for(const [slug, ad] of bizim){ const r = await dene(slug); r.tr = ad; sonuc.push(r); console.log((r.macSezon ? 'TAMAM ' : 'SORUN ') + JSON.stringify(r)); }
  console.log('\n===== ESPN LİG LİSTESİ =====');
  const lst = await al('https://site.api.espn.com/apis/site/v2/leagues/dropdown?sport=soccer&limit=1000');
  const L = ((lst.j && lst.j.leagues) || []).map(l => (l.slug || '') + ' | ' + (l.name || l.abbreviation || '')).filter(x => x[0] !== ' ');
  console.log('liste', lst.s, L.length); console.log(L.join('\n'));
  fs.writeFileSync('ligler.json', JSON.stringify({ bizim: sonuc, espn: L }, null, 1));
})();
