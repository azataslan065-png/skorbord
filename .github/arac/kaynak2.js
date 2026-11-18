// Deneme 46: Sultanlar Ligi kaynağı (TVF) — sayfa / API izleri
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, signal: AbortSignal.timeout(30000) }); const t = await r.text(); return { s: r.status, t, u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  if (process.env.PARCA !== '0') return;
  for (const u of ['https://www.tvf.org.tr/', 'https://www.tvf.org.tr/sultanlar-ligi', 'https://www.tvf.org.tr/ligler/sultanlar-ligi', 'https://fixture.tvf.org.tr/', 'https://www.sultanlarligi.org/', 'https://tvf.org.tr/organizasyonlar']) {
    const x = await al(u); const links = [...new Set((x.t.match(/href="([^"]*(sultan|fikst|puan|lig)[^"]*)"/gi) || []))].slice(0, 15).join(' ');
    console.log('T', x.s, u, '→', x.u, x.t.length, '| api:', [...new Set(x.t.match(/https?:\/\/[a-z0-9.-]*\/(api|ajax|wp-json)[^"' ]{0,80}/gi) || [])].slice(0, 6).join(' '), '| bağlantı:', links);
  }
})();
