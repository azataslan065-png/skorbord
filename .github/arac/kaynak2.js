// Deneme 50: TVF lig açıklamaları (leagueDescriptions) ve puan tablosu renk satırları
const de = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
function lwCoz(x){ if(Array.isArray(x)){ if(x.length === 2 && x[1] && typeof x[1] === 'object' && x[1].s) return lwCoz(x[0]); return x.map(lwCoz); } if(x && typeof x === 'object'){ const o = {}; Object.keys(x).forEach(k => { o[k] = lwCoz(x[k]); }); return o; } return x; }
(async () => {
  if (process.env.PARCA !== '0') return;
  for (const s of ['sultanlar-ligi', 'efeler-ligi']) {
    const t = await (await fetch('https://tvf.org.tr/lig/' + s, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' } })).text();
    const sn = [...t.matchAll(/wire:snapshot="([^"]+)"/g)].map(m => de(m[1])).find(x => /league-detail/.test(x));
    const d = lwCoz(JSON.parse(sn).data);
    console.log('==', s, 'AÇIKLAMA', JSON.stringify(d.leagueDescriptions).slice(0, 1500));
    const bul = (o, yol) => { if(o && typeof o === 'object'){ if('dusecektakimsayisi' in o){ console.log('   META', yol, JSON.stringify(o).slice(0, 900)); return; } Object.keys(o).forEach(k => bul(o[k], yol + '.' + k)); } }; bul(d, 'd');
    const p = d.leaguePoints; console.log('   PUAN', JSON.stringify(p).slice(0, 300));
    const sat = JSON.stringify(p).match(/"TEAMCOLORROW":\[[^\]]*\]/g) || []; console.log('   RENK', [...new Set(sat)].slice(0, 20).join(' '));
    const i = t.indexOf('legend'); console.log('   HTML', t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/\s+/g, ' ').match(/(Play[- ]?Off|Küme|düş|Lig Etab)[^<]{0,120}/gi)?.slice(0, 12).join(' || '));
  }
})();
