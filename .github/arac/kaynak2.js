// Deneme 24: Bing Haberler RSS (doğrudan makale bağlantısı) ve makale metninde spiker / yorumcu cümleleri
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, redirect: 'follow', signal: AbortSignal.timeout(20000) }); return { s: r.status, t: await r.text(), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const ent = s => String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
(async () => {
  for(const q of ['Konyaspor Galatasaray maçını kim anlatıyor', 'Türkiye Belçika maçı spikeri kim', 'Galatasaray Barcelona maçını kim anlatıyor']){
    const r = await al('https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&format=rss&setlang=tr&cc=tr'); const it = [...r.t.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    console.log('=====', q, r.s, r.t.length, it.length);
    for(const x of it.slice(0, 4)){ const t = ent((/<title>([\s\S]*?)<\/title>/.exec(x) || [])[1]); let l = ent((/<link>([\s\S]*?)<\/link>/.exec(x) || [])[1]); const m = /[?&]url=([^&]+)/.exec(l); if(m) l = decodeURIComponent(m[1]);
      const a = await al(l); const body = ent(a.t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, ''));
      const cumle = (body.match(/[^.!?]{0,220}(spiker|anlatac|anlatım|anlatıyor|yorumcu|yorumlayac|mikrofon)[^.!?]{0,220}[.!?]/gi) || []).slice(0, 6);
      console.log('  -', t, '|', a.s, l.slice(0, 80)); cumle.forEach(c => console.log('     >', c.trim().slice(0, 300))); }
  }
})();
