// Deneme 33: lig logoları — Wikidata P154 (enwiki başlığından) ve TheSportsDB rozetleri
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'SkorbordBot/1.0 (github.com/skorbord)' }, signal: AbortSignal.timeout(30000) }); return await r.json(); }catch(e){ return null; } };
const W = require('./lig-wiki.json');
(async () => {
  const ks = Object.keys(W);
  for (let i = 0; i < ks.length; i += 40) {
    const parca = ks.slice(i, i + 40);
    const j = await al('https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&redirects=yes&props=claims|sitelinks&sitefilter=enwiki&format=json&titles=' + encodeURIComponent(parca.map(k => W[k]).join('|')));
    const E = (j && j.entities) || {};
    for (const k of parca) {
      const e = Object.values(E).find(x => x.sitelinks && x.sitelinks.enwiki && x.sitelinks.enwiki.title.toLowerCase() === W[k].toLowerCase());
      const c = e && e.claims && e.claims.P154;
      console.log('WD', k, e ? e.id : 'BULUNAMADI', c ? c.map(x => (x.mainsnak.datavalue || {}).value + '[' + x.rank + (x.qualifiers && x.qualifiers.P580 ? ' ' + x.qualifiers.P580[0].datavalue.value.time.slice(1, 5) : '') + (x.qualifiers && x.qualifiers.P582 ? '-' + x.qualifiers.P582[0].datavalue.value.time.slice(1, 5) : '') + ']').join(' | ') : '-');
    }
  }
  for (const c of ['Turkey', 'England', 'Spain', 'Italy', 'Germany', 'France', 'Netherlands', 'Portugal', 'Belgium', 'Scotland', 'Greece', 'Russia', 'Austria', 'Switzerland', 'Denmark', 'Norway', 'Sweden', 'Saudi Arabia', 'Japan', 'China', 'India', 'Australia', 'USA', 'Mexico', 'Brazil', 'Argentina', 'Colombia', 'Chile', 'Uruguay', 'Ecuador', 'Peru', 'Paraguay', 'Bolivia', 'Costa Rica', 'South Africa', 'Worldwide']) {
    const j = await al('https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?s=Soccer&c=' + encodeURIComponent(c));
    const l = (j && (j.countries || j.countrys)) || [];
    console.log('TS', c, l.slice(0, 14).map(x => x.idLeague + ':' + x.strLeague + (x.strBadge ? '' : '(rozetsiz)')).join(' ; '));
  }
})();
