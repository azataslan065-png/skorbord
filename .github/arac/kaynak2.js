// Deneme 19: Maçkolik'te oynanmamış (yaklaşan) maç sayfası: yayın / spiker / yorumcu
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Accept': 'text/html' };
const al = async (u) => { for(let i = 0; i < 5; i++){ try{ const r = await fetch(u, { headers: UA }); const t = await r.text(); if(r.status === 200) return { s: r.status, t }; }catch(e){} await new Promise(r => setTimeout(r, 5000)); } return { s: 0, t: '' }; };
(async () => {
  const f = await al('https://www.mackolik.com/puan-durumu/t%C3%BCrkiye-trendyol-s%C3%BCper-lig/2026-2027/fikstur/482ofyysbdbeoxauk19yg7tdt');
  const lk = [...new Set(f.t.match(/https:\/\/www\.mackolik\.com\/mac\/[^"]+/g) || [])]; console.log('===== fikstür', f.s, lk.length, lk.slice(0, 3));
  // yaklaşan maç: skor yerine saat yazan satırlar
  let say = 0;
  for(const u of lk.slice(-40)){
    const r = await al(u); const h = r.t; if(!h) continue;
    const ok = /Spiker|Yorumcu|Anlatan|commentator|broadcaster|Yayıncı/i.test(h);
    const tv = /(beIN SPORTS[^<]{0,30}|TRT[^<]{0,20}|A Spor|S Sport[^<]{0,10}|Tivibu[^<]{0,20})/.exec(h.replace(/<[^>]+>/g, ' '));
    if(ok || tv){ say++; const i = h.search(/Spiker|Yorumcu|Anlatan|commentator|broadcaster|Yayıncı|beIN SPORTS/i); console.log('=====', u, 'işaret', ok, tv && tv[0]); console.log(h.slice(Math.max(0, i - 1200), i + 1200).replace(/\s+/g, ' ')); if(say >= 2) break; }
  }
  console.log('BİTTİ', say);
})();
