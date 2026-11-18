// Deneme 51: TheSportsDB maç ayrıntısı (çeyrek / set skorları) ve oyuncu listesi; TVF takım kadrosu
const bek = ms => new Promise(r => setTimeout(r, ms)); const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const al = async u => { for (let i = 0; i < 5; i++) { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(30000) }); if (r.status === 429) { await bek(15000); continue; } return await r.json().catch(() => null); }catch(e){ await bek(3000); } } return null; };
(async () => {
  if (process.env.PARCA !== '0') return;
  const fs = require('fs');
  for (const s of ['bsk.tur.bsl', 'vlb.ita.superlega', 'bsk.int.euroleague']) {
    const j = JSON.parse(fs.readFileSync('veri/' + s + '.json', 'utf8')); const m = j.mac.filter(x => x.evG != null).slice(-1)[0];
    const e = await al(T + 'lookupevent.php?id=' + m.id); const ev = e && e.events && e.events[0]; await bek(2300);
    console.log('EV', s, m.id, ev ? Object.entries(ev).filter(([k, v]) => v != null && v !== '' && !/Thumb|Banner|Poster|Square|Fanart|Map|Badge/.test(k)).map(([k, v]) => k + '=' + String(v).slice(0, 60)).join(' | ') : 'yok');
    const tid = m.ev; const p = await al(T + 'lookup_all_players.php?id=' + tid); await bek(2300);
    const pl = (p && (p.player || p.players)) || []; console.log('OYUNCU', s, tid, pl.length, pl.slice(0, 4).map(x => x.strPlayer + '/' + x.strPosition + '/' + (x.strNumber || '') + '/' + (x.strCutout || x.strThumb ? 'foto' : '')).join(' ; '));
    const l = await al(T + 'lookuplineup.php?id=' + m.id); await bek(2300); console.log('LINEUP', s, JSON.stringify(l).slice(0, 300));
  }
  // TVF takım sayfası
  const t = await (await fetch('https://tvf.org.tr/lig/sultanlar-ligi', { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' } })).text();
  console.log('TVF takım bağlantıları', [...new Set(t.match(/href="[^"]*(takim|kulup|team)[^"]*"/gi) || [])].slice(0, 10).join(' '));
})();
