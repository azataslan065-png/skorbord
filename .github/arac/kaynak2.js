// Deneme 41: TheSportsDB basketbol / voleybol lig listesi (yavaş, hız sınırına uygun)
const al = async u => { for (let i = 0; i < 4; i++) { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); if (r.status === 429) { await bek(30000); continue; } return { s: r.status, j: await r.json().catch(() => null) }; }catch(e){ await bek(3000); } } return { s: 'yok' }; };
const bek = ms => new Promise(r => setTimeout(r, ms)); const T = 'https://www.thesportsdb.com/api/v1/json/123/';
(async () => {
  for (const sp of ['Basketball', 'Volleyball']) { const r = await al(T + 'search_all_leagues.php?s=' + sp); const l = (r.j && (r.j.countries || r.j.countrys)) || []; console.log('HEPSI', sp, r.s, l.length, l.slice(0, 80).map(x => x.idLeague + ':' + x.strLeague + '[' + x.strCountry + ']').join(' ; ')); await bek(6000); }
  const B = ['Australia', 'China', 'Japan', 'Philippines', 'South Korea', 'Brazil', 'Canada', 'Mexico', 'Puerto Rico', 'Russia', 'Worldwide', 'Europe', 'Belgium', 'Netherlands', 'United Kingdom', 'England', 'Estonia', 'Latvia', 'Croatia', 'USA', 'Africa', 'Asia', 'South America', 'Argentina'];
  const V = ['Turkey', 'Italy', 'Poland', 'Brazil', 'Japan', 'Russia', 'Iran', 'Worldwide', 'Europe', 'France', 'Germany', 'Greece', 'USA', 'Argentina', 'China', 'South Korea', 'Asia', 'South America'];
  for (const [sp, L] of [['Basketball', B], ['Volleyball', V]]) for (const c of L) { const r = await al(T + 'search_all_leagues.php?s=' + sp + '&c=' + encodeURIComponent(c)); const l = (r.j && (r.j.countries || r.j.countrys)) || []; console.log('L', sp, c, r.s, l.map(x => x.idLeague + ':' + x.strLeague + '(' + x.strCurrentSeason + ')').join(' ; ')); await bek(6000); }
})();
