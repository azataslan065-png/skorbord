// Geçici deneme (salt okunur): TRT Spor / TRT Spor Yıldız / tabii Spor program başlıkları (bütün günler)
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' };
(async () => {
  const t = await (await fetch('https://www.trtspor.com.tr/yayin-akisi/trt-spor', { headers: UA })).text(); const j = JSON.parse(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(t)[1]);
  let epg = null; const gez = x => { if(!x || typeof x !== 'object' || epg) return; if(Array.isArray(x.epg)){ epg = x.epg; return; } Object.values(x).forEach(gez); }; gez(j.props.pageProps);
  console.log('GÜNLER', epg.map(g => g.date + ':' + g.tvChannels.map(c => c.slug + '=' + ((c.past || []).length + (c.upcoming || []).length)).join(',')).join(' | '));
  epg.forEach(g => g.tvChannels.forEach(c => [].concat(c.past || [], c.upcoming || []).forEach(p => { if(/ - |–| vs\.? /i.test(p.title) || /canlı|CANLI|naklen/i.test(p.title + ' ' + p.synopsis)) console.log('P', g.date, c.slug, p.starttime, '|', p.title, '|', (p.synopsis || '').slice(0, 160), '| tekrar', p.isRepeat); })));
})();
