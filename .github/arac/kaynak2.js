// Deneme 4: TFF tam fikstür listesindeki satırlar, beIN yayın akışı HTML satırları, beIN maç sayfası
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' } }); const b = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get('content-type') || ''; const t = /utf-8/i.test(ct) ? b.toString('utf8') : new TextDecoder('windows-1254').decode(b); return { s: r.status, t, ct }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const r = await al('https://www.tff.org/Default.aspx?pageID=971'); const h = r.t; const i = h.indexOf('fiksturListesiTable');
  console.log('===== TFF 971 liste'); console.log(h.slice(i, i + 3500).replace(/\s+/g, ' '));
  const gr = [...h.matchAll(/Nesine 3\. Lig<br\/>([^<]+)<br\/>/g)].map(m => m[1]); console.log('GRUPLAR', gr);
  const g2 = [...(await al('https://www.tff.org/default.aspx?pageID=976')).t.matchAll(/Nesine 2\. Lig<br\/>([^<]+)<br\/>/g)].map(m => m[1]); console.log('GRUPLAR 2', g2);
  const b = await al('https://beinsports.com.tr/yayin-akisi/beinsports/carsamba'); const t = b.t; const k = t.search(/\d\d:\d\d<\/?/);
  console.log('===== beIN satır'); console.log(t.slice(k - 1500, k + 2500).replace(/\s+/g, ' '));
  const nd = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(t); if(nd){ const pp = JSON.parse(nd[1]).props.pageProps; console.log('bugün data', JSON.stringify(pp.data).slice(0, 2500)); }
  const ml = [...new Set(t.match(/href="\/mac\/[^"]+"/g) || [])].slice(0, 5); console.log('maç bağları', ml);
  const f = await al('https://beinsports.com.tr/lig/super-lig'); const ml2 = [...new Set(f.t.match(/href="\/[^"]*mac[^"]*"/g) || [])].slice(0, 10); console.log('lig sayfası maç bağları', ml2);
  if(ml2[0]){ const u = 'https://beinsports.com.tr' + ml2[0].slice(6, -1); const p = await al(u); const n3 = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(p.t); console.log('===== maç sayfası', u, p.s, n3 ? JSON.stringify(JSON.parse(n3[1]).props.pageProps).replace(/"layout":\{[\s\S]*?"seo"/, '"seo"').slice(0, 3500) : p.t.slice(0, 500)); }
})();
