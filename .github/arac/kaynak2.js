// Deneme 42: TheSportsDB lig kataloğu taraması (id 4328-5960) — yalnız basketbol / voleybol, hız sınırına uygun
const bek = ms => new Promise(r => setTimeout(r, ms)); const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const al = async u => { for (let i = 0; i < 5; i++) { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); if (r.status === 429) { await bek(20000); continue; } return await r.json().catch(() => null); }catch(e){ await bek(3000); } } return null; };
(async () => {
  let n = 0;
  for (let id = 4328; id <= 5960; id++) {
    const j = await al(T + 'lookupleague.php?id=' + id); const L = j && j.leagues && j.leagues[0];
    if (L && /Basketball|Volleyball/.test(L.strSport || '')) { n++; console.log('K', id, L.strSport, '|', L.strLeague, '|', L.strCountry, '|', L.strCurrentSeason, '|', L.strGender || '', '|', L.strLeagueAlternate || ''); }
    await bek(2150);
  }
  console.log('BITTI', n);
})();
