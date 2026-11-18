// Deneme 15: Maçkolik TV programı sayfası (spiker / yorumcu)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' };
const al = async (u) => { try{ const r = await fetch(u, { headers: UA }); return { s: r.status, t: await r.text(), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  for(const u of ['https://www.mackolik.com/tvprogrami', 'https://m.mackolik.com/tvprogrami', 'https://www.mackolik.com/tvprogrami?date=2026-11-21']){
    const r = await al(u); console.log('=====', u, r.s, r.u, r.t.length);
    const t = r.t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); const i = t.search(/Günün maçları|Spiker|Yorumcu/i); console.log(t.slice(Math.max(0, i - 200), i + 2500));
    const k = r.t.search(/tv-?program|tvGuide|broadcast/i); console.log('HAM', r.t.slice(Math.max(0, k - 200), k + 2500).replace(/\s+/g, ' '));
    console.log('veri/ajax', [...new Set(r.t.match(/data-(url|endpoint|ajax|src)[a-z-]*="[^"]+"/gi) || [])].slice(0, 15));
  }
})();
