// SKORBORD VERİ TOPLAMA (2026-11-18, kullanıcı: "kupa dolapları boş, oyuncu fotoğrafları eksik, bazı ligler yüklenmiyor").
// Günde bir kez GitHub'da çalışır; her lig için veri/<lig>.json üretir. Uygulama yalnızca bu dosyayı okur (telefonlar dış kaynaklara gitmez).
//  · Kulüp: Wikidata (kuruluş, stadyum) + Vikipedi bilgi kutusu (kuruluş GÜN/AY/YIL). Kupalar: Wikidata'da kulübün kazandığı bütün sezonlar
//    (P1346 kazanan, P3450 hangi turnuvanın sezonu) → kuruluşundan bu yana, turnuva turnuva.
//  · Geçmiş sezonlar: ESPN puan durumu arşivi (2002'den beri; lige göre değişir) → sıra, puan, G-B-M, gol.
//  · Oyuncu fotoğrafları: Wikidata/Wikimedia Commons (ESPN oyuncu no P3681, yoksa kulübün oyuncuları arasında ad eşleşmesi); yazar ve lisans saklanır.
//  · ESPN'de olmayan ligler (TFF 1. Lig, TFF 2. Lig, İsviçre): TheSportsDB tur tur (ücretsiz anahtar) → maçlar dosyaya yazılır.
// Kullanım: node veri-topla.js [lig ...]   (lig verilmezse hepsi)   ·   --hizli : yalnızca TheSportsDB ligleri, yalnızca maçlar
const fs = require('fs'), path = require('path');
const KOK = process.cwd(), VERI = path.join(KOK, 'veri');
const UA = 'SkorbordVeri/1.0 (https://github.com/azataslan065-png/skorbord; acik veri)';
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/', ESPN_ST = 'https://site.api.espn.com/apis/v2/sports/soccer/';
const TSDB = 'https://www.thesportsdb.com/api/v1/json/123/';
const WD_SP = 'https://query.wikidata.org/sparql', WD_API = 'https://www.wikidata.org/w/api.php', COMMONS = 'https://commons.wikimedia.org/w/api.php';
const bek = ms => new Promise(r => setTimeout(r, ms));
const arg = process.argv.slice(2), HIZLI = arg.includes('--hizli'), SECILI = arg.filter(a => !a.startsWith('--'));
const OZET = [];

async function al(u, o){
  o = o || {};
  for(let i = 0; i < (o.deneme || 5); i++){
    try{
      const r = await fetch(u, { headers: Object.assign({ 'User-Agent': UA, 'Accept': o.accept || 'application/json' }, o.h || {}), signal: AbortSignal.timeout(o.sure || 45000) });
      if(r.status === 429 || r.status >= 500){ await bek((o.bekle || 3000) * (i + 1)); continue; }
      if(!r.ok) return null;
      const t = await r.text(); try{ return JSON.parse(t); }catch(e){ return o.metin ? t : null; }
    }catch(e){ await bek(2000 * (i + 1)); }
  }
  return null;
}
let _spSon = 0;
async function sparql(q){
  const g = Date.now() - _spSon; if(g < 700) await bek(700 - g); _spSon = Date.now();
  const j = await al(WD_SP + '?format=json&query=' + encodeURIComponent(q), { accept: 'application/sparql-results+json', sure: 60000, bekle: 5000, deneme: 3 });
  return (j && j.results && j.results.bindings) || [];
}
const v = (b, k) => b[k] ? b[k].value : '';
const qid = u => String(u || '').split('/').pop();
const parca = (a, n) => { const o = []; for(let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ø/g, 'o').replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const YAS_GEC = /\b(u ?1[5-9]|u ?2[0-3]|youth|academy|akademi|reserves?|women|womens|ladies|kadin|femenino|feminin|frauen|futsal|basketball|volleyball|beach)\b/i;

let TR_AD = {};
function trAdOku(){ try{ const s = fs.readFileSync(path.join(KOK, 'gercek.js'), 'utf8'); const m = /var TR_AD=\{([\s\S]*?)\n\};/.exec(s); if(m) TR_AD = Function('return {' + m[1] + '}')(); }catch(e){} }
function ligleriOku(){
  const s = fs.readFileSync(path.join(KOK, 'gercek.js'), 'utf8'); const m = /var LIGLER=\[([\s\S]*?)\n\];/.exec(s);
  return [...m[1].matchAll(/\['([^']+)','([^']+)','([^']+)'(?:,'([^']+)')?\]/g)].map(x => ({ slug: x[1], ad: x[2], obek: x[3], tsdb: x[4] || '' }));
}
function sezonAdi(y, iki){ return iki ? (y + '-' + String((y + 1) % 100).padStart(2, '0')) : String(y); }

