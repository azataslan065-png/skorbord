// Ek kaynak denemesi: ESPN'de olmayan ligler (TFF 1. Lig, İsviçre) için ücretsiz kaynaklar; ESPN geçmiş sezonlar; Wikidata kulüp / kupa / oyuncu fotoğrafı.
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': 'SkorbordVeri/1.0 (https://github.com/azataslan065-png/skorbord)' }, h || {}) }); const t = await r.text(); let j = null; try{ j = JSON.parse(t); }catch(e){} return { s: r.status, j, t: t.slice(0, 200), cors: r.headers.get('access-control-allow-origin') }; }catch(e){ return { s: 'HATA ' + e.message }; } };
const sp = async q => al('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { Accept: 'application/sparql-results+json' });
(async () => {
  const T = 'https://www.thesportsdb.com/api/v1/json/123/';
  for(const c of ['Turkey', 'Switzerland']){ const r = await al(T + 'search_all_leagues.php?c=' + c + '&s=Soccer'); console.log('TSDB ligler', c, r.s, ((r.j && (r.j.countries || r.j.countrys)) || []).map(l => l.idLeague + ':' + l.strLeague + ':' + l.strCurrentSeason).join(' | ')); }
  for(const id of ['4676', '4675', '4339']){ for(const s of ['2026-2027', '2025-2026']){ const r = await al(T + 'eventsseason.php?id=' + id + '&s=' + s); const e = (r.j && r.j.events) || []; console.log('TSDB eventsseason', id, s, r.s, 'adet', e.length, e[0] ? JSON.stringify(e[0]).slice(0, 500) : r.t.slice(0, 80)); }
    const n = await al(T + 'eventsnextleague.php?id=' + id); console.log('  next', ((n.j && n.j.events) || []).length); const p = await al(T + 'eventspastleague.php?id=' + id); console.log('  past', ((p.j && p.j.events) || []).length); const tb = await al(T + 'lookuptable.php?l=' + id + '&s=2026-2027'); console.log('  table', tb.s, ((tb.j && tb.j.table) || []).length); }
  for(const f of ['2026-27/tr.2.json', '2026-27/ch.1.json', '2025-26/tr.2.json', '2025-26/ch.1.json', '2026-27/tr.1.json']){ const r = await al('https://raw.githubusercontent.com/openfootball/football.json/master/' + f); console.log('openfootball', f, r.s, r.j ? ('maç ' + (r.j.matches || []).length + ' örnek ' + JSON.stringify((r.j.matches || [])[0] || {}).slice(0, 200)) : ''); }
  // ESPN geçmiş sezon puan durumu
  for(const y of [2025, 2015, 2005, 2001, 1995]){ const r = await al('https://site.api.espn.com/apis/v2/sports/soccer/tur.1/standings?season=' + y); const c = (r.j && r.j.children) || []; const en = c[0] && c[0].standings && c[0].standings.entries || []; console.log('ESPN tur.1 sezon', y, r.s, 'satır', en.length, en[0] ? (en[0].team.displayName + ' ' + JSON.stringify((en[0].stats || []).map(s => s.name + '=' + s.value)).slice(0, 300)) : ''); }
  { const r = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/teams/1895/roster'); const a = (r.j && r.j.athletes) || []; console.log('ESPN kadro', r.s, a.length, JSON.stringify(a[0] || {}).slice(0, 400)); }
  // Wikidata: Beşiktaş
  let q = await sp('SELECT ?c ?cLabel ?inc ?pre ?stad ?stadLabel ?cap ?espn WHERE { ?c wdt:P31/wdt:P279* wd:Q476028; rdfs:label "Beşiktaş J.K."@en . OPTIONAL{ ?c p:P571/psv:P571 [wikibase:timeValue ?inc; wikibase:timePrecision ?pre] } OPTIONAL{ ?c wdt:P115 ?stad. OPTIONAL{?stad wdt:P1083 ?cap} } SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". } } LIMIT 5');
  console.log('WD BJK', q.s, q.cors, JSON.stringify((q.j && q.j.results.bindings) || q.t).slice(0, 700));
  const bjk = q.j && q.j.results.bindings[0] && q.j.results.bindings[0].c.value.split('/').pop();
  if(bjk){
    q = await sp('SELECT ?comp ?compLabel (COUNT(?s) AS ?n) (GROUP_CONCAT(?sLabel;separator="|") AS ?sz) WHERE { ?s wdt:P1346 wd:' + bjk + '; wdt:P3450 ?comp . ?s rdfs:label ?sLabel FILTER(lang(?sLabel)="en") SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". } } GROUP BY ?comp ?compLabel ORDER BY DESC(?n)');
    console.log('WD BJK kupalar', q.s, JSON.stringify(((q.j && q.j.results.bindings) || []).map(b => b.compLabel.value + ' ' + b.n.value + ' [' + b.sz.value.slice(0, 120) + ']')).slice(0, 1500));
    q = await sp('SELECT (COUNT(DISTINCT ?p) AS ?n) (COUNT(DISTINCT ?img) AS ?i) WHERE { ?p p:P54 ?st . ?st ps:P54 wd:' + bjk + ' . FILTER NOT EXISTS { ?st pq:P582 ?bitis } OPTIONAL{ ?p wdt:P18 ?img } }');
    console.log('WD BJK güncel oyuncu / fotoğraflı', q.s, JSON.stringify((q.j && q.j.results.bindings) || q.t).slice(0, 300));
    q = await sp('SELECT ?pLabel ?img WHERE { ?p p:P54 ?st . ?st ps:P54 wd:' + bjk + ' . FILTER NOT EXISTS { ?st pq:P582 ?bitis } ?p wdt:P18 ?img SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 8');
    console.log('WD BJK örnek', JSON.stringify(((q.j && q.j.results.bindings) || []).map(b => b.pLabel.value + ' ' + b.img.value.split('/').pop())).slice(0, 800));
  }
  // ESPN → Wikidata eşleme için: Wikidata'da ESPN FC kulüp kimliği özelliği var mı
  q = await sp('SELECT ?p ?pLabel WHERE { ?p wikibase:propertyType wikibase:ExternalId; rdfs:label ?l . FILTER(lang(?l)="en" && CONTAINS(LCASE(?l),"espn")) SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }');
  console.log('WD ESPN özellikleri', JSON.stringify(((q.j && q.j.results.bindings) || []).map(b => b.p.value.split('/').pop() + ' ' + b.pLabel.value)));
})();
