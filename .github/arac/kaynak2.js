// Deneme 22: Maçkolik canlı sonuçlar bileşeninin veri adresi (urlJson / asyncRequestParams) ve o servisin çıktısı
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' };
const al = async (u, h) => { for(let i = 0; i < 5; i++){ try{ const r = await fetch(u, { headers: Object.assign({}, UA, h || {}) }); const t = await r.text(); if(r.status === 200) return { s: 200, t }; console.log('  deneme', u.slice(0, 60), r.status); }catch(e){} await new Promise(r => setTimeout(r, 5000)); } return { s: 0, t: '' }; };
(async () => {
  const r = await al('https://www.mackolik.com/canli-sonuclar'); const h = r.t; console.log('===== sayfa', r.s, h.length);
  const ayar = [...new Set((h.match(/data-settings="[^"]{0,3000}"/g) || []).map(x => x.replace(/&quot;/g, '"').replace(/&amp;/g, '&')))];
  ayar.forEach(a => console.log('AYAR', a.slice(0, 1500)));
  const js = ayar.map(a => /"urlJson":"([^"]+)"/.exec(a)).filter(Boolean).map(m => m[1].replace(/\\\//g, '/'));
  const prm = ayar.map(a => /"asyncRequestParams":(\{[^}]*\})/.exec(a)).filter(Boolean).map(m => m[1]);
  console.log('URLJSON', js, 'PARAM', prm);
  for(const u of js.slice(0, 2)){ const q = prm[0] ? '?' + new URLSearchParams(JSON.parse(prm[0])).toString() : ''; const x = await al(u + q, { 'X-Requested-With': 'XMLHttpRequest', Referer: 'https://www.mackolik.com/canli-sonuclar' }); console.log('===== JSON', u + q, x.s, x.t.length); console.log(x.t.slice(0, 3000)); }
})();