// ── ESPN ──────────────────────────────────────────────────────────────────────────────────────────────
async function espnLig(L, eski){
  const sb = await al(ESPN + L.slug + '/scoreboard'); const lg = (sb && sb.leagues && sb.leagues[0]) || {}, sez = lg.season || {};
  const yil = sez.year || new Date().getFullYear();
  const iki = sez.startDate && sez.endDate && new Date(sez.endDate).getFullYear() > new Date(sez.startDate).getFullYear() && new Date(sez.endDate).getMonth() >= 1;
  const tj = await al(ESPN + L.slug + '/teams?limit=300'); const tl = ((((tj || {}).sports || [{}])[0].leagues || [{}])[0].teams || []).map(x => x.team || {});
  const takim = {};
  tl.forEach(t => { takim[t.id] = { ad: t.displayName || t.name, kisa: t.shortDisplayName || '', yer: t.location || '', logo: (t.logos && t.logos[0] && t.logos[0].href) || '', milli: L.obek === 'Milli' }; });
  // Geçmiş sezonlar: arşivde olan yıllar yeniden istenmez (geçen sezon hariç: son haftalar sonradan düzelebilir)
  const gecmis = Object.assign({}, (eski && eski.gecmis) || {}); let bos = 0;
  for(let y = yil - 1; y >= 1995; y--){
    if(gecmis[y] && y < yil - 1){ bos = 0; continue; }
    const j = await al(ESPN_ST + L.slug + '/standings?season=' + y);
    const gr = (j && j.children && j.children.length) ? j.children : (j && j.standings ? [j] : []);
    const satir = [];
    gr.forEach(c => ((c.standings && c.standings.entries) || []).forEach(e => {
      const st = {}; (e.stats || []).forEach(x => { st[x.name] = x.value; });
      if(!e.team) return;
      satir.push({ t: String(e.team.id), ad: e.team.displayName || '', s: st.rank || 0, O: st.gamesPlayed || 0, G: st.wins || 0, B: st.ties || 0, M: st.losses || 0, AG: st.pointsFor || 0, YG: st.pointsAgainst || 0, P: st.points || 0, g: gr.length > 1 ? (c.name || '') : undefined });
    }));
    if(!satir.length){ if(++bos >= 3) break; continue; }
    bos = 0; gecmis[y] = { ad: sezonAdi(y, iki), satir };
    await bek(150);
  }
  return { yil, sezonAdi: sezonAdi(yil, iki), takim, gecmis };
}
async function espnKadrolar(L, takim){
  const o = {};
  for(const id of Object.keys(takim)){
    const j = await al(ESPN + L.slug + '/teams/' + id + '/roster');
    o[id] = ((j && j.athletes) || []).map(a => ({ id: String(a.id), ad: a.displayName || a.fullName || '', foto: !!(a.headshot && a.headshot.href) }));
    await bek(120);
  }
  return o;
}

