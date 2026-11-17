const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': 'SkorbordVeri/1.0 (https://github.com/azataslan065-png/skorbord)' }, h || {}) }); const t = await r.text(); let j = null; try{ j = JSON.parse(t); }catch(e){} return { s: r.status, j, t: t.slice(0, 200) }; }catch(e){ return { s: 'HATA ' + e.message }; } };
const sp = async q => al('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { Accept: 'application/sparql-results+json' });
const bek = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const T = 'https://www.thesportsdb.com/api/v1/json/123/';
  for(const id of ['4676', '4675']){ let top = 0, tur = 0; for(let r = 1; r <= 4; r++){ const x = await al(T + 'eventsround.php?id=' + id + '&r=' + r + '&s=2026-2027'); const e = (x.j && x.j.events) || []; top += e.length; if(e.length) tur++; console.log('TSDB round', id, r, x.s, e.length); await bek(2200); }
    const tm = await al(T + 'lookup_all_teams.php?id=' + id); console.log('TSDB takımlar', id, tm.s, ((tm.j && tm.j.teams) || []).length, JSON.stringify(((tm.j && tm.j.teams) || [])[0] || {}).slice(0, 300)); await bek(2200); }
  // ESPN takım kimliği → Wikidata (P13590)
  const tl = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/teams'); const ids = (((tl.j.sports[0] || {}).leagues[0] || {}).teams || []).map(t => t.team.id);
  let q = await sp('SELECT ?e ?c ?cLabel WHERE { VALUES ?e { ' + ids.map(i => '"' + i + '"').join(' ') + ' } ?c wdt:P13590 ?e . SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". } }');
  console.log('P13590 eşleşme', ids.length, '→', ((q.j && q.j.results.bindings) || []).length, JSON.stringify(((q.j && q.j.results.bindings) || []).slice(0, 4).map(b => b.e.value + '=' + b.cLabel.value)));
  for(const lg of ['eng.1', 'ksa.1', 'uefa.nations', 'jpn.1']){ const t2 = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + lg + '/teams'); const i2 = ((((t2.j || {}).sports || [{}])[0].leagues || [{}])[0].teams || []).map(t => t.team.id);
    const q2 = await sp('SELECT (COUNT(?c) AS ?n) WHERE { VALUES ?e { ' + i2.map(i => '"' + i + '"').join(' ') + ' } ?c wdt:P13590 ?e . }'); console.log('P13590', lg, i2.length, '→', q2.j && q2.j.results.bindings[0].n.value); }
  // ESPN oyuncu kimliği → Wikidata (P3681) + fotoğraf
  const ro = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/teams/1895/roster'); const ai = ((ro.j && ro.j.athletes) || []).map(a => a.id);
  q = await sp('SELECT ?e ?p ?img WHERE { VALUES ?e { ' + ai.map(i => '"' + i + '"').join(' ') + ' } ?p wdt:P3681 ?e . OPTIONAL{ ?p wdt:P18 ?img } }');
  const b = (q.j && q.j.results.bindings) || []; console.log('P3681', ai.length, '→ eşleşen', b.length, 'fotoğraflı', b.filter(x => x.img).length);
  console.log('ESPN kadro fotoğraf alanı', JSON.stringify(((ro.j && ro.j.athletes) || []).filter(a => a.headshot).length));
  // kuruluş günü: Türkçe / İngilizce Vikipedi bilgi kutusu
  for(const [w, t] of [['tr', 'Beşiktaş JK'], ['en', 'Beşiktaş J.K.'], ['tr', 'Fenerbahçe SK'], ['en', 'Liverpool F.C.']]){ const r = await al('https://' + w + '.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&section=0&page=' + encodeURIComponent(t)); const wt = (r.j && r.j.parse && r.j.parse.wikitext['*']) || ''; const m = /\|\s*(kuruluş|founded)\s*=\s*([^\n]*)/i.exec(wt); console.log('wiki', w, t, r.s, m ? m[2].slice(0, 120) : 'yok'); }
  // ESPN puan durumu geçmişinin başladığı yıl
  for(const lg of ['tur.1', 'eng.1', 'esp.1']){ let ilk = null; for(let y = 2002; y <= 2016; y++){ const r = await al('https://site.api.espn.com/apis/v2/sports/soccer/' + lg + '/standings?season=' + y); const n = ((((r.j || {}).children || [])[0] || {}).standings || {}).entries; if(n && n.length){ ilk = y; break; } } console.log('ESPN geçmiş başlangıç', lg, ilk); }
})();
