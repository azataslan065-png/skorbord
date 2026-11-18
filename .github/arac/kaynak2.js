const al = async u => { try{ const r = await fetch(u); return r.ok ? r.json() : { HATA: r.status }; }catch(e){ return { HATA: e.message }; } };
(async () => {
  const fs = require('fs'); const s = fs.readFileSync('gercek.js', 'utf8'); const m = /var LIGLER=\[([\s\S]*?)\n\];/.exec(s);
  const bizim = [...m[1].matchAll(/\['([^']+)','[^']+','[^']+'(,'\d+')?\]/g)].filter(x => !x[2]).map(x => x[1]);
  const o = {};
  for(const sl of bizim){ const k = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + sl + '/scoreboard'); const l = (k.leagues || [])[0] || {}; o[sl] = [l.id || '', (l.logos && l.logos[0] && l.logos[0].href) || '']; }
  console.log('ESLEME ' + JSON.stringify(o));
  const j = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=20261121&limit=1000');
  const ids = new Set(Object.values(o).map(x => String(x[0]))); let bizimde = 0, disari = {};
  (j.events || []).forEach(e => { const lid = (/l:(\d+)/.exec(e.uid || '') || [])[1]; if(ids.has(lid)) bizimde++; else disari[lid] = (disari[lid] || 0) + 1; });
  console.log('KAPSAM bizim ligler', bizimde, 'diğer', JSON.stringify(disari));
})();
