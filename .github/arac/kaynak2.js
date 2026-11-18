// Deneme 14: Maçkolik eski veri servisleri (vd.mackolik.com, arsiv), maç ayrıntısında yayın / spiker
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Referer': 'https://arsiv.mackolik.com/' };
const al = async (u) => { try{ const r = await fetch(u, { headers: UA }); const b = Buffer.from(await r.arrayBuffer()); return { s: r.status, t: b.toString('utf8'), ct: r.headers.get('content-type') }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const l = await al('https://vd.mackolik.com/livedata?group=0'); let j = null; try{ j = JSON.parse(l.t); }catch(e){}
  console.log('===== livedata anahtarlar', j && Object.keys(j)); const e = (j && j.e) || []; console.log('örnek', JSON.stringify(e[0])); const tr = e.filter(x => /Türkiye|Süper Lig|TFF|Trendyol|Nesine/i.test(String(x[5]))).slice(0, 3); console.log('TR', JSON.stringify(tr));
  const id = (tr[0] || e[0] || [])[0], id2 = (tr[0] || e[0] || [])[1];
  for(const u of ['https://arsiv.mackolik.com/Match/MatchData.aspx?t=dtl&id=' + id, 'https://arsiv.mackolik.com/Match/Default.aspx?id=' + id, 'https://arsiv.mackolik.com/Mac/' + id + '/', 'https://vd.mackolik.com/livedata?group=0&mid=' + id, 'https://arsiv.mackolik.com/AjaxHandlers/MatchHandler.aspx?command=getMatchInfo&id=' + id, 'https://www.mackolik.com/mac/x/' + id, 'https://arsiv.mackolik.com/Match/Default.aspx?id=' + id2]){
    const r = await al(u); const t = r.t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); const i = t.search(/Spiker|Yorumcu|Yayın|Kanal|TV/);
    console.log('=====', u, r.s, r.ct, r.t.length, i, t.slice(Math.max(0, i - 200), i + 500)); }
})();
