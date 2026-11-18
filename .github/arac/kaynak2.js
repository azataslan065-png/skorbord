// Deneme 23: Google Haberler RSS'inde "maçı kim anlatıyor" haberleri (spiker / yorumcu / kanal), Open-Meteo
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, redirect: 'follow' }); return { s: r.status, t: await r.text(), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const ent = s => String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
(async () => {
  for(const q of ['Fenerbahçe Galatasaray maçı spiker', 'Galatasaray Barcelona spiker kim', 'Konyaspor Galatasaray maçını kim anlatıyor', 'maçı kim anlatıyor spiker yorumcu']){
    const r = await al('https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=tr&gl=TR&ceid=TR:tr'); const it = [...r.t.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    console.log('=====', q, r.s, it.length);
    it.slice(0, 6).forEach(x => { const t = ent((/<title>([\s\S]*?)<\/title>/.exec(x) || [])[1]), d = ent((/<description>([\s\S]*?)<\/description>/.exec(x) || [])[1]), l = ((/<link>([\s\S]*?)<\/link>/.exec(x) || [])[1] || ''), p = ent((/<pubDate>([\s\S]*?)<\/pubDate>/.exec(x) || [])[1]); console.log('  -', p, '|', t, '||', d.slice(0, 200), '||', l.slice(0, 90)); });
    if(it[0]){ const l = (/<link>([\s\S]*?)<\/link>/.exec(it[0]) || [])[1]; const a = await al(l); const tx = ent(a.t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')); const i = tx.search(/spiker|anlat/i); console.log('  MAKALE', a.s, a.u.slice(0, 100), tx.length, tx.slice(Math.max(0, i - 300), i + 700)); }
  }
  const w = await al('https://api.open-meteo.com/v1/forecast?latitude=41.10&longitude=28.99&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&timezone=Europe%2FIstanbul&forecast_days=3'); console.log('===== OPENMETEO', w.s, w.t.slice(0, 300));
})();
