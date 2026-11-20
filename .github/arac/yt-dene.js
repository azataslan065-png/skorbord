// Geçici deneme (salt okunur): XMLTV akışlarında hangi spor kanalları var; bu akşamki Al Nassr maçı hangi kanalda; kanal sitelerinin yayın akışı sayfaları.
const zlib = require('zlib');
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' };
(async () => {
  const EPG = ['https://iptv-epg.org/files/epg-tr.xml', 'https://www.open-epg.com/files/turkey1.xml', 'https://www.open-epg.com/files/turkey2.xml', 'https://www.open-epg.com/files/turkey3.xml', 'https://epgshare01.online/epgshare01/epg_ripper_TR1.xml.gz'];
  for(const u of EPG){
    try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(90000) }); let b = Buffer.from(await r.arrayBuffer()); if(b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b); const x = b.toString('utf8');
      const say = {}; for(const m of x.matchAll(/<programme start="(\d{8})[^"]*"[^>]*channel="([^"]+)"/g)) if(m[1] >= '20261120') say[m[2]] = (say[m[2]] || 0) + 1;
      const kan = Object.keys(say).filter(c => /spor|sport|bein|atv|tv8|trt|tivibu|smart|exxen|tabii|ht|dazn|eurosport|nba|tod/i.test(c));
      console.log('\nEPG', u, 'spor kanalları:', kan.map(c => c + '(' + say[c] + ')').join(', '));
      for(const m of x.matchAll(/<programme start="([^"]+)"[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)){ const ti = (/<title[^>]*>([^<]*)</.exec(m[3]) || [])[1] || '', de = (/<desc[^>]*>([^<]*)</.exec(m[3]) || [])[1] || '';
        if(/nassr|nasr|ahli|hilal|ittihad|suudi|saudi|roshn|türkiye -|- türkiye|milli maç|uluslar ligi/i.test(ti + ' ' + de) && /^2026112[0-3]/.test(m[1])) console.log('   MAÇ', m[1].slice(0, 12), m[2], '|', ti.slice(0, 80), '|', de.slice(0, 80)); } }catch(e){ console.log('EPG', u, 'HATA', e.message); }
  }
  for(const u of ['https://www.ssport.tv/yayin-akisi', 'https://www.ssport.tv/tr/yayin-akisi', 'https://www.aspor.com.tr/yayin-akisi', 'https://www.htspor.com/yayin-akisi', 'https://www.htspor.com/canli-yayin-akisi', 'https://www.tivibu.com.tr/yayin-akisi', 'https://www.tivibuspor.com.tr/yayin-akisi', 'https://www.dsmart.com.tr/yayin-akisi', 'https://www.atv.com.tr/yayin-akisi', 'https://www.tv8.com.tr/yayin-akisi', 'https://www.tv85.com.tr/yayin-akisi']){
    try{ const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); const t = await r.text(); const d = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const k = d.search(/Nassr|Nasr|Ahli|Hilal|Suudi|Saudi/i);
      console.log('SİTE', u, r.status, '→', r.url, 'boy', t.length, 'nd', /__NEXT_DATA__/.test(t), 'json-ld', /application\/ld\+json/.test(t), '| iz', k >= 0 ? d.slice(Math.max(0, k - 150), k + 200) : d.slice(0, 160)); }catch(e){ console.log('SİTE', u, 'HATA', e.message); }
  }
})();
