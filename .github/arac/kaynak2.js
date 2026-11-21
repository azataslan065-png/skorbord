// Deneme 54: spiker / yorumcu kaynakları — X'teki @Kimanlatiyor hesabı (gömme zaman tüneli, kimliksiz yollar) ve arama motorları
// ("[Takım 1] [Takım 2] maçını kim anlatıyor", "[Takım 1] [Takım 2] maçı spikeri"). Yalnız erişim durumu ve kısa metin örnekleri yazdırılır.
(async () => {
  if (process.env.PARCA !== '0') return;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
  const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' }, h || {}), signal: AbortSignal.timeout(30000) }); const t = await r.text(); return { s: r.status, t }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
  const temiz = t => t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
  // 1) X gömme zaman tüneli (widget'ların kullandığı herkese açık uç)
  for (const u of ['https://syndication.twitter.com/srv/timeline-profile/screen-name/Kimanlatiyor', 'https://syndication.twitter.com/srv/timeline-profile/screen-name/Kimanlatiyor?showReplies=false',
    'https://cdn.syndication.twimg.com/timeline/profile?screen_name=Kimanlatiyor', 'https://x.com/Kimanlatiyor', 'https://nitter.net/Kimanlatiyor/rss', 'https://nitter.privacydev.net/Kimanlatiyor/rss', 'https://rsshub.app/twitter/user/Kimanlatiyor']) {
    const r = await al(u); const m = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(r.t);
    let tw = [];
    if (m) { try { const j = JSON.parse(m[1]); const gez = x => { if (!x || typeof x !== 'object') return; if (x.full_text || (x.text && x.created_at)) { tw.push({ z: x.created_at, m: x.full_text || x.text }); return; } Object.values(x).forEach(gez); }; gez(j); } catch (e) {} }
    if (!tw.length) tw = [...r.t.matchAll(/<(?:description|title)>([\s\S]*?)<\/(?:description|title)>/g)].map(x => ({ m: temiz(x[1]) })).slice(0, 6);
    console.log('X', u.replace(/^https?:\/\//, '').slice(0, 70), r.s, 'uzunluk', r.t.length, 'tweet', tw.length);
    tw.slice(0, 8).forEach(x => console.log('   ', x.z || '', String(x.m).replace(/\s+/g, ' ').slice(0, 260)));
  }
  // 2) Arama motorları
  const maclar = [['Galatasaray', 'Samsunspor'], ['Kocaelispor', 'Fenerbahçe'], ['Konyaspor', 'Beşiktaş']];
  for (const [a, b] of maclar) for (const k of [a + ' ' + b + ' maçını kim anlatıyor', a + ' ' + b + ' maçı spikeri']) {
    const q = encodeURIComponent(k);
    for (const [ad, u] of [['google', 'https://www.google.com/search?hl=tr&gl=tr&q=' + q], ['bing-web-rss', 'https://www.bing.com/search?format=rss&setlang=tr&cc=tr&q=' + q],
      ['bing-haber-rss', 'https://www.bing.com/news/search?format=rss&setlang=tr&cc=tr&q=' + q], ['ddg', 'https://html.duckduckgo.com/html/?q=' + q], ['google-haber-rss', 'https://news.google.com/rss/search?hl=tr&gl=TR&ceid=TR:tr&q=' + q]]) {
      const r = await al(u); const t = temiz(r.t);
      const cum = (t.match(/[^.!?|]{0,140}(spiker|anlat|yorumcu)[^.!?|]{0,160}/gi) || []).filter(c => new RegExp(a.slice(0, 5), 'i').test(c) || /spiker/i.test(c)).slice(0, 4);
      console.log('ARA', ad, '|', k, '|', r.s, 'uzunluk', r.t.length, /captcha|unusual traffic|sorry/i.test(r.t) ? 'ENGEL' : '');
      cum.forEach(c => console.log('     ', c.trim().slice(0, 300)));
      await new Promise(r => setTimeout(r, 800));
    }
  }
})();
