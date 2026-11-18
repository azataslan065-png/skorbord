// Deneme 45: TheSportsDB lig kataloğu (basketbol / voleybol), 6 paralel parça — her parça ayrı IP'den
const bek = ms => new Promise(r => setTimeout(r, ms)); const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const al = async u => { for (let i = 0; i < 6; i++) { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); if (r.status === 429) { await bek(15000); continue; } return await r.json().catch(() => null); }catch(e){ await bek(3000); } } return null; };
(async () => {
  const P = +(process.env.PARCA || 0), N = +(process.env.PARCA_SAY || 1);
  for (let id = 4328 + P; id <= 5960; id += N) {
    const j = await al(T + 'lookupleague.php?id=' + id); const L = j && j.leagues && j.leagues[0];
    if (L && /Basketball|Volleyball/.test(L.strSport || '')) console.log('K', id, L.strSport, '|', L.strLeague, '|', L.strCountry, '|', L.strCurrentSeason, '|', L.strGender || '', '|', L.strLeagueAlternate || '');
    await bek(2100);
  }
  console.log('BITTI', P);
})();
