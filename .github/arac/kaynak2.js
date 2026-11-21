// Deneme 55: DuckDuckGo sonuçlarındaki @Kimanlatiyor gönderilerinin tam metni ve Google Haberler RSS'teki haberlerin metin kalıbı
(async () => {
  if (process.env.PARCA !== '0') return;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
  const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' }, h || {}), signal: AbortSignal.timeout(30000), redirect: 'follow' }); const t = await r.text(); return { s: r.status, t, u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
  const ent = t => String(t || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
  const temiz = t => ent(String(t).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  for (const q of ['Kimanlatiyor', 'site:x.com Kimanlatiyor', 'Kim Anlatıyor Galatasaray Samsunspor', 'Kimanlatiyor Konyaspor Beşiktaş', 'Kimanlatiyor Trabzonspor Eyüpspor']) {
    const r = await al('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q));
    const sonuc = [...r.t.matchAll(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ u: decodeURIComponent((/uddg=([^&]+)/.exec(m[1]) || [, m[1]])[1]), b: temiz(m[2]), s: temiz(m[3]) }));
    console.log('DDG', q, r.s, 'sonuç', sonuc.length);
    sonuc.filter(x => /x\.com|twitter/i.test(x.u)).slice(0, 8).forEach(x => console.log('   X', x.u.slice(0, 90), '|', x.b.slice(0, 80), '|', x.s.slice(0, 400)));
    await new Promise(r => setTimeout(r, 1500));
  }
  // Google Haberler RSS: ilk 2 ilgili haberin metninden spiker / yorumcu cümleleri
  for (const k of ['Galatasaray Samsunspor maçı spikeri', 'Konyaspor Beşiktaş maçı spikeri', 'Trabzonspor Eyüpspor maçını kim anlatıyor']) {
    const r = await al('https://news.google.com/rss/search?hl=tr&gl=TR&ceid=TR:tr&q=' + encodeURIComponent(k));
    const it = [...r.t.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => ({ b: temiz((/<title>([\s\S]*?)<\/title>/.exec(m[1]) || [])[1]), l: ent((/<link>([\s\S]*?)<\/link>/.exec(m[1]) || [])[1]), z: (/<pubDate>([\s\S]*?)<\/pubDate>/.exec(m[1]) || [])[1] }));
    const ilgili = it.filter(x => /spiker|anlat/i.test(x.b) && new RegExp(k.split(' ')[0].slice(0, 5), 'i').test(x.b)).slice(0, 2);
    console.log('GHABER', k, r.s, 'haber', it.length, 'ilgili', ilgili.length);
    for (const x of ilgili) {
      const h = await al(x.l); const t = temiz(h.t);
      console.log('   ', x.z, '|', x.b.slice(0, 120), '| açılan', h.s, (h.u || '').slice(0, 80), 'uzunluk', t.length);
      (t.match(/[^.!?]{0,160}(spiker|anlat|yorumcu)[^.!?]{0,200}/gi) || []).slice(0, 5).forEach(c => console.log('       >', c.trim().slice(0, 330)));
    }
  }
})();
