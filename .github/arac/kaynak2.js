// Deneme: TFF sitesi (gruplar, fikstür, maç görevlileri), beIN yayın akışı, Vikipedi 2. Lig grupları
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' } }); const t = await r.text(); return { s: r.status, t }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const temiz = h => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
(async () => {
  for(const u of ['https://www.tff.org/Default.aspx?pageID=971', 'https://www.tff.org/default.aspx?pageID=976', 'https://www.tff.org/Default.aspx?pageID=29&macID=315426', 'https://www.tff.org/default.aspx?pageID=198', 'https://www.tff.org/default.aspx?pageID=142']){
    const r = await al(u); console.log('=====', u, r.s, r.t.length);
    const t = temiz(r.t); const i = Math.max(0, t.search(/Hakem|Grup|Puan Durumu|Fikstür/i)); console.log(t.slice(i, i + 1500));
    console.log('macID örnek', [...new Set((r.t.match(/macId=\d+/gi) || []))].slice(0, 8).join(' '), 'pageID bağları', [...new Set((r.t.match(/pageID=\d+[^"'\s<>]*/gi) || []))].slice(0, 40).join(' '));
  }
  const b = await al('https://beinsports.com.tr/yayin-akisi/beinsports/carsamba'); console.log('===== beIN', b.s, b.t.length);
  const j = b.t.indexOf('Eyüpspor'); console.log(b.t.slice(Math.max(0, j - 1500), j + 600).replace(/\s+/g, ' '));
  console.log('NEXT', /__NEXT_DATA__/.test(b.t), (b.t.match(/https?:\/\/[^"'\s]*api[^"'\s]*/gi) || []).slice(0, 10));
})();
