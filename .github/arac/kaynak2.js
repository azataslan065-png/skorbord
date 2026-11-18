// Deneme 39: TheSportsDB (anahtar 123) basketbol / voleybol ligleri ve uç noktaları
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); return { s: r.status, j: await r.json().catch(() => null) }; }catch(e){ return { s: 'HATA ' + e.message }; } };
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
(async () => {
  const bul = [];
  for (const sp of ['Basketball', 'Volleyball']) for (const c of ['Turkey', 'Spain', 'Italy', 'Greece', 'France', 'Germany', 'Lithuania', 'Israel', 'Serbia', 'Poland', 'United Kingdom', 'England', 'Australia', 'China', 'Japan', 'Philippines', 'South Korea', 'Argentina', 'Brazil', 'Canada', 'Mexico', 'Puerto Rico', 'Russia', 'Belgium', 'Netherlands', 'Estonia', 'Latvia', 'USA', 'Worldwide', 'Europe', 'Africa', 'Asia', 'South America', 'Iran', 'Slovenia', 'Croatia']) {
    const r = await al(T + 'search_all_leagues.php?s=' + sp + '&c=' + encodeURIComponent(c)); const l = (r.j && (r.j.countries || r.j.countrys)) || [];
    if (l.length) console.log('L', sp, c, l.map(x => x.idLeague + ':' + x.strLeague + (x.strCurrentSeason ? '(' + x.strCurrentSeason + ')' : '')).join(' ; '));
    l.forEach(x => bul.push([x.idLeague, x.strLeague, x.strCurrentSeason]));
  }
  console.log('TOPLAM', bul.length);
  for (const [id, ad, sz] of bul.slice(0, 200)) {
    const n = await al(T + 'eventsnextleague.php?id=' + id), p = await al(T + 'eventspastleague.php?id=' + id), s = await al(T + 'eventsseason.php?id=' + id + '&s=' + encodeURIComponent(sz || '2026-2027')), t = await al(T + 'lookuptable.php?l=' + id + '&s=' + encodeURIComponent(sz || ''));
    const say = x => (x.j && (x.j.events || x.j.table)) ? (x.j.events || x.j.table).length : 0;
    console.log('U', id, ad, 'sezon', sz, '| next', say(n), '| past', say(p), '| season', say(s), '| table', say(t));
  }
})();
