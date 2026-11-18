// Deneme 3: TFF fikstür satır yapısı, beIN yayın akışı verisi
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' } }); const b = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get('content-type') || ''; const t = /utf-8/i.test(ct) ? b.toString('utf8') : new TextDecoder('windows-1254').decode(b); return { s: r.status, t, ct }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  for(const id of [976, 198]){
    const r = await al('https://www.tff.org/default.aspx?pageID=' + id); const h = r.t;
    const i = h.search(/macId=\d+/i); console.log('===== TFF', id, 'ilk maç çevresi'); console.log(h.slice(i - 2500, i + 1200).replace(/\s+/g, ' '));
    const g = h.search(/Kırmızı Grup|Beyaz Grup|Sezon 2026-2027/); console.log('--- grup başlığı çevresi'); console.log(h.slice(g - 800, g + 400).replace(/\s+/g, ' '));
    const sel = h.match(/<select[\s\S]*?<\/select>/gi) || []; console.log('--- select', sel.length); sel.slice(0, 4).forEach(s => console.log(s.replace(/\s+/g, ' ').slice(0, 900)));
  }
  const b = await al('https://beinsports.com.tr/yayin-akisi/beinsports/cumartesi'); const nd = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(b.t);
  if(nd){ const j = JSON.parse(nd[1]); const pp = j.props.pageProps; console.log('===== beIN days', JSON.stringify(pp.days).slice(0, 800)); console.log('beIN data', JSON.stringify(pp.data).slice(0, 4000)); console.log('beIN activeLeagues', JSON.stringify(pp.activeLeagues).slice(0, 600)); }
  const m = await al('https://beinsports.com.tr/lig/super-lig/fikstur'); const nd2 = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(m.t); console.log('===== beIN fikstür', m.s, nd2 ? JSON.stringify(JSON.parse(nd2[1]).props.pageProps).slice(0, 3000) : '');
})();
