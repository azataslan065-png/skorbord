// Deneme 27: iptv-epg.org program başlık / saat biçimi; tabii Spor ve Tivibu Spor yayın akışı
const zlib = require('zlib');
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, h || {}), signal: AbortSignal.timeout(60000) }); let b = Buffer.from(await r.arrayBuffer()); if(b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b); return { s: r.status, t: b.toString('utf8'), u: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const r = await al('https://iptv-epg.org/files/epg-tr.xml'); const t = r.t;
  const pr = [...t.matchAll(/<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)].filter(m => /beINSPORTS[1-4]|TRTSPOR|ASpor/.test(m[3]));
  console.log('===== iptv-epg örnek', pr.length); pr.filter(m => /1121|1122/.test(m[1].slice(4, 8))).slice(0, 25).forEach(m => console.log('  ', m[1], m[3], m[4].replace(/\s+/g, ' ').slice(0, 260)));
  for(const u of ['https://www.tabii.com/tr/spor', 'https://www.tabii.com/tr/canli-tv', 'https://eu1.tabii.com/apigateway/catalog/v1/live', 'https://www.tivibu.com.tr/yayin-akisi', 'https://www.tivibu.com.tr/tv-rehberi', 'https://www.ssport.tv/yayin-akisi', 'https://www.aspor.com.tr/yayin-akisi']){
    const x = await al(u); const tx = x.t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('=====', u, x.s, x.u, x.t.length, '| api:', [...new Set(x.t.match(/https?:\/\/[a-z0-9.-]*(api|epg|guide|schedule)[a-z0-9.-]*\/[^"' ]{0,80}/gi) || [])].slice(0, 6).join(' '), '| metin:', tx.slice(0, 400));
    const nd = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(x.t); if(nd) console.log('   NEXT', nd[1].slice(0, 600));
  }
})();
