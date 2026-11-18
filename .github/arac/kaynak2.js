const al = async u => { try{ const r = await fetch(u); return r.ok ? r.json() : { HATA: r.status }; }catch(e){ return { HATA: e.message }; } };
(async () => {
  const fs = require('fs'); const s = fs.readFileSync('gercek.js', 'utf8'); const m = /var LIGLER=\[([\s\S]*?)\n\];/.exec(s);
  const bizim = [...m[1].matchAll(/\['([^']+)'/g)].map(x => x[1]);
  for(const d of ['20261121', '20261122', '20261118']){
    const j = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=' + d + '&limit=1000');
    const L = (j.leagues || []); const ev = j.events || [];
    const say = {}; ev.forEach(e => { const lid = (/l:(\d+)/.exec(e.uid || '') || [])[1]; say[lid] = (say[lid] || 0) + 1; });
    const slugBy = {}; L.forEach(l => { slugBy[l.id] = l.slug; });
    console.log('TARİH', d, 'olay', ev.length, 'lig', L.length, 'örnek lig alanları', JSON.stringify(Object.keys(L[0] || {})).slice(0, 300));
    const var_ = new Set(L.map(l => l.slug));
    let eksik = [];
    for(const sl of bizim){ if(var_.has(sl)) continue; const k = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + sl + '/scoreboard?dates=' + d); const n = (k.events || []).length; if(n) eksik.push(sl + ':' + n); }
    console.log('  all içinde olmayıp kendi kaydında maçı olan ligler:', eksik.join(' '));
    console.log('  all içindeki bizim ligler:', bizim.filter(x => var_.has(x)).join(' '));
  }
})();
