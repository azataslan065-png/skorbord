// Deneme 21: kullanıcının verdiği Maçkolik maç sayfası (Athletic - Espanyol, 20.11.2026): spiker / yorumcu nerede
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Accept': 'text/html,application/json' };
const al = async (u, h) => { for(let i = 0; i < 6; i++){ try{ const r = await fetch(u, { headers: Object.assign({}, UA, h || {}) }); const t = await r.text(); if(r.status === 200) return { s: 200, t, u: r.url }; console.log('  deneme', i, r.status); }catch(e){} await new Promise(r => setTimeout(r, 6000)); } return { s: 0, t: '' }; };
(async () => {
  const r = await al('https://www.mackolik.com/mac/detail/828rogo7p3et735q5pmlh2tck'); const h = r.t; console.log('=====', r.s, r.u, h.length);
  for(const w of ['Spiker', 'spiker', 'SPİKER', 'Yorumcu', 'yorumcu', 'YORUMCU', 'Anlatan', 'commentator', 'broadcast', 'Yayın', 'beIN', 'S Sport', 'TV']){ let i = -1, n = 0; while((i = h.indexOf(w, i + 1)) >= 0 && n < 3){ n++; console.log('[' + w + '@' + i + ']', h.slice(Math.max(0, i - 500), i + 500).replace(/\s+/g, ' ')); } }
  console.log('MODÜLLER', [...new Set(h.match(/data-module="[^"]+"/g) || [])].join(' '));
  console.log('AYAR', [...new Set((h.match(/data-settings="[^"]{0,500}"/g) || []).map(x => x.replace(/&quot;/g, '"')))].join('\n  '));
})();