// ── TheSportsDB (ESPN'de olmayan ligler) ─────────────────────────────────────────────────────────────
let _tsSon = 0;
async function tsdb(u){ const g = Date.now() - _tsSon; if(g < 2100) await bek(2100 - g); _tsSon = Date.now(); return al(TSDB + u, { bekle: 20000 }); }
async function tsdbSezon(id, s){
  const mac = []; let bos = 0, gor = false;
  for(let r = 1; r <= 60; r++){
    const j = await tsdb('eventsround.php?id=' + id + '&r=' + r + '&s=' + s); const e = (j && j.events) || [];
    if(!e.length){ if(gor && ++bos >= 2) break; if(!gor && r >= 3) break; continue; }
    gor = true; bos = 0;
    e.forEach(x => mac.push(tsdbMac(x, r)));
  }
  return mac;
}
function tsdbMac(x, r){
  return { id: x.idEvent, r: +x.intRound || r, z: x.strTimestamp ? x.strTimestamp + (/Z|[+-]\d\d:?\d\d$/.test(x.strTimestamp) ? '' : 'Z') : (x.dateEvent ? x.dateEvent + 'T' + (x.strTime || '00:00:00') + 'Z' : ''),
    ev: x.idHomeTeam, dep: x.idAwayTeam, evAd: x.strHomeTeam, depAd: x.strAwayTeam, evLogo: x.strHomeTeamBadge || '', depLogo: x.strAwayTeamBadge || '',
    evG: x.intHomeScore === null || x.intHomeScore === '' || x.intHomeScore === undefined ? null : +x.intHomeScore, depG: x.intAwayScore === null || x.intAwayScore === '' || x.intAwayScore === undefined ? null : +x.intAwayScore,
    d: x.strStatus || '', st: x.strVenue || '' };
}
async function tsdbLig(L, eski){
  const lj = await tsdb('lookupleague.php?id=' + L.tsdb); const lig = (lj && lj.leagues && lj.leagues[0]) || {};
  const s = lig.strCurrentSeason || ((eski && eski.sezonAdi) || '');
  let mac;
  if(HIZLI && eski && eski.mac && eski.mac.length && eski.sezonAdi === s){
    // 30 dakikalık güncelleme: yalnızca bitmemiş ve şu ana yakın (dün-yarın) maçların turları yeniden istenir
    const simdi = Date.now(), turlar = new Set();
    eski.mac.forEach(m => { const z = Date.parse(m.z); if(!/^ft$|finish|aet|pen/i.test(m.d || '') && z > simdi - 864e5 && z < simdi + 2 * 864e5) turlar.add(m.r); });
    mac = eski.mac.slice();
    for(const r of turlar){ const j = await tsdb('eventsround.php?id=' + L.tsdb + '&r=' + r + '&s=' + s); const e = (j && j.events) || [];
      e.forEach(x => { const i = mac.findIndex(m => m.id === x.idEvent); const yeni = tsdbMac(x, r); if(i >= 0) mac[i] = Object.assign({}, mac[i], yeni, { evLogo: mac[i].evLogo || yeni.evLogo, depLogo: mac[i].depLogo || yeni.depLogo }); else mac.push(yeni); }); }
  } else mac = await tsdbSezon(L.tsdb, s);
  const takim = {};
  mac.forEach(m => { [[m.ev, m.evAd, m.evLogo], [m.dep, m.depAd, m.depLogo]].forEach(([id, ad, logo]) => { if(!takim[id]) takim[id] = { ad, kisa: ad, yer: '', logo: logo || '' }; else if(!takim[id].logo && logo) takim[id].logo = logo; }); });
  // Rozeti olmayan takımlar için bir kez takım kaydı (eski dosyadan gelir)
  for(const id of Object.keys(takim)){
    const e = eski && eski.takim && eski.takim[id]; if(e && e.logo && !takim[id].logo) takim[id].logo = e.logo;
    if(!takim[id].logo && !HIZLI){ const tj = await tsdb('lookupteam.php?id=' + id); const t = tj && tj.teams && tj.teams[0]; if(t && String(t.idTeam) === String(id)) takim[id].logo = t.strBadge || t.strTeamBadge || ''; }
  }
  // Geçmiş: önceki iki sezonun maçlarından puan durumu (arşivdekiler yeniden istenmez)
  const gecmis = Object.assign({}, (eski && eski.gecmis) || {});
  const y0 = parseInt(s, 10);
  if(!HIZLI && y0) for(const y of [y0 - 1, y0 - 2]){
    if(gecmis[y]) continue;
    const sn = y + '-' + (y + 1); const m2 = await tsdbSezon(L.tsdb, sn); if(!m2.length) continue;
    gecmis[y] = { ad: y + '-' + String((y + 1) % 100).padStart(2, '0'), satir: tabloHesapla(m2) };
  }
  return { yil: y0 || new Date().getFullYear(), sezonAdi: s, takim, gecmis, mac, kaynak: 'TheSportsDB' };
}
function tabloHesapla(mac){
  const t = {};
  const k = (id, ad) => t[id] || (t[id] = { t: String(id), ad, O: 0, G: 0, B: 0, M: 0, AG: 0, YG: 0, P: 0 });
  mac.forEach(m => { if(m.evG == null || m.depG == null) return; const a = k(m.ev, m.evAd), b = k(m.dep, m.depAd);
    a.O++; b.O++; a.AG += m.evG; a.YG += m.depG; b.AG += m.depG; b.YG += m.evG;
    if(m.evG > m.depG){ a.G++; b.M++; a.P += 3; } else if(m.evG < m.depG){ b.G++; a.M++; b.P += 3; } else { a.B++; b.B++; a.P++; b.P++; } });
  return Object.values(t).sort((x, y) => y.P - x.P || (y.AG - y.YG) - (x.AG - x.YG) || y.AG - x.AG).map((x, i) => Object.assign(x, { s: i + 1 }));
}

