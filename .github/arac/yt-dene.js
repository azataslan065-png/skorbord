// Geçici deneme (salt okunur): kullanıcının gönderdiği YouTube yayını
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };
(async () => {
  const h = await (await fetch('https://www.youtube.com/watch?v=gcWaPe_LBMc', { headers: UA })).text();
  const g = (re) => { const m = re.exec(h); return m ? m[1] : '-'; };
  console.log('BAŞLIK', g(/<meta name="title" content="([^"]+)"/));
  console.log('KANAL', g(/"ownerChannelName":"([^"]+)"/), '| kimlik', g(/"channelId":"(UC[\w-]{22})"/), '| tutamak', g(/"canonicalBaseUrl":"\/(@[^"]+)"/));
  console.log('CANLI', g(/"isLiveNow":(true|false)/), '| canlı içerik', g(/"isLiveContent":(true|false)/), '| gömülebilir', g(/"playableInEmbed":(true|false)/), '| durum', g(/"playabilityStatus":\{"status":"([A-Z_]+)"/));
  console.log('ONAY', /BADGE_STYLE_TYPE_VERIFIED|"tooltip":"Doğrulandı"|"tooltip":"Verified"/.test(h), '| bölge', g(/"availableCountries":\[([^\]]{0,200})/));
  console.log('AÇIKLAMA', g(/"shortDescription":"([^"]{0,300})/));
  const cid = g(/"channelId":"(UC[\w-]{22})"/);
  const s = await (await fetch('https://www.youtube.com/channel/' + cid + '/streams', { headers: UA })).text();
  const t = [...s.matchAll(/"title":\{"runs":\[\{"text":"([^"]{5,120})"/g)].map(m => m[1]).slice(0, 12);
  console.log('KANAL YAYINLARI', JSON.stringify(t));
})();
