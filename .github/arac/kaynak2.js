// Deneme 47: TVF Sultanlar Ligi sayfa yapısı
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, signal: AbortSignal.timeout(30000) }); return { s: r.status, t: await r.text(), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  if (process.env.PARCA !== '0') return;
  for (const u of ['https://tvf.org.tr/lig/sultanlar-ligi', 'https://tvf.org.tr/lig-fikstur/sultanlar-ligi', 'https://tvf.org.tr/lig-fikstur/efeler-ligi']) {
    const x = await al(u); const t = x.t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    console.log('=====', x.s, u, '→', x.u, x.t.length);
    const i = t.search(/Fenerbah|Vak[ıi]fBank|Eczac/i); console.log('HTML', t.slice(Math.max(0, i - 2500), i + 2500).replace(/\s+/g, ' '));
    const metin = t.replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').replace(/(\|\s*)+/g, '|'); const k = metin.search(/Fenerbah|Vak[ıi]fBank/i); console.log('METIN', metin.slice(Math.max(0, k - 800), k + 2500));
    console.log('VERI', [...new Set(x.t.match(/(data-[a-z-]+="[^"]{0,60}"|\/api\/[^"' ]{0,80}|\.json[^"' ]{0,40})/gi) || [])].slice(0, 25).join(' '));
  }
})();
