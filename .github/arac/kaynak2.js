// Deneme 2: TFF sayfa içerikleri (windows-1254), beIN yayın akışı verisi
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' } }); const b = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get('content-type') || ''; const t = /utf-8/i.test(ct) ? b.toString('utf8') : new TextDecoder('windows-1254').decode(b); return { s: r.status, t, ct }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const ent = s => s.replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const temiz = h => ent(h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
(async () => {
  for(const u of ['https://www.tff.org/Default.aspx?pageID=29&macID=315426', 'https://www.tff.org/Default.aspx?pageID=29&macID=319258', 'https://www.tff.org/default.aspx?pageID=976', 'https://www.tff.org/Default.aspx?pageID=971']){
    const r = await al(u); const t = temiz(r.t); console.log('=====', u, r.s, r.ct);
    const k = t.indexOf('Diğer Haberler Temsilciler'); const g = t.slice(t.indexOf('MİLLİ TAKIMLAR') > 0 ? 0 : 0);
    for(const w of ['Hakemler', 'Hakem', 'Grup', 'Puan Durumu', 'Hafta', 'Stad']){ let i = -1, n = 0; while((i = t.indexOf(w, i + 1)) >= 0 && n < 40){ n++; if(i > 9000){ console.log('[' + w + '@' + i + ']', t.slice(i - 100, i + 500)); break; } } }
    const h = r.t; const mi = h.search(/Hakem/i); const sonH = h.lastIndexOf('Hakem'); console.log('HAM son Hakem', ent(h.slice(sonH - 1500, sonH + 1500)).replace(/\s+/g, ' ').slice(0, 3000));
  }
  const b = await al('https://beinsports.com.tr/yayin-akisi/beinsports/carsamba'); const nd = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(b.t);
  if(nd){ const j = JSON.parse(nd[1]); const pp = j.props && j.props.pageProps; console.log('beIN pageProps anahtarları', Object.keys(pp || {})); console.log('beIN', JSON.stringify(pp).slice(0, 3000)); }
})();
