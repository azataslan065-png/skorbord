// Deneme 9: YouTube arama (canlı süzgeci) ve kanal yayın sayfaları anahtarsız okunabiliyor mu
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' } }); return { s: r.status, t: await r.text() }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const veri = t => { const m = /var ytInitialData = (\{[\s\S]*?\});<\/script>/.exec(t); try{ return m ? JSON.parse(m[1]) : null; }catch(e){ return null; } };
const videolar = j => { const o = []; const gez = x => { if(!x || typeof x !== 'object') return; if(x.videoRenderer){ const v = x.videoRenderer; o.push({ id: v.videoId, b: (v.title && v.title.runs || []).map(r => r.text).join(''), k: v.ownerText && v.ownerText.runs && v.ownerText.runs[0].text,
  canli: JSON.stringify(v.badges || '').includes('LIVE') || JSON.stringify(v.thumbnailOverlays || '').includes('LIVE'), yak: !!v.upcomingEventData, bas: v.upcomingEventData && v.upcomingEventData.startTime }); return; } Object.values(x).forEach(gez); }; gez(j); return o; };
(async () => {
  for(const q of ['2. Lig canlı', '3. Lig canlı maç', 'canlı maç futbol', 'Süper Lig canlı']){
    const r = await al('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=EgJAAQ%253D%253D'); const v = videolar(veri(r.t)); console.log('===== ARAMA', q, r.s, r.t.length, v.length); v.slice(0, 8).forEach(x => console.log('  ', JSON.stringify(x)));
  }
  for(const k of ['@htspor', '@bikanaltv', '@TFF', '@tivibu', '@TRTSpor']){
    const r = await al('https://www.youtube.com/' + k + '/streams'); const v = videolar(veri(r.t)); console.log('===== KANAL', k, r.s, r.t.length, v.length); v.slice(0, 5).forEach(x => console.log('  ', JSON.stringify(x)));
  }
  const w = await al('https://www.youtube.com/watch?v=jfKfPfyJRdk'); console.log('===== İZLE', w.s, w.t.length, /isLiveContent":true/.test(w.t), /confirm you.re not a bot/i.test(w.t), /"playableInEmbed":(true|false)/.exec(w.t));
})();
