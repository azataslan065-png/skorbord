// Deneme 26: Türkiye kanallarının yayın akışı (XMLTV) kaynakları: beIN, S Sport, tabii Spor, TRT Spor, Tivibu Spor, A Spor kanal kanal
const zlib = require('zlib');
const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) }); let b = Buffer.from(await r.arrayBuffer()); if(/\.gz$/.test(u) || (b[0] === 0x1f && b[1] === 0x8b)) b = zlib.gunzipSync(b); return { s: r.status, t: b.toString('utf8') }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  for(const u of ['https://iptv-epg.org/files/epg-tr.xml', 'https://iptv-epg.org/files/epg-tr.xml.gz', 'https://epgshare01.online/epgshare01/epg_ripper_TR1.xml.gz', 'https://epgshare01.online/epgshare01/epg_ripper_TR2.xml.gz', 'https://www.open-epg.com/files/turkey1.xml', 'https://www.open-epg.com/files/turkey2.xml']){
    const r = await al(u); const t = r.t; const kanallar = [...t.matchAll(/<channel id="([^"]+)"[\s\S]*?<display-name[^>]*>([^<]+)</g)].map(m => m[1] + '=' + m[2]);
    const spor = kanallar.filter(k => /bein|s ?sport|tabii|trt ?spor|tivibu|a ?spor|exxen|tv8|atv|trt ?1/i.test(k));
    console.log('=====', u, r.s, t.length, 'kanal', kanallar.length, 'spor', spor.length); console.log('  ', spor.slice(0, 60).join(' | '));
    const pr = [...t.matchAll(/<programme start="([^"]+)"[^>]*channel="([^"]+)"[^>]*>\s*<title[^>]*>([^<]+)</g)].filter(m => /bein|sport|tabii|spor|tivibu/i.test(m[2]) && / - | – |vs\.? /i.test(m[3]));
    console.log('  maç programı', pr.length, pr.slice(0, 12).map(m => m[1].slice(0, 12) + ' ' + m[2] + ' ' + m[3]).join(' | '));
    const tarih = [...new Set([...t.matchAll(/<programme start="(\d{8})/g)].map(m => m[1]))].sort(); console.log('  günler', tarih.slice(0, 3), '…', tarih.slice(-3));
  }
})();
