// Geçici deneme (salt okunur): TRT Spor yayın akışının yapısı ve bugünkü maç kayıtları.
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' };
const al = async u => { try{ const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40000) }); return { s: r.status, son: r.url, t: await r.text() }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
const yapi = (o, d) => { if(d > 3 || !o || typeof o !== 'object') return Array.isArray(o) ? '[]' : typeof o; const r = {}; for(const k of Object.keys(o).slice(0, 25)){ const v = o[k]; r[k] = Array.isArray(v) ? ('[' + v.length + '] ' + JSON.stringify(yapi(v[0], d + 1))) : (v && typeof v === 'object' ? yapi(v, d + 1) : (typeof v === 'string' ? v.slice(0, 40) : v)); } return r; };
(async () => {
  for(const u of ['https://www.trtspor.com.tr/yayin-akisi/trt-spor', 'https://www.trtspor.com.tr/yayin-akisi/trt-spor-yildiz', 'https://www.trtspor.com.tr/yayin-akisi/tabii-spor', 'https://www.trtspor.com.tr/yayin-akisi/tabii-spor-1']){
    const r = await al(u); const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(r.t); console.log('\nSAYFA', u, r.s, '→', r.son, 'nd', !!m);
    if(!m) continue; let j; try{ j = JSON.parse(m[1]); }catch(e){ console.log('json hata'); continue; }
    const pp = j.props && j.props.pageProps; console.log('YAPI', JSON.stringify(yapi(pp, 0)).slice(0, 2500));
    // içinde tarih/saat/başlık taşıyan dizileri bul
    const diz = []; const gez = (x, yol) => { if(!x || typeof x !== 'object') return; if(Array.isArray(x)){ if(x.length && x[0] && typeof x[0] === 'object' && Object.keys(x[0]).some(k => /title|name|baslik|program/i.test(k))) diz.push([yol, x]); x.forEach((y, i) => i < 3 && gez(y, yol + '[' + i + ']')); return; } Object.keys(x).forEach(k => gez(x[k], yol + '.' + k)); };
    gez(pp, 'pp');
    diz.slice(0, 6).forEach(([yol, x]) => { console.log('DİZİ', yol, x.length, JSON.stringify(x[0]).slice(0, 600));
      x.filter(e => /ğdır|Igdir|IĞDIR|Iğdır|Ümraniye|UMRANIYE|1\. ?Lig|Trendyol 1/i.test(JSON.stringify(e))).slice(0, 6).forEach(e => console.log('   MAÇ?', JSON.stringify(e).slice(0, 500))); });
    console.log('BUILD', j.buildId, 'sayfa', j.page, 'sorgu', JSON.stringify(j.query));
  }
})();
