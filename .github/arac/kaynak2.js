// Deneme 7: beIN maç servisi (apigateway) alanları
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept': 'application/json', 'Origin': 'https://beinsports.com.tr', 'Referer': 'https://beinsports.com.tr/' } }); return { s: r.status, t: await r.text() }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  for(const u of ['https://apigateway.beinsports.com.tr/api/match/1515839', 'https://apigateway.beinsports.com.tr/api/match/detail/1515839', 'https://apigateway.beinsports.com.tr/api/live/1515839', 'https://apigateway.beinsports.com.tr/api/fixture/head2head/1515839']){
    const r = await al(u); console.log('=====', u, r.s, r.t.length); console.log(r.t.slice(0, 2500));
    try{ const j = JSON.parse(r.t); const anah = new Set(); const gez = (o, p, d) => { if(!o || typeof o !== 'object' || d > 6) return; Object.keys(o).forEach(k => { anah.add(p + k); gez(o[k], p + k + '.', d + 1); }); }; gez(j, '', 0);
      console.log('ANAHTARLAR', [...anah].filter(k => !/\.\d+\./.test(k)).slice(0, 200).join(' ')); }catch(e){}
  }
})();
