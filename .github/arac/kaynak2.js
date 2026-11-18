// Deneme 8: TFF maç sayfasında takım logoları, Türkiye Kupası / Süper Kupa sayfa kimlikleri
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' } }); const b = Buffer.from(await r.arrayBuffer()); return { s: r.status, t: new TextDecoder('windows-1254').decode(b) }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const m = await al('https://www.tff.org/Default.aspx?pageID=29&macID=319258'); const h = m.t; const i = h.indexOf('AMASYASPOR FK');
  console.log('===== maç üst', h.slice(i - 3000, i + 1500).replace(/\s+/g, ' '));
  const imgs = [...new Set(h.match(/<img[^>]+src="[^"]*(?:Kulup|kulup|logo|Logo|Resources)[^"]*"[^>]*>/g) || [])].slice(0, 10); console.log('LOGOLAR', imgs);
  const a = await al('https://www.tff.org/default.aspx?pageID=198'); const menu = [...a.t.matchAll(/<a href="\/?[Dd]efault\.aspx\?pageI[Dd]=(\d+)"[^>]*>(?:<span>)?([^<]*(?:Kupa|Lig|Kupası)[^<]*)</g)].map(x => x[1] + ' ' + x[2].trim()); console.log('MENÜ', [...new Set(menu)].slice(0, 80));
})();
