// Deneme 6: beIN maç merkezi istemci kodundaki veri servisleri (yayın ekibi alanı var mı)
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, h || {}) }); return { s: r.status, t: await r.text() }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const p = await al('https://beinsports.com.tr/mac-merkezi/gaziantep-fk-kasimpasa/1515839');
  const src = [...new Set(p.t.match(/\/_next\/static\/[^"']+\.js/g) || [])]; console.log('===== betikler', src.length);
  const hosts = new Set(), yollar = new Set(), alan = new Set();
  for(const s of src){ const r = await al('https://beinsports.com.tr' + s); const t = r.t;
    (t.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[A-Za-z0-9_\-\/.]*)?/g) || []).forEach(u => { if(!/w3\.org|schema\.org|reactjs|github|google|facebook|twitter|instagram|youtube|apple|tiktok/.test(u)) hosts.add(u.slice(0, 90)); });
    (t.match(/["'`]\/?(api|v1|v2|match|matches|mac|livescore|broadcast|tvguide)[A-Za-z0-9_\-\/]*["'`]/gi) || []).forEach(u => yollar.add(u.slice(0, 80)));
    ['commentator', 'Commentator', 'spiker', 'Spiker', 'yorumcu', 'Yorumcu', 'announcer', 'referee', 'Referee', 'broadcaster', 'channelName'].forEach(w => { const i = t.indexOf(w); if(i >= 0) alan.add(w + ' :: ' + t.slice(Math.max(0, i - 160), i + 160).replace(/\s+/g, ' ')); });
  }
  console.log('HOSTLAR', [...hosts].slice(0, 60)); console.log('YOLLAR', [...yollar].slice(0, 80)); console.log('ALANLAR'); [...alan].forEach(x => console.log('  ', x));
})();
