// Deneme: FIFA sıralama sayfasının içindeki veri (en yeni sıralamanın kimliği)
const al = async (u, metin) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: metin ? 'text/html' : 'application/json' } }); if(!r.ok) return null; return metin ? r.text() : r.json(); }catch(e){ return null; } };
(async () => {
  const sy = String(await al('https://inside.fifa.com/fifa-world-ranking/men', true) || '');
  let i = sy.indexOf('lastUpdateDate'); console.log('ÇEVRE1', sy.slice(Math.max(0, i - 1500), i + 300).replace(/\s+/g, ' '));
  const nd = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(sy); console.log('NEXT', !!nd, nd ? nd[1].length : 0);
  if(nd){ const j = JSON.parse(nd[1]); const yol = (o, p, d) => { if(d > 9 || !o || typeof o !== 'object') return; for(const k of Object.keys(o)){ const v = o[k];
      if(/dateId|rankingDate|selectedDate|lastUpdate|^id$/i.test(k) && typeof v !== 'object') console.log('ANAHTAR', p + '.' + k, String(v).slice(0, 80));
      if(Array.isArray(v) && v.length > 150) console.log('DİZİ', p + '.' + k, v.length, JSON.stringify(v[0]).slice(0, 300));
      yol(v, p + '.' + k, d + 1); } }; yol(j, '', 0); }
  const m = sy.match(/.{60}id15\d{3}.{60}/g); console.log('id15', (m || []).slice(0, 5));
  const d2 = sy.match(/"dates?"\s*:\s*\[.{0,400}/); console.log('DATES', d2 && d2[0]);
  for(const u of ['https://inside.fifa.com/api/ranking-overview?locale=en&rankingType=football&gender=1', 'https://inside.fifa.com/api/ranking-overview/dates?locale=en&gender=1', 'https://inside.fifa.com/api/rankings/dates?gender=1']){
    const j = await al(u); console.log('URL', u, JSON.stringify(j || null).slice(0, 400)); }
})();
