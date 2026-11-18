// Deneme 43: maçı gelmeyen TheSportsDB ligleri — eventsseason / past / next / tur numaraları
const bek = ms => new Promise(r => setTimeout(r, ms)); const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const al = async u => { for (let i = 0; i < 5; i++) { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); if (r.status === 429) { await bek(20000); continue; } return await r.json().catch(() => null); }catch(e){ await bek(3000); } } return null; };
(async () => {
  for (const [id, s] of [['4477','2026-2027'],['5124','2026-2027'],['5270','2026-2027'],['5266','2027'],['4734','2026-2027'],['5507','2026-2027'],['5269','2026'],['4542','2026-2027'],['5757','2026-2027'],['4547','2026-2027'],['4431','2026-2027'],['4977','2026-2027']]) {
    const e = await al(T + 'eventsseason.php?id=' + id + '&s=' + s); await bek(2300);
    const p = await al(T + 'eventspastleague.php?id=' + id); await bek(2300);
    const n = await al(T + 'eventsnextleague.php?id=' + id); await bek(2300);
    const ev = (e && e.events) || [], pe = (p && p.events) || [], ne = (n && n.events) || [];
    console.log('S', id, s, 'season', ev.length, 'turlar', [...new Set(ev.map(x => x.intRound))].slice(0, 12).join(','), '| past', pe.length, pe[0] ? pe[0].strSeason + ' r' + pe[0].intRound + ' ' + pe[0].dateEvent : '', '| next', ne.length, ne[0] ? ne[0].strSeason + ' r' + ne[0].intRound + ' ' + ne[0].dateEvent : '');
  }
})();
