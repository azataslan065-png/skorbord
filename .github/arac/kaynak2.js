// Deneme 17: Maçkolik TV programı veri servisi (ajax/tv-guide?dayOffset=N)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://www.mackolik.com/tvprogrami' };
(async () => {
  for(const d of [0, 1, 2, 3]){
    let r, t = ''; try{ r = await fetch('https://www.mackolik.com/ajax/tv-guide?dayOffset=' + d, { headers: UA }); t = await r.text(); }catch(e){ console.log('HATA', e.message); continue; }
    console.log('===== gün', d, r.status, t.length); let j = null; try{ j = JSON.parse(t); }catch(e){}
    const h = (j && j.data && j.data.html) || t; const m = h.replace(/<[^>]+>/g, ' | ').replace(/(\s*\|\s*)+/g, ' | ').replace(/\s+/g, ' ');
    console.log(m.slice(0, 2500));
    const i = h.search(/spiker|yorumcu|commentat/i); if(i >= 0) console.log('HAM', h.slice(Math.max(0, i - 1500), i + 1000).replace(/\s+/g, ' '));
    else console.log('HAM baş', h.slice(0, 2500).replace(/\s+/g, ' '));
  }
})();
