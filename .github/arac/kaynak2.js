// Deneme 32: ESPN puan durumu bölge notları (lig başına) + Wikidata lig logoları (P154)
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'SkorbordBot/1.0 (github.com skorbord)' }, signal: AbortSignal.timeout(30000) }); return await r.json(); }catch(e){ return null; } };
const fs = require('fs');
(async () => {
  const src = fs.readFileSync('gercek.js', 'utf8'); const m = /var LIGLER=\[([\s\S]*?)\n\];/.exec(src);
  const L = [...m[1].matchAll(/\['([^']+)','([^']+)','[^']*'(?:,'([^']+)')?\]/g)].map(x => [x[1], x[2], x[3] || '']);
  for (const [s, ad, t] of L) {
    if (t) { console.log('NOT', s, 'kaynak', t); continue; }
    const j = await al('https://site.api.espn.com/apis/v2/sports/soccer/' + s + '/standings');
    const gr = (j && j.children) || []; let out = [];
    if (gr.length === 1) { const en = (gr[0].standings && gr[0].standings.entries) || []; const say = en.length; const nn = {}; en.forEach(e => { const d = e.note && e.note.description; if (d) nn[d] = (nn[d] || 0) + 1; }); out = [say, JSON.stringify(nn)]; } else out = ['grup', gr.length];
    console.log('NOT', s, ad, out.join(' '), '| logo', j && j.logos ? 'var' : '');
  }
  // Wikidata: lig adları → P154 logo
  const W = { 'tur.1': 'Süper Lig', 'tur.2': 'TFF 1. Lig', 'tur.3': 'TFF 2. Lig', 'tur.4': 'TFF 3. Lig', 'tur.cup': 'Turkish Cup', 'tur.super': 'Turkish Super Cup', 'uefa.champions': 'UEFA Champions League', 'eng.1': 'Premier League', 'esp.1': 'La Liga', 'ger.1': 'Bundesliga', 'ita.1': 'Serie A', 'fra.1': 'Ligue 1' };
  for (const [s, t] of Object.entries(W)) {
    const j = await al('https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=' + encodeURIComponent(t) + '&props=claims&format=json');
    const e = j && j.entities && Object.values(j.entities)[0]; const c = e && e.claims && e.claims.P154;
    console.log('LOGO', s, e && e.id, c ? c.map(x => (x.mainsnak.datavalue || {}).value + (x.qualifiers && x.qualifiers.P580 ? ' başlangıç ' + JSON.stringify(x.qualifiers.P580[0].datavalue.value.time) : '') + (x.qualifiers && x.qualifiers.P582 ? ' bitiş ' + x.qualifiers.P582[0].datavalue.value.time : '') + ' ' + x.rank).join(' || ') : 'yok');
  }
})();
