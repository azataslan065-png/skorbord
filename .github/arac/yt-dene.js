// Geçici deneme (salt okunur): şu an YouTube'daki Suudi Pro Lig yayını; arama sonuçlarının biçimi; aday maçlar.
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };
const sayfa = async u => { try{ const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); return await r.text(); }catch(e){ return ''; } };
const veri = h => { const m = /var ytInitialData = (\{[\s\S]*?\});<\/script>/.exec(h); try{ return m ? JSON.parse(m[1]) : null; }catch(e){ return null; } };
function videolar(j){ const o = []; const gez = x => { if(!x || typeof x !== 'object') return;
  if(x.videoRenderer){ const v = x.videoRenderer, s = JSON.stringify; o.push({ tur: 'vR', v: v.videoId, b: ((v.title && v.title.runs) || []).map(r => r.text).join(''), k: (v.ownerText && v.ownerText.runs && v.ownerText.runs[0].text) || '', canli: /LIVE/.test(s(v.badges || '') + s(v.thumbnailOverlays || '')), onay: /VERIFIED|BADGE_STYLE_TYPE_VERIFIED/.test(s(v.ownerBadges || '')) }); return; }
  if(x.lockupViewModel && x.lockupViewModel.contentId){ const v = x.lockupViewModel, s = JSON.stringify(v), md = v.metadata && v.metadata.lockupMetadataViewModel;
    const satir = md && md.metadata && md.metadata.contentMetadataViewModel && md.metadata.contentMetadataViewModel.metadataRows || [];
    const kanal = (satir[0] && satir[0].metadataParts && satir[0].metadataParts[0] && satir[0].metadataParts[0].text && satir[0].metadataParts[0].text.content) || '';
    o.push({ tur: 'lockup', v: v.contentId, b: (md && md.title && md.title.content) || '', k: kanal, canli: /BADGE_STYLE_LIVE|"CANLI"|"LIVE"|"Canlı"/.test(s), onay: /CHECK_CIRCLE_FILLED|VERIFIED|isVerified/.test(s) }); return; }
  Object.values(x).forEach(gez); }; gez(j); return o; }
(async () => {
  // ESPN: bugünün Suudi maçları
  const d = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');
  const sb = await (await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/sau.1/scoreboard?dates=' + d)).json();
  (sb.events || []).forEach(e => console.log('ESPN', e.date, e.name, (e.status && e.status.type && e.status.type.name)));
  for(const q of ['Saudi Pro League live', 'روشن الدوري السعودي مباشر', 'ROSHN Saudi League live', (sb.events && sb.events[0] ? sb.events[0].name.replace(' at ', ' vs ') + ' live' : 'Al Hilal live')]){
    const h = await sayfa('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=EgJAAQ%253D%253D');
    const l = videolar(veri(h)); console.log('\nARA', q, 'sonuç', l.length); l.slice(0, 10).forEach(v => console.log('  ', v.tur, v.canli ? 'CANLI' : '-----', v.onay ? 'ONAY' : '----', '|', v.k, '|', v.b.slice(0, 90), '|', v.v));
  }
  // kanal adayları
  for(const c of ['@SaudiProLeague', '@SPL', '@RoshnSaudiLeague', '@spl.sa', '@SaudiLeague']){
    const h = await sayfa('https://www.youtube.com/' + c + '/streams'); const j = veri(h);
    const id = /"channelId":"(UC[\w-]{22})"/.exec(h); const ad = /<meta property="og:title" content="([^"]+)"/.exec(h);
    const l = videolar(j).filter(v => v.canli).slice(0, 5); console.log('KANAL', c, id ? id[1] : '-', ad ? ad[1] : '-', 'canlı', l.map(v => v.b.slice(0, 70)).join(' || '));
  }
})();
