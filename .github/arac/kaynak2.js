// Deneme 25: yayıncıların YouTube kanalları (A Spor, ATV, Tivibu Spor, Sıfır TV)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };
(async () => {
  for(const k of ['@aspor', '@ASpor', '@atv', '@atvcomtr', '@TivibuSpor', '@tivibuspor', '@tivibu', '@SifirTV', '@sifirtv', '@TRTSpor', '@tabiispor']){
    try{ const r = await fetch('https://www.youtube.com/' + k + '/streams', { headers: UA }); const t = await r.text();
      const id = /"externalId":"(UC[^"]+)"/.exec(t), ad = /<meta property="og:title" content="([^"]+)"/.exec(t), onay = /BADGE_STYLE_TYPE_VERIFIED/.test(t), n = (t.match(/"lockupViewModel":\{/g) || []).length;
      const bas = [...t.matchAll(/"lockupMetadataViewModel":\{"title":\{"content":"([^"]+)"/g)].slice(0, 4).map(m => m[1]);
      console.log('=====', k, r.status, id && id[1], ad && ad[1], 'onay', onay, 'yayın', n, bas.join(' | ')); }catch(e){ console.log('=====', k, 'HATA', e.message); }
  }
})();
