// Geçici deneme (salt okunur): TRT Spor yayın akışındaki program kayıtları.
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' };
(async () => {
  for(const u of ['https://www.trtspor.com.tr/yayin-akisi/trt-spor', 'https://www.trtspor.com.tr/yayin-akisi/tabii-spor']){
    const t = await (await fetch(u, { headers: UA })).text(); const j = JSON.parse(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(t)[1]);
    const cd = j.props.pageProps.pageComponents.componentData;
    console.log('\nSAYFA', u, 'bileşen', cd.length, cd.map(c => Object.keys(c).join('/')).join(' ; '));
    const s = JSON.stringify(cd); console.log('BOY', s.length);
    const k = s.search(/ĞDIR|Iğdır|IGDIR|Igdır|ÜMRANİYE|Ümraniye|1\. LİG|1\. Lig|TRENDYOL 1/); console.log('İZ', k, k >= 0 ? s.slice(Math.max(0, k - 1500), k + 1200) : '');
    // ilk program kaydının tam hali
    const m = /\{[^{}]*"(?:startTime|start|startDate|beginTime|airTime)"[^{}]*\}/.exec(s); console.log('ÖRNEK', m ? m[0].slice(0, 800) : s.slice(0, 1500));
  }
})();
