// Deneme 13: Maçkolik veri servislerinin adresleri (istemci kodu), eski Maçkolik veri servisleri
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' };
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({}, UA, h || {}) }); return { s: r.status, t: await r.text(), u: r.url, ct: r.headers.get('content-type') }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const r = await al('https://www.mackolik.com/js/pages/livescore-index.1bd49ee4be.js'); const t = r.t;
  for(const w of ['url:', 'fetch(', '.ajax(', 'getJSON', 'endpoint', 'Url', 'path:']){ let i = -1, n = 0; while((i = t.indexOf(w, i + 1)) >= 0 && n < 6){ n++; console.log('[' + w + ']', t.slice(Math.max(0, i - 120), i + 220).replace(/\s+/g, ' ')); } }
  const h = await al('https://www.mackolik.com/canli-sonuclar'); const tv = /href="([^"]*)"[^>]*data-target="tvGuide"|data-target="tvGuide"[^>]*href="([^"]*)"/.exec(h.t); console.log('TV bağı', tv && (tv[1] || tv[2]));
  const cfg = h.t.match(/window\.[A-Za-z_]+\s*=\s*\{[^<]{0,600}/g) || []; cfg.slice(0, 6).forEach(x => console.log('CFG', x.slice(0, 600)));
  for(const u of ['https://vd.mackolik.com/livedata?group=0', 'https://arsiv.mackolik.com/Canli-Sonuclar', 'https://www.mackolik.com/perform/p0/ajax/components/livescores/livescores-list']){
    const x = await al(u); console.log('=====', u, x.s, x.ct, x.t.length, x.t.slice(0, 400).replace(/\s+/g, ' ')); }
})();
