// Deneme 12: Maçkolik istemci kodundaki veri servisleri, TV rehberi, maç sayfası yayın ekibi
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' };
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({}, UA, h || {}) }); return { s: r.status, t: await r.text(), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const metin = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
(async () => {
  const yol = new Set();
  for(const s of ['https://www.mackolik.com/js/pages/livescore-index.1bd49ee4be.js', 'https://www.mackolik.com/js/pages/common.318e839f84.js']){
    const r = await al(s); console.log('===== JS', s, r.s, r.t.length);
    (r.t.match(/["'`](https?:)?\/\/[a-z0-9.-]+\/[^"'`\s]{0,120}["'`]/gi) || []).forEach(x => yol.add(x)); (r.t.match(/["'`]\/(ajax|api|perform|livescore|match|mac)[^"'`\s]{0,120}["'`]/gi) || []).forEach(x => yol.add(x));
    ['commentator', 'Commentator', 'spiker', 'Spiker', 'yorumcu', 'tvChannel', 'broadcast'].forEach(w => { const i = r.t.indexOf(w); if(i >= 0) console.log('  [' + w + ']', r.t.slice(Math.max(0, i - 250), i + 250)); });
  }
  console.log('YOLLAR', [...yol].slice(0, 60));
  for(const u of ['https://www.mackolik.com/tv-rehberi', 'https://www.mackolik.com/tv-programi', 'https://www.mackolik.com/futbol/tv-rehberi']){
    const r = await al(u); const t = metin(r.t); const i = t.search(/Spiker|Yorumcu/i); console.log('===== TV', u, r.s, r.u, t.length, i, t.slice(Math.max(0, i - 600), i + 900));
    const lk = [...new Set(r.t.match(/href="[^"]*\/mac\/[^"]+"/g) || [])].slice(0, 5); console.log('  maç bağları', lk);
    if(lk[0]){ const url = lk[0].slice(6, -1); const p = await al(url.startsWith('http') ? url : 'https://www.mackolik.com' + url); const pt = metin(p.t); const j = pt.search(/Spiker|Yorumcu|Anlatan/i); console.log('  MAÇ', p.u, p.s, j, pt.slice(Math.max(0, j - 400), j + 700)); }
  }
})();
