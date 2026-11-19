// Geçici deneme (salt okunur): TFF maç sayfasında hakem var mı; TRT Spor / tabii yayın akışı nereden okunur.
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' };
const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({}, UA, h || {}), signal: AbortSignal.timeout(40000) }); const b = Buffer.from(await r.arrayBuffer());
  const t = /utf-8/i.test(r.headers.get('content-type') || '') || !/tff\.org/.test(u) ? b.toString('utf8') : new TextDecoder('windows-1254').decode(b); return { s: r.status, ct: r.headers.get('content-type'), t, son: r.url }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const duz = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
(async () => {
  for(const id of ['318230', '318231', '318233', '318237']){
    const r = await al('https://www.tff.org/Default.aspx?pageID=29&macID=' + id);
    const hk = [...r.t.matchAll(/lnkHakem"[^>]*>([^<]+?)\(([^()<]+)\)<\/a>/g)].map(m => m[1].trim() + ' (' + m[2] + ')');
    const i = r.t.indexOf('Hakem'); console.log('TFF', id, r.s, 'boy', r.t.length, 'hakem:', JSON.stringify(hk), '| çevre:', duz(r.t.slice(Math.max(0, i - 300), i + 500)).slice(0, 400));
  }
  const adaylar = ['https://www.trtspor.com.tr/yayin-akisi', 'https://www.trtspor.com.tr/yayin-akisi.html', 'https://www.trt.net.tr/yayin-akisi', 'https://www.trt.net.tr/kurumsal/yayin-akisi',
    'https://www.tabii.com/tr/yayin-akisi', 'https://www.tabii.com/tr/live', 'https://www.trtizle.com/yayin-akisi/trt-spor', 'https://www.trtizle.com/canli/tv/trt-spor',
    'https://www.trtspor.com.tr/canli-yayin-akisi', 'https://www.trt.net.tr/yayin-akisi/trt-spor', 'https://www.trtspor.com.tr/futbol/tff-1-lig'];
  for(const u of adaylar){ const r = await al(u); const t = duz(r.t); const k = t.search(/ğdır|Igdir|IĞDIR|Iğdır|Ümraniye|1\. Lig|Trendyol 1/i);
    console.log('ADAY', u, r.s, r.ct, '→', r.son, 'boy', r.t.length, '| nd', /__NEXT_DATA__/.test(r.t), '| maç izi', k, k >= 0 ? t.slice(Math.max(0, k - 200), k + 300) : t.slice(0, 200)); }
  // TRT izle API izleri
  const r = await al('https://www.trtizle.com/canli/tv/trt-spor'); const api = [...new Set([...r.t.matchAll(/https?:\/\/[a-z0-9.-]*trt[a-z0-9.-]*\/[A-Za-z0-9_\/.-]*(?:epg|guide|yayin|program|schedule)[A-Za-z0-9_\/.?=&-]*/gi)].map(m => m[0]))].slice(0, 20);
  console.log('TRTİZLE API İZLERİ', JSON.stringify(api));
  // EPG kaynaklarında TRT Spor kanalı ve programları
  const zlib = require('zlib');
  for(const u of ['https://iptv-epg.org/files/epg-tr.xml', 'https://www.open-epg.com/files/turkey1.xml', 'https://epgshare01.online/epgshare01/epg_ripper_TR1.xml.gz', 'https://www.open-epg.com/files/turkey2.xml', 'https://www.open-epg.com/files/turkey3.xml']){
    try{ const x = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(90000) }); let b = Buffer.from(await x.arrayBuffer()); if(b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b); const s = b.toString('utf8');
      const kan = [...new Set([...s.matchAll(/channel="([^"]+)"/g)].map(m => m[1]))].filter(c => /trt|tabii/i.test(c));
      const pr = [...s.matchAll(/<programme start="([^"]+)"[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)].filter(m => /trt.?spor|tabii/i.test(m[2]) && /2026112[0-2]/.test(m[1])).map(m => m[1].slice(0, 12) + ' ' + m[2] + ' ' + ((/<title[^>]*>([^<]*)</.exec(m[3]) || [])[1] || '')).slice(0, 40);
      console.log('EPG', u, x.status, 'TRT kanalları', JSON.stringify(kan), '\n  20-22 Kasım TRT programları:', JSON.stringify(pr)); }catch(e){ console.log('EPG', u, 'HATA', e.message); }
  }
})();
