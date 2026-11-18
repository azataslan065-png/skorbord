// Deneme 11: Maçkolik canlı sonuçlar sayfasının veri yolu; TFF resmî YouTube kanalının yayınlar sekmesi
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({}, UA, h || {}) }); return { s: r.status, t: await r.text(), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const r = await al('https://www.mackolik.com/canli-sonuclar'); const t = r.t;
  console.log('===== MK betikler', [...new Set(t.match(/<script[^>]+src="[^"]+"/g) || [])].slice(0, 12));
  console.log('MK ajax/api', [...new Set(t.match(/["'](\/[a-z0-9_\-\/]*(ajax|api|json|perform)[a-z0-9_\-\/?=&.]*)["']/gi) || [])].slice(0, 30));
  console.log('MK data-', [...new Set(t.match(/data-[a-z\-]+="[^"]{0,60}"/g) || [])].slice(0, 30));
  const i = t.search(/match-row|matchId|data-match/i); console.log('MK örnek', t.slice(Math.max(0, i - 300), i + 1500).replace(/\s+/g, ' '));
  const y = await al('https://www.youtube.com/channel/UCVoNfzLtczc_TV8-xKjcmKg/streams');
  console.log('===== YT TFF', y.s, y.t.length, 'videoRenderer', (y.t.match(/"videoRenderer"/g) || []).length, 'richItem', (y.t.match(/"richItemRenderer"/g) || []).length, 'lockupViewModel', (y.t.match(/"lockupViewModel"/g) || []).length, 'ownerBadges', /BADGE_STYLE_TYPE_VERIFIED/.test(y.t));
  const k = y.t.indexOf('"richItemRenderer"'); console.log(y.t.slice(k, k + 2500));
  const l = y.t.indexOf('"lockupViewModel":{'); if(l > 0) console.log('LOCKUP', y.t.slice(l, l + 2500));
})();
