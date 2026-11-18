// Deneme 5: beIN maç merkezi sayfası (yayın ekibi var mı), diğer günlerin yayın akışı
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' } }); return { s: r.status, t: await r.text() }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const nd = t => { const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(t); return m ? JSON.parse(m[1]).props.pageProps : null; };
(async () => {
  const p = await al('https://beinsports.com.tr/mac-merkezi/gaziantep-fk-kasimpasa/1515839'); const pp = nd(p.t); if(pp) delete pp.layout;
  console.log('===== maç merkezi', p.s, 'anahtarlar', pp && Object.keys(pp)); const s = JSON.stringify(pp || {});
  console.log(s.slice(0, 5000));
  for(const w of ['spiker', 'Spiker', 'yorumcu', 'Yorumcu', 'commentator', 'Commentator', 'anlat', 'referee', 'channel', 'Channel', 'broadcast']){ const i = s.indexOf(w); if(i >= 0) console.log('[' + w + ']', s.slice(Math.max(0, i - 300), i + 400)); }
  const t = p.t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); const j = t.search(/Spiker|Yorumcu|Anlatan/i); console.log('METİN', j, t.slice(Math.max(0, j - 300), j + 500));
  for(const g of ['persembe', 'cuma', 'cumartesi', 'pazar']){ const r = await al('https://beinsports.com.tr/yayin-akisi/beinsports/' + g); const q = nd(r.t); const l = (q && q.data && q.data.listTvGuides) || []; console.log('GÜN', g, q && q.data && q.data.event_date, l.length, JSON.stringify(l.filter(x => x.related_match_id).slice(0, 2))); }
  const r = await al('https://beinsports.com.tr/yayin-akisi/beinsports/pazar'); const q = nd(r.t); console.log('pazar ham', JSON.stringify(q && q.data).slice(0, 300));
})();
