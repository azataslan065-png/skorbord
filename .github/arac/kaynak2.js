// Deneme 38: basketbol / voleybol veri kaynakları — ESPN lig listesi, TheSportsDB ligleri
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); return { s: r.status, j: await r.json().catch(() => null) }; }catch(e){ return { s: 'HATA ' + e.message }; } };
(async () => {
  for (const sp of ['basketball', 'volleyball']) {
    const r = await al('https://sports.core.api.espn.com/v2/sports/' + sp + '/leagues?limit=200');
    const it = (r.j && r.j.items) || []; console.log('ESPN', sp, r.s, it.length);
    for (const x of it) { const l = await al(x.$ref.replace('http://', 'https://')); const j = l.j || {}; console.log('  ', j.slug, '|', j.name, '|', j.abbreviation, '| sezon', j.season && j.season.year, j.isTournament ? 'turnuva' : ''); }
  }
  for (const [k, u] of [['tsdb123', 'https://www.thesportsdb.com/api/v1/json/123/all_leagues.php'], ['tsdb3', 'https://www.thesportsdb.com/api/v1/json/3/all_leagues.php']]) {
    const r = await al(u); const l = ((r.j && r.j.leagues) || []).filter(x => /Basketball|Volleyball/.test(x.strSport));
    console.log('TS', k, r.s, ((r.j && r.j.leagues) || []).length, 'basket/voley', l.length); l.forEach(x => console.log('   ', x.idLeague, x.strSport, '|', x.strLeague, '|', x.strLeagueAlternate || ''));
  }
  // ESPN scoreboard deneme
  for (const s of ['nba', 'wnba', 'nba-development', 'mens-college-basketball', 'womens-college-basketball', 'fiba', 'mens-olympics-basketball', 'womens-olympics-basketball', 'nbl', 'euroleague']) { const r = await al('https://site.api.espn.com/apis/site/v2/sports/basketball/' + s + '/scoreboard'); console.log('SB', s, r.s, r.j && r.j.events ? r.j.events.length + ' maç' : '', r.j && r.j.leagues && r.j.leagues[0] ? r.j.leagues[0].name : ''); }
})();
