// Deneme 10: Maçkolik maç sayfasında spiker / yorumcu; TFF'nin YouTube kanalı (yayınlar sekmesi)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };
const al = async (u) => { try{ const r = await fetch(u, { headers: UA }); return { s: r.status, t: await r.text(), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const metin = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
(async () => {
  for(const u of ['https://www.mackolik.com/canli-sonuclar', 'https://www.mackolik.com/futbol/canli-sonuclar?date=2026-11-08']){
    const r = await al(u); const lk = [...new Set(r.t.match(/href="(https:\/\/www\.mackolik\.com)?\/mac\/[^"]+"/g) || [])]; console.log('===== MK', u, r.s, r.t.length, 'maç bağı', lk.length, lk.slice(0, 6));
    if(lk.length){ for(const l of lk.slice(0, 3)){ const url = l.replace(/^href="/, '').replace(/"$/, ''); const p = await al(url.startsWith('http') ? url : 'https://www.mackolik.com' + url);
      const t = metin(p.t); const i = t.search(/Spiker|Yorumcu|Anlatan|Yayın/i); console.log('--- maç', p.u, p.s, i, t.slice(Math.max(0, i - 300), i + 600));
      for(const w of ['spiker', 'Spiker', 'yorumcu', 'Yorumcu', 'commentator', 'broadcast', 'tvChannel', 'Tv', 'yayinci']){ const j = p.t.indexOf(w); if(j >= 0) console.log('  [' + w + ']', p.t.slice(Math.max(0, j - 200), j + 300).replace(/\s+/g, ' ')); }
      const apis = [...new Set(p.t.match(/https?:\/\/[a-z0-9.-]*(mackolik|perform|omnisport|dagoz)[a-z0-9.-]*\/[^"' ]{0,80}/gi) || [])].slice(0, 15); console.log('  API', apis); } }
  }
  for(const k of ['https://www.youtube.com/@TFF/streams', 'https://www.youtube.com/@tff/streams', 'https://www.youtube.com/@TFFTurkiye/streams', 'https://www.youtube.com/results?search_query=T%C3%BCrkiye+Futbol+Federasyonu&sp=EgIQAg%253D%253D']){
    const r = await al(k); const id = /"externalId":"(UC[^"]+)"/.exec(r.t) || /"channelId":"(UC[^"]+)"/.exec(r.t); const ad = /"title":"([^"]+)","description"/.exec(r.t);
    console.log('===== YT', k, r.s, r.t.length, id && id[1], ad && ad[1], 'lockup', (r.t.match(/lockupViewModel/g) || []).length, 'videoRenderer', (r.t.match(/"videoRenderer"/g) || []).length, 'richItem', (r.t.match(/richItemRenderer/g) || []).length);
    const c = [...r.t.matchAll(/"channelRenderer":\{"channelId":"(UC[^"]+)","title":\{"simpleText":"([^"]+)"/g)].slice(0, 5).map(m => m[1] + ' ' + m[2]); if(c.length) console.log('  kanallar', c);
    const i = r.t.indexOf('lockupViewModel'); if(i > 0) console.log('  lockup örnek', r.t.slice(i, i + 1500));
  }
})();
