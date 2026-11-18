// Deneme 44: tur 0 (turu olmayan ligler) ve EuroCup turları
const bek = ms => new Promise(r => setTimeout(r, ms)); const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const al = async u => { for (let i = 0; i < 5; i++) { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); if (r.status === 429) { await bek(20000); continue; } return await r.json().catch(() => null); }catch(e){ await bek(3000); } } return null; };
(async () => {
  for (const [id, s, r] of [['5124','2026-2027',0],['5270','2026-2027',0],['4431','2026-2027',0],['5269','2026',0],['4547','2026-2027',1],['4547','2026-2027',8],['4977','2026-2027',1],['5932','2026-2027',1],['5932','2026-2027',0],['4476','2026-2027',1],['4476','2026-2027',0],['4433','2026-2027',1],['4423','2026-2027',1],['4578','2026-2027',1],['4584','2026-2027',1],['4582','2026-2027',1],['5119','2026-2027',1],['5119','2026-2027',0]]) {
    const j = await al(T + 'eventsround.php?id=' + id + '&r=' + r + '&s=' + s); const e = (j && j.events) || [];
    console.log('R', id, s, 'r' + r, e.length, e[0] ? e[0].strEvent + ' ' + e[0].dateEvent : ''); await bek(2300);
  }
})();
