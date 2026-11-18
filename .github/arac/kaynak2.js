// Deneme 18: Maçkolik maç sayfası ham HTML (bileşenler, ajax adresleri, yayın ekibi)
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Accept': 'text/html' };
const al = async (u) => { for(let i = 0; i < 4; i++){ try{ const r = await fetch(u, { headers: UA }); const t = await r.text(); if(r.status !== 403) return { s: r.status, t }; }catch(e){} await new Promise(r => setTimeout(r, 4000)); } return { s: 403, t: '' }; };
(async () => {
  for(const u of ['https://www.mackolik.com/mac/%C3%A7orum-fk-vs-fenerbah%C3%A7e/cxi3ingg9xdr2gewdig9893is', 'https://www.mackolik.com/mac/fenerbah%C3%A7e-vs-g%C3%B6ztepe/cuy5ku0290ddhliw8hb9lxiqc']){
    const r = await al(u); const h = r.t; console.log('=====', u, r.s, h.length);
    console.log('MODÜLLER', [...new Set(h.match(/data-module="[^"]+"/g) || [])].join(' '));
    console.log('AYAR', [...new Set((h.match(/data-settings="[^"]{0,400}"/g) || []).map(x => x.replace(/&quot;/g, '"')))].slice(0, 25).join('\n  '));
    for(const w of ['Spiker', 'spiker', 'Yorumcu', 'yorumcu', 'commentator', 'broadcast', 'Yayıncı', 'tv-channel', 'beIN']){ const i = h.indexOf(w); if(i >= 0) console.log('[' + w + ']', h.slice(Math.max(0, i - 600), i + 600).replace(/\s+/g, ' ')); }
  }
})();
