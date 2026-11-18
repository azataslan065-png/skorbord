// Deneme 34: lig logoları — Wikipedia sayfa görseli (pageimages, lisans: hepsi)
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'SkorbordBot/1.0 (github.com/skorbord)' }, signal: AbortSignal.timeout(30000) }); return await r.json(); }catch(e){ return null; } };
const W = require('./lig-wiki.json');
const TR = { 'tur.1': 'Süper Lig', 'tur.2': 'TFF 1. Lig', 'tur.3': 'TFF 2. Lig', 'tur.4': 'TFF 3. Lig', 'tur.cup': 'Türkiye Kupası', 'tur.super': 'Türkiye Süper Kupası' };
async function pi(site, map){
  const ks = Object.keys(map), o = {};
  for (let i = 0; i < ks.length; i += 45) {
    const parca = ks.slice(i, i + 45);
    const j = await al('https://' + site + '.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail|name&pithumbsize=256&pilicense=any&pilimit=50&titles=' + encodeURIComponent(parca.map(k => map[k]).join('|')));
    const q = (j && j.query) || {}; const ad = {}; parca.forEach(k => ad[map[k]] = k);
    (q.normalized || []).forEach(n => { if (ad[n.from]) ad[n.to] = ad[n.from]; }); (q.redirects || []).forEach(n => { if (ad[n.from]) ad[n.to] = ad[n.from]; });
    Object.values(q.pages || {}).forEach(p => { const k = ad[p.title]; if (k) o[k] = p.thumbnail ? p.pageimage + ' ' + p.thumbnail.source : '-'; });
  }
  return o;
}
(async () => {
  const en = await pi('en', W), tr = await pi('tr', TR);
  Object.keys(W).forEach(k => console.log('EN', k, en[k] || 'YOK'));
  Object.keys(TR).forEach(k => console.log('TR', k, tr[k] || 'YOK'));
})();
