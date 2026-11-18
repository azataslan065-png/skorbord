// Deneme 16: Maçkolik TV programı betiği (veri adresi, spiker alanı) ve sayfadaki gün sekmeleri
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' };
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({}, UA, h || {}) }); return { s: r.status, t: await r.text(), ct: r.headers.get('content-type') }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const j = await al('https://www.mackolik.com/js/pages/tv-guide.5a713a5195.js'); console.log('===== JS', j.s, j.t.length);
  for(const w of ['url', 'Url', 'ajax', 'fetch', 'spiker', 'Spiker', 'commentat', 'Commentat', 'yorumcu', 'announcer', 'presenter', 'channel']){ let i = -1, n = 0; while((i = j.t.indexOf(w, i + 1)) >= 0 && n < 4){ n++; console.log('[' + w + ']', j.t.slice(Math.max(0, i - 160), i + 240).replace(/\s+/g, ' ')); } }
  const p = await al('https://www.mackolik.com/tvprogrami'); const i = p.t.indexOf('Günün maçları'); console.log('===== SAYFA', p.t.slice(Math.max(0, i - 4000), i + 1500).replace(/\s+/g, ' '));
  const d = [...new Set(p.t.match(/data-[a-z-]+="[^"]{0,200}"/g) || [])].filter(x => /url|date|tv|guide|day/i.test(x)).slice(0, 30); console.log('DATA', d);
})();
