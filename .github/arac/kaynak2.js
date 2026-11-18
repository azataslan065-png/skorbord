const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': 'SkorbordVeri/1.0 (github.com/azataslan065-png/skorbord)', 'Accept': 'application/json' }, h || {}) }); const t = await r.text(); let j = null; try{ j = JSON.parse(t); }catch(e){} return { s: r.status, j, t: t.slice(0, 400) }; }catch(e){ return { s: 'HATA ' + e.message }; } };
const bek = ms => new Promise(z => setTimeout(z, ms));
const sp = async q => al('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { Accept: 'application/sparql-results+json' });
(async () => {
  const T = 'https://www.thesportsdb.com/api/v1/json/123/';
  let r = await al(T + 'eventsround.php?id=4339&r=10&s=2026-2027'); const e = (r.j && r.j.events) || []; console.log('TSDB SL tur', r.s, e.length, e[0] ? Object.keys(e[0]).join(',') : r.t.slice(0, 80)); if(e[0]) console.log('  hakem alanı', e.map(x => x.strOfficial || x.strReferee || '').join(' | '));
  await bek(2500);
  const lig = {};
  for(const tid of ['133690', '134370', '134386', '133929']){ const x = await al(T + 'eventslast.php?id=' + tid); ((x.j && x.j.results) || []).forEach(ev => { lig[ev.idLeague] = ev.strLeague; }); const n = await al(T + 'eventsnext.php?id=' + tid); ((n.j && n.j.events) || []).forEach(ev => { lig[ev.idLeague] = ev.strLeague; }); await bek(4500); }
  console.log('TSDB takım ligleri', JSON.stringify(lig));
  // Wikidata FIFA sıralaması (P1352 sıralama, P459 belirleme yöntemi)
  let q = await sp('SELECT ?m ?mLabel (COUNT(*) AS ?n) WHERE { ?t wdt:P31 wd:Q6979593 ; p:P1352 ?st . ?st pq:P459 ?m . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?m ?mLabel ORDER BY DESC(?n) LIMIT 5');
  console.log('WD sıralama yöntemleri', JSON.stringify(((q.j && q.j.results.bindings) || []).map(b => b.m.value.split('/').pop() + ' ' + b.mLabel.value + ' ' + b.n.value)));
  q = await sp('SELECT ?tLabel ?r ?d WHERE { VALUES ?t { wd:Q42267 wd:Q483856 } ?t p:P1352 ?st . ?st ps:P1352 ?r ; pq:P585 ?d . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(?d) LIMIT 4');
  console.log('WD İspanya/Türkiye son sıralama', JSON.stringify(((q.j && q.j.results.bindings) || []).map(b => b.tLabel.value + ' ' + b.r.value + ' ' + b.d.value.slice(0, 10))));
  // FIFA: sıralama tarihleri
  for(const u of ['https://inside.fifa.com/api/ranking-overview?locale=en&dateId=id14800', 'https://inside.fifa.com/api/rankings/dates?locale=en', 'https://inside.fifa.com/fifa-world-ranking/men']){ const x = await al(u); console.log('FIFA', u.slice(25, 90), x.s, x.t.slice(0, 200).replace(/\s+/g, ' ')); }
  // Vikipedi: Türkiye Kupası maç kutuları
  for(const [w, t] of [['en', '2026–27 Turkish Cup'], ['tr', '2026-27 Türkiye Kupası'], ['en', '2026 Turkish Super Cup'], ['tr', '2026 TFF Süper Kupa']]){
    const x = await al('https://' + w + '.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' + encodeURIComponent(t)); const wt = (x.j && x.j.parse && x.j.parse.wikitext['*']) || '';
    const kutu = (wt.match(/\{\{\s*(Football box|Futbol kutusu|Footballbox)[^]*?\n\}\}/gi) || []); console.log('VİKİ', w, t, x.s, 'uzunluk', wt.length, 'kutu', kutu.length, kutu[0] ? kutu[0].slice(0, 400).replace(/\n/g, ' ¶ ') : '');
  }
})();