// ── Wikidata: ESPN / TheSportsDB takımı → Wikidata kulübü ─────────────────────────────────────────────
async function wdAra(ad, dil){
  const j = await al(WD_API + '?action=wbsearchentities&format=json&type=item&limit=10&language=' + dil + '&uselang=' + dil + '&search=' + encodeURIComponent(ad));
  return ((j && j.search) || []).map(x => ({ id: x.id, et: (x.label || '') + ' ' + (x.description || '') }));
}
async function eslestir(takim, milli, eski){
  const sonuc = {};
  const bekleyen = [];
  for(const [id, t] of Object.entries(takim)){
    const e = eski && eski.takim && eski.takim[id];
    if(e && e.wd !== undefined){ sonuc[id] = e.wd; continue; }   // önceki eşleşme (ya da "bulunamadı" = null) yeniden aranmaz
    bekleyen.push(id);
  }
  for(const id of bekleyen){
    const t = takim[id], adlar = [];
    if(milli){ adlar.push([t.ad + ' national football team', 'en'], [t.ad + ' milli futbol takımı', 'tr']); }
    else { const tr = TR_AD[t.ad] || TR_AD[t.kisa];
      if(tr) adlar.push([tr, 'tr']);
      adlar.push([t.ad, 'en'], [t.ad, 'tr']); if(t.kisa && t.kisa !== t.ad) adlar.push([t.kisa, 'en']); if(t.yer && t.yer !== t.ad) adlar.push([t.yer, 'en']);
      const kok = t.ad.replace(/\s+(BB|FK|SK|FC|AS|JK|S\.K\.|F\.K\.)$/i, '');
      [kok + ' FK', kok + ' SK', kok + 'spor', kok + ' FC'].forEach(x => adlar.push([x, 'tr'])); }
    const aday = []; const gor = {};
    for(const [a, d] of adlar){ (await wdAra(a, d)).forEach(x => { if(!gor[x.id] && !YAS_GEC.test(x.et)){ gor[x.id] = 1; aday.push(x.id); } }); if(aday.length >= 20) break; await bek(150); }
    if(!aday.length){ sonuc[id] = null; continue; }
    // Önce futbol kulübü / milli futbol takımı; yoksa (çok branşlı kulüplerde) spor kulübü
    const tur = milli ? 'wd:Q6979593' : 'wd:Q476028 wd:Q847017';
    const b = await sparql('SELECT ?c ?k WHERE { VALUES ?c { ' + aday.map(x => 'wd:' + x).join(' ') + ' } VALUES ?k { ' + tur + ' } ?c wdt:P31/wdt:P279* ?k . }');
    const fut = {}, spor = {}; b.forEach(x => { const c = qid(v(x, 'c')); if(qid(v(x, 'k')) === 'Q847017') spor[c] = 1; else fut[c] = 1; });
    const sec = aday.find(x => fut[x]) || aday.find(x => spor[x]);
    sonuc[id] = sec || null;
  }
  return sonuc;
}
function wikiTarih(wt){
  if(!wt) return null;
  const A = { ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
  const m0 = /\|\s*(kuruluş|kuruluş_tarihi|kuruluş tarihi|founded)\s*=\s*([^\n]*)/i.exec(wt); if(!m0) return null;
  const x = m0[2];
  let m = /\{\{\s*(?:start date(?: and age)?|başlangıç tarihi(?: ve yaşı)?|açılış tarihi(?: ve yaşı)?|kuruluş tarihi ve yaşı|birth date)\s*\|(?:[^|}]*=[^|}]*\|)*\s*(\d{3,4})\s*(?:\|\s*(\d{1,2})\s*)?(?:\|\s*(\d{1,2})\s*)?/i.exec(x);
  if(m) return { y: +m[1], a: m[2] ? +m[2] : 0, g: m[3] ? +m[3] : 0 };
  m = /(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/.exec(x); if(m && A[m[2].toLowerCase()]) return { y: +m[3], a: A[m[2].toLowerCase()], g: +m[1] };
  m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(x); if(m && A[m[1].toLowerCase()]) return { y: +m[3], a: A[m[1].toLowerCase()], g: +m[2] };
  m = /([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/.exec(x); if(m && A[m[1].toLowerCase()]) return { y: +m[2], a: A[m[1].toLowerCase()], g: 0 };
  m = /\b(1[89]\d\d|20[0-2]\d)\b/.exec(x); if(m) return { y: +m[1], a: 0, g: 0 };
  return null;
}
async function wikiKurulus(baslik, dil){
  if(!baslik) return null;
  const j = await al('https://' + dil + '.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&section=0&page=' + encodeURIComponent(baslik));
  return wikiTarih(j && j.parse && j.parse.wikitext && j.parse.wikitext['*']);
}
async function kulupBilgi(wdIds, eski){
  const o = {};
  const ids = [...new Set(wdIds.filter(Boolean))];
  for(const p of parca(ids, 60)){
    const b = await sparql('SELECT ?c ?cTr ?cEn ?inc ?pre ?stTr ?stEn ?cap ?tr ?en ?resmi WHERE { VALUES ?c { ' + p.map(x => 'wd:' + x).join(' ') + ' } '
      + 'OPTIONAL { ?c rdfs:label ?cTr FILTER(lang(?cTr)="tr") } OPTIONAL { ?c rdfs:label ?cEn FILTER(lang(?cEn)="en") } '
      + 'OPTIONAL { ?c p:P571/psv:P571 [ wikibase:timeValue ?inc ; wikibase:timePrecision ?pre ] } '
      + 'OPTIONAL { ?c wdt:P115 ?st . OPTIONAL { ?st rdfs:label ?stTr FILTER(lang(?stTr)="tr") } OPTIONAL { ?st rdfs:label ?stEn FILTER(lang(?stEn)="en") } OPTIONAL { ?st wdt:P1083 ?cap } } '
      + 'OPTIONAL { ?trw schema:about ?c ; schema:isPartOf <https://tr.wikipedia.org/> ; schema:name ?tr } OPTIONAL { ?enw schema:about ?c ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?en } }');
    b.forEach(x => { const c = qid(v(x, 'c')); const k = o[c] || (o[c] = { ad: v(x, 'cTr') || v(x, 'cEn') });
      if(v(x, 'inc') && !k.wdT){ const d = v(x, 'inc').replace(/^\+/, ''), pr = +v(x, 'pre'); const m = /^(-?\d+)-(\d\d)-(\d\d)/.exec(d); if(m) k.wdT = { y: +m[1], a: pr >= 10 ? +m[2] : 0, g: pr >= 11 ? +m[3] : 0 }; }
      if(v(x, 'stTr') || v(x, 'stEn')){ k.stad = v(x, 'stTr') || v(x, 'stEn'); if(v(x, 'cap')) k.kap = Math.round(+v(x, 'cap')); }
      if(v(x, 'tr')) k.trw = v(x, 'tr'); if(v(x, 'en')) k.enw = v(x, 'en'); });
  }
  // Kuruluş günü/ayı: önceki dosyada tam tarih varsa yeniden okunmaz
  for(const c of ids){
    const k = o[c] || (o[c] = {}); const e = eski[c];
    if(e && e.kur && e.kur.g){ k.kur = e.kur; continue; }
    let t = await wikiKurulus(k.trw, 'tr'); if(!(t && t.g)){ const t2 = await wikiKurulus(k.enw, 'en'); if(t2 && (!t || t2.g || (!t.a && t2.a))) t = t2; }
    const w = k.wdT;
    if(t && w && w.y && Math.abs(t.y - w.y) > 1 && !(t.g && !w.g)) t = null;     // Vikipedi ile Wikidata çok farklıysa Wikidata'ya güven
    k.kur = (t && (!w || t.g >= (w.g ? 1 : 0) || t.a > w.a)) ? Object.assign({ k: 'Vikipedi' }, t) : (w ? Object.assign({ k: 'Wikidata' }, w) : null);
    await bek(120);
  }
  // Kupalar: kulübün kazandığı bütün turnuva sezonları (Wikidata P1346 kazanan + P3450 turnuva)
  for(const p of parca(ids, 25)){
    const b = await sparql('SELECT ?c ?comp ?compTr ?compEn ?s ?sTr ?sEn ?t WHERE { VALUES ?c { ' + p.map(x => 'wd:' + x).join(' ') + ' } ?s wdt:P1346 ?c ; wdt:P3450 ?comp . '
      + 'OPTIONAL { ?comp rdfs:label ?compTr FILTER(lang(?compTr)="tr") } OPTIONAL { ?comp rdfs:label ?compEn FILTER(lang(?compEn)="en") } '
      + 'OPTIONAL { ?s rdfs:label ?sTr FILTER(lang(?sTr)="tr") } OPTIONAL { ?s rdfs:label ?sEn FILTER(lang(?sEn)="en") } OPTIONAL { ?s wdt:P580|wdt:P585|wdt:P582 ?t } }');
    const g = {};
    b.forEach(x => { const c = qid(v(x, 'c')), comp = qid(v(x, 'comp')), s = qid(v(x, 's')); const k = (g[c] || (g[c] = {})); const kk = k[comp] || (k[comp] = { ad: v(x, 'compTr') || v(x, 'compEn') || comp, sz: {} });
      if(!kk.sz[s]){ const ad = v(x, 'sTr') || v(x, 'sEn') || ''; const yy = (/(\d{4})/.exec(ad) || /(\d{4})/.exec(v(x, 't')) || [])[1]; kk.sz[s] = { ad, y: yy ? +yy : 0 }; } });
    Object.keys(g).forEach(c => { o[c] = o[c] || {}; o[c].kupa = Object.values(g[c]).map(k => ({ ad: k.ad, sz: Object.values(k.sz).sort((a, b) => a.y - b.y).map(z => (z.ad.replace(/\s*\(.*?\)\s*/g, ' ').trim()) || String(z.y)), y: Object.values(k.sz).map(z => z.y) }))
      .sort((a, b) => b.sz.length - a.sz.length); });
  }
  return o;
}

// ── Oyuncu fotoğrafları ─────────────────────────────────────────────────────────────────────────────
async function oyuncuFoto(kadro, wdKulup){
  const sonuc = {}; const tum = [];
  Object.values(kadro).forEach(l => l.forEach(a => tum.push(a)));
  const idler = tum.map(a => a.id);
  for(const p of parca(idler, 150)){
    const b = await sparql('SELECT ?e ?img WHERE { VALUES ?e { ' + p.map(x => '"' + x + '"').join(' ') + ' } ?p wdt:P3681 ?e ; wdt:P18 ?img . }');
    b.forEach(x => { if(!sonuc[v(x, 'e')]) sonuc[v(x, 'e')] = decodeURIComponent(v(x, 'img').split('/').pop()); });
  }
  // ESPN numarası Wikidata'da yoksa: kulübün (şimdiki ve eski) oyuncuları arasında ad eşleşmesi
  for(const [tid, liste] of Object.entries(kadro)){
    const c = wdKulup[tid]; const eksik = liste.filter(a => !sonuc[a.id]); if(!c || !eksik.length) continue;
    // Yalnızca 1980 sonrası doğumlular (kulübün bütün tarihindeki binlerce oyuncu sorguyu ağırlaştırıyordu)
    const b = await sparql('SELECT ?p ?img ?ad WHERE { ?p wdt:P54 wd:' + c + ' ; wdt:P18 ?img ; wdt:P569 ?dog . FILTER(YEAR(?dog) >= 1980) { ?p rdfs:label ?ad } UNION { ?p skos:altLabel ?ad } FILTER(lang(?ad) IN ("en","tr")) }');
    const ad = {}, soyad = {};
    b.forEach(x => { const n = norm(v(x, 'ad')); const f = decodeURIComponent(v(x, 'img').split('/').pop()); if(!ad[n]) ad[n] = f; const s = n.split(' '); if(s.length > 1){ const k = s[0][0] + ' ' + s[s.length - 1]; (soyad[k] = soyad[k] || new Set()).add(f); } });
    eksik.forEach(a => { const n = norm(a.ad); if(ad[n]){ sonuc[a.id] = ad[n]; return; } const s = n.split(' '); if(s.length > 1){ const k = s[0][0] + ' ' + s[s.length - 1]; const f = soyad[k]; if(f && f.size === 1) sonuc[a.id] = [...f][0]; } });
  }
  // Commons: küçük resim adresi, yazar, lisans
  const dosyalar = [...new Set(Object.values(sonuc))], bilgi = {};
  for(const p of parca(dosyalar, 40)){
    const j = await al(COMMONS + '?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240&iiextmetadatafilter=Artist|LicenseShortName&titles=' + encodeURIComponent(p.map(f => 'File:' + f).join('|')));
    const pg = (j && j.query && j.query.pages) || {}; const nm = {}; ((j && j.query && j.query.normalized) || []).forEach(n => { nm[n.to] = n.from; });
    Object.values(pg).forEach(x => { const ii = x.imageinfo && x.imageinfo[0]; if(!ii) return; const em = ii.extmetadata || {};
      const yazar = String((em.Artist && em.Artist.value) || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const ad = String(x.title || '').replace(/^File:/, ''); bilgi[ad] = { f: ii.thumburl || ii.url, y: yazar, l: (em.LicenseShortName && em.LicenseShortName.value) || '', u: ii.descriptionurl || '' }; });
    await bek(300);
  }
  const o = {}; Object.entries(sonuc).forEach(([id, f]) => { const k = bilgi[f.replace(/_/g, ' ')] || bilgi[f]; if(k && k.f) o[id] = k; });
  return o;
}


// ESPN'de olmayan ligler için kadro: Wikidata'da kulübün güncel (bitiş tarihi olmayan) oyuncuları, 1985 sonrası doğumlu
async function wdKadro(takim){
  const o = {}, dosyalar = new Set();
  for(const [id, t] of Object.entries(takim)){
    if(!t.wd) continue;
    const b = await sparql('SELECT ?p ?ad ?mev ?no ?img ?dog ?uy WHERE { ?p p:P54 ?st . ?st ps:P54 wd:' + t.wd + ' . FILTER NOT EXISTS { ?st pq:P582 ?bit } ?p wdt:P106 wd:Q937857 ; wdt:P569 ?dog . FILTER(YEAR(?dog) >= 1985) '
      + 'OPTIONAL { ?st pq:P1618 ?no } OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P413 ?m . ?m rdfs:label ?mev FILTER(lang(?mev)="tr") } OPTIONAL { ?p wdt:P27 ?u . ?u rdfs:label ?uy FILTER(lang(?uy)="tr") } '
      + '?p rdfs:label ?ad FILTER(lang(?ad) IN ("tr","en")) }');
    const g = {};
    b.forEach(x => { const p = qid(v(x, 'p')); const k = g[p] || (g[p] = { ad: '', mevki: '', no: 0, yas: 0, uyruk: '', img: '' });
      if(!k.ad || /^tr$/.test((x.ad || {})['xml:lang'] || '')) k.ad = v(x, 'ad'); if(v(x, 'mev') && !k.mevki) k.mevki = v(x, 'mev'); if(v(x, 'no')) k.no = +v(x, 'no') || 0;
      if(v(x, 'img') && !k.img) k.img = decodeURIComponent(v(x, 'img').split('/').pop()); if(v(x, 'uy') && !k.uyruk) k.uyruk = v(x, 'uy');
      const d = new Date(v(x, 'dog')); if(!isNaN(d)) k.yas = Math.floor((Date.now() - d) / 315576e5); });
    o[id] = Object.values(g).filter(k => k.ad).sort((a, b) => (a.no || 99) - (b.no || 99));
    o[id].forEach(k => { if(k.img) dosyalar.add(k.img); });
  }
  const bilgi = await commonsBilgi([...dosyalar]);
  Object.values(o).forEach(l => l.forEach(k => { if(k.img){ const f = bilgi[k.img.replace(/_/g, ' ')] || bilgi[k.img]; if(f) k.foto = f; } delete k.img; }));
  return o;
}
async function commonsBilgi(dosyalar){
  const bilgi = {};
  for(const p of parca(dosyalar, 40)){
    const j = await al(COMMONS + '?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240&iiextmetadatafilter=Artist|LicenseShortName&titles=' + encodeURIComponent(p.map(f => 'File:' + f).join('|')));
    const pg = (j && j.query && j.query.pages) || {};
    Object.values(pg).forEach(x => { const ii = x.imageinfo && x.imageinfo[0]; if(!ii) return; const em = ii.extmetadata || {};
      const yazar = String((em.Artist && em.Artist.value) || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
      bilgi[String(x.title || '').replace(/^File:/, '')] = { f: ii.thumburl || ii.url, y: yazar, l: (em.LicenseShortName && em.LicenseShortName.value) || '', u: ii.descriptionurl || '' }; });
    await bek(300);
  }
  return bilgi;
}
// ── Lig ─────────────────────────────────────────────────────────────────────────────────────────────
async function ligIsle(L){
  const dosya = path.join(VERI, L.slug + '.json');
  let eski = null; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  if(HIZLI && !L.tsdb) return;
  const t0 = Date.now(); const ad = (x) => console.log('  ' + L.slug + ' ' + x + ' ' + ((Date.now() - t0) / 1000 | 0) + 's');
  const temel = L.tsdb ? await tsdbLig(L, eski) : await espnLig(L, eski); ad('temel');
  const takim = {};
  Object.entries(temel.takim).forEach(([id, t]) => { takim[id] = Object.assign({}, t); });
  let foto = (eski && eski.foto) || {}, fotoT = (eski && eski.fotoT) || 0, kadroDosya = (eski && eski.kadro) || null, kadroT = (eski && eski.kadroT) || 0;
  if(!HIZLI){
    const wd = await eslestir(temel.takim, L.obek === 'Milli', eski);
    const eskiKulup = {}; Object.values((eski && eski.takim) || {}).forEach(t => { if(t.wd) eskiKulup[t.wd] = t; });
    ad('eşleşme'); const bilgi = await kulupBilgi(Object.values(wd), eskiKulup); ad('kulüp');
    Object.keys(takim).forEach(id => { const c = wd[id]; takim[id].wd = c || null; const k = c && bilgi[c];
      if(k){ if(k.kur) takim[id].kur = k.kur; if(k.stad) takim[id].stad = k.stad; if(k.kap) takim[id].kap = k.kap; if(k.kupa) takim[id].kupa = k.kupa; if(k.ad) takim[id].wdAd = k.ad; } });
    if(!L.tsdb && Date.now() - fotoT > 6 * 864e5){
      const kadro = await espnKadrolar(L, temel.takim);
      const wdK = {}; Object.keys(takim).forEach(id => { wdK[id] = takim[id].wd; });
      ad('kadro'); const yeni = await oyuncuFoto(kadro, wdK); ad('foto');
      // ESPN'in kendi fotoğrafı olan oyuncular için Commons fotoğrafı tutulmaz (uygulama önce ESPN'inkini kullanır)
      const espnVar = {}; Object.values(kadro).forEach(l => l.forEach(a => { if(a.foto) espnVar[a.id] = 1; }));
      foto = {}; Object.entries(yeni).forEach(([id, k]) => { if(!espnVar[id]) foto[id] = k; });
      fotoT = Date.now();
      OZET.push({ lig: L.slug, oyuncu: Object.values(kadro).reduce((a, l) => a + l.length, 0), espnFoto: Object.keys(espnVar).length, commonsFoto: Object.keys(foto).length });
    }
    if(L.tsdb && Date.now() - ((eski && eski.kadroT) || 0) > 6 * 864e5){ kadroDosya = await wdKadro(takim); kadroT = Date.now(); }
  } else if(eski && eski.takim){ Object.keys(takim).forEach(id => { const e = eski.takim[id]; if(e) ['wd', 'kur', 'stad', 'kap', 'kupa', 'wdAd'].forEach(k => { if(e[k] !== undefined) takim[id][k] = e[k]; }); }); }
  // Lig şampiyonlukları: arşivde 1. olunan ama Wikidata'da kayıtlı olmayan sezonlar ilgili turnuvaya eklenir (Wikidata bazı sezonlarda eksik)
  if(!L.tsdb && temel.gecmis) Object.keys(takim).forEach(id => {
    const C = Object.keys(temel.gecmis).map(Number).filter(y => (temel.gecmis[y].satir || []).some(r => r.t === id && r.s === 1 && !r.g));
    if(!C.length || L.obek === 'Milli' || /uefa|conmebol|caf|afc|concacaf|fifa/.test(L.slug)) return;
    const K = takim[id].kupa = takim[id].kupa || [];
    let hedef = null, en = 0; K.forEach(k => { const o = (k.y || []).filter(y => C.includes(y)).length; if(o > en){ en = o; hedef = k; } });
    if(!hedef) hedef = K.find(k => norm(k.ad) === norm(L.ad)) || null;
    if(!hedef){ hedef = { ad: L.ad, sz: [], y: [] }; K.push(hedef); }
    C.forEach(y => { if(!(hedef.y || []).includes(y)){ (hedef.y = hedef.y || []).push(y); hedef.sz.push(temel.gecmis[y].ad + ' ' + hedef.ad); } });
    hedef.sz.sort(); K.sort((a, b) => b.sz.length - a.sz.length);
  });
  const cikti = { lig: L.slug, ad: L.ad, kaynak: temel.kaynak || 'ESPN', yil: temel.yil, sezonAdi: temel.sezonAdi, takim, gecmis: temel.gecmis, foto, fotoT };
  if(temel.mac) cikti.mac = temel.mac;
  if(kadroDosya){ cikti.kadro = kadroDosya; cikti.kadroT = kadroT; }
  const yaz = JSON.stringify(cikti);
  const ayni = eski && JSON.stringify(Object.assign({}, eski, { t: 0 })) === JSON.stringify(Object.assign({}, cikti, { t: 0 }));
  if(!ayni){ cikti.t = Date.now(); fs.writeFileSync(dosya, JSON.stringify(cikti)); }
  const tk = Object.values(takim);
  console.log([L.slug, (Date.now() - t0) / 1000 | 0, 's', 'takım', tk.length, 'wd', tk.filter(x => x.wd).length, 'kuruluş(tam gün)', tk.filter(x => x.kur && x.kur.g).length, 'kuruluş(yıl)', tk.filter(x => x.kur).length,
    'kupalı', tk.filter(x => x.kupa && x.kupa.length).length, 'sezon', Object.keys(temel.gecmis || {}).length, 'maç', (temel.mac || []).length, 'foto', Object.keys(foto).length, ayni ? 'değişmedi' : 'yazıldı',
    'eşleşmeyen', tk.filter(x => !x.wd).map(x => x.ad).slice(0, 8).join('/')].join(' '));
}

(async () => {
  fs.mkdirSync(VERI, { recursive: true }); trAdOku();
  const ligler = ligleriOku().filter(l => !SECILI.length || SECILI.includes(l.slug));
  for(const L of ligler){ try{ await ligIsle(L); }catch(e){ console.log('HATA', L.slug, e && e.stack || e); } }
  if(!SECILI.length) fs.writeFileSync(path.join(VERI, 'liste.json'), JSON.stringify({ t: Date.now(), ligler: ligler.map(l => l.slug) }));
  if(OZET.length) console.log('FOTOĞRAF ÖZETİ', JSON.stringify(OZET));
})();
