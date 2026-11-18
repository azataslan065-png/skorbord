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
// --grup=i/n : ligler n parçaya bölünür, bu çalışma i. parçayı (0'dan) yapar (GitHub'da paralel işler; bir iş 5 saat sınırına takılmaz)
const GRUP = (arg.find(a => a.startsWith('--grup=')) || '').slice(7).split('/').map(Number);
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
    if(e && e.wd){ sonuc[id] = e.wd; continue; }
    if(takim[id] && takim[id].wd){ sonuc[id] = takim[id].wd; continue; }   // önceki eşleşme yeniden aranmaz; bulunamayan her çalışmada yeniden aranır
    bekleyen.push(id);
  }
  for(const id of bekleyen){
    const t = takim[id], adlar = [];
    if(/^TBD\b/i.test(t.ad)){ sonuc[id] = null; continue; }   // ESPN'in "belli değil" yer tutucu takımı
    if(milli){ const v2 = t.ad.replace(/^St\.\s*/i, 'Saint ').replace(/\bSt\.\s*/g, 'Saint ').replace(/-/g, ' and ').replace(/\band the\b/i, 'and the');
      adlar.push([t.ad + ' national football team', 'en'], [v2 + ' national football team', 'en'], [t.ad + ' milli futbol takımı', 'tr'], [t.ad.replace(/-/g, ' ') + ' national football team', 'en']); }
    else { const tr = TR_AD[t.ad] || TR_AD[t.kisa];
      if(tr) adlar.push([tr, 'tr']);
      adlar.push([t.ad, 'en'], [t.ad, 'tr']); if(t.kisa && t.kisa !== t.ad) adlar.push([t.kisa, 'en']); if(t.yer && t.yer !== t.ad) adlar.push([t.yer, 'en']);
      const kok = t.ad.replace(/\s+(BB|FK|SK|FC|AS|JK|S\.K\.|F\.K\.)$/i, '');
      [kok + ' FK', kok + ' SK', kok + 'spor', kok + ' FC'].forEach(x => adlar.push([x, 'tr']));
      // Tek kelimelik / şehirle aynı adlar (Braga, Bahia, Bolívar, Monterrey, León...): kulüp önekleriyle
      const yalin = kok.replace(/\s*\(.*?\)\s*/g, ' ').trim();
      ['Club ', 'C.F. ', 'S.C. ', 'E.C. ', 'C.A. ', 'C.D. ', 'Club Atlético ', 'Club Deportivo '].forEach(o => adlar.push([o + yalin, 'en'])); }
    const aday = []; const gor = {};
    for(const [a, d] of adlar){ (await wdAra(a, d)).forEach(x => { if(!gor[x.id] && !YAS_GEC.test(x.et)){ gor[x.id] = 1; aday.push(x.id); } }); if(aday.length >= 30) break; await bek(150); }
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
    if(e && e.kur && e.kur.g && e.kur.k !== 'Federasyon'){ k.kur = e.kur; continue; }
    let t = await wikiKurulus(k.trw, 'tr'); if(!(t && t.g)){ const t2 = await wikiKurulus(k.enw, 'en'); if(t2 && (!t || t2.g || (!t.a && t2.a))) t = t2; }
    const w = k.wdT;
    if(t && w && w.y && Math.abs(t.y - w.y) > 1 && !(t.g && !w.g)) t = null;     // Vikipedi ile Wikidata çok farklıysa Wikidata'ya güven
    k.kur = (t && (!w || t.g >= (w.g ? 1 : 0) || t.a > w.a)) ? Object.assign({ k: 'Vikipedi' }, t) : (w ? Object.assign({ k: 'Wikidata' }, w) : null);
    await bek(120);
  }
  // Milli takımlarda Wikidata'da kuruluş yok: takıma bağlı federasyonun kuruluş tarihi kullanılır ("federasyon" diye işaretlenir)
  const fedYok = ids.filter(c => !(o[c] && o[c].kur));
  for(const p of parca(fedYok, 40)){
    const b = await sparql('SELECT ?c ?inc ?pre ?fl WHERE { VALUES ?c { ' + p.map(x => 'wd:' + x).join(' ') + ' } ?c wdt:P31/wdt:P279* wd:Q6979593 ; wdt:P17 ?ulke . ?c ?prop ?f . ?f wdt:P17 ?ulke . ?f p:P571/psv:P571 [ wikibase:timeValue ?inc ; wikibase:timePrecision ?pre ] . '
      + '?f rdfs:label ?fl FILTER(lang(?fl)="en" && REGEX(?fl, "(Federation|Association|Football Union|Federación|Federação|Fédération|Football Board)", "i") && !REGEX(?fl, "^(UEFA|FIFA|CONMEBOL|CAF|AFC|CONCACAF|OFC|Union of European)", "i")) }');
    b.forEach(x => { const c = qid(v(x, 'c')); const k = o[c] || (o[c] = {}); if(k.kur) return; const m = /^(-?\d+)-(\d\d)-(\d\d)/.exec(v(x, 'inc').replace(/^\+/, '')); const pr = +v(x, 'pre');
      if(m) k.kur = { k: 'Federasyon', y: +m[1], a: pr >= 10 ? +m[2] : 0, g: pr >= 11 ? +m[3] : 0, fed: v(x, 'fl') }; });
  }
  // Kupalar: kulübün kazandığı bütün turnuva sezonları (Wikidata P1346 kazanan + P3450 turnuva)
  for(const p of parca(ids, 25)){
    const b = await sparql('SELECT ?c ?comp ?compTr ?compEn ?s ?sTr ?sEn ?t WHERE { VALUES ?c { ' + p.map(x => 'wd:' + x).join(' ') + ' } ?s wdt:P1346 ?c ; wdt:P3450 ?comp . '
      + 'OPTIONAL { ?comp rdfs:label ?compTr FILTER(lang(?compTr)="tr") } OPTIONAL { ?comp rdfs:label ?compEn FILTER(lang(?compEn)="en") } '
      + 'OPTIONAL { ?s rdfs:label ?sTr FILTER(lang(?sTr)="tr") } OPTIONAL { ?s rdfs:label ?sEn FILTER(lang(?sEn)="en") } OPTIONAL { ?s wdt:P580|wdt:P585|wdt:P582 ?t } }');
    const g = {};
    b.forEach(x => { const c = qid(v(x, 'c')), comp = qid(v(x, 'comp')), s = qid(v(x, 's')); const k = (g[c] || (g[c] = {})); const kk = k[comp] || (k[comp] = { ad: v(x, 'compTr') || v(x, 'compEn') || comp, sz: {} });
      if(!kk.sz[s]){ const ad = v(x, 'sTr') || v(x, 'sEn') || ''; const yy = (/(\d{4})/.exec(ad) || /(\d{4})/.exec(v(x, 't')) || [])[1]; kk.sz[s] = { ad, y: yy ? +yy : 0 }; } });
    const GENC = /(\d\d\s*Yaş|\bU-?\d\d\b|Under-?\s?\d\d|Youth|Gençl|Olimpiyat|Olympic|Kadın|Women)/i;
    Object.keys(g).forEach(c => { o[c] = o[c] || {}; o[c].kupa = Object.values(g[c]).filter(k => !GENC.test(k.ad)).map(k => ({ ad: k.ad, sz: Object.values(k.sz).sort((a, b) => a.y - b.y).map(z => (z.ad.replace(/\s*\(.*?\)\s*/g, ' ').trim()) || String(z.y)), y: Object.values(k.sz).map(z => z.y) }))
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

// ── VİKİPEDİ: Ziraat Türkiye Kupası ve Turkcell Süper Kupa (ESPN'de ve TheSportsDB'nin ücretsiz katmanında yok) ─────────────────
// İngilizce Vikipedi'nin sezon sayfasındaki "Football box" maç kutuları okunur: tarih, saat, takımlar, skor, penaltılar, goller, stadyum, hakem.
// Vikipedi gönüllülerce maçtan sonra güncellenir: canlı skor yok, sonuç birkaç saat içinde gelir.
function wikiTemizle(x){
  return String(x || '').replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<[^>]+>/g, ' ')
    .replace(/\{\{\s*(flagicon|fb|flag|nowrap|small|sort)[^{}]*\}\}/gi, (m, t) => { if(/^(flagicon|fb|flag)$/i.test(t)) return ''; const p = m.replace(/^\{\{|\}\}$/g, '').split('|'); return p[p.length - 1]; })
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '').replace(/\(\s*\d\s*\)/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function sablonlar(wt, ad){
  const out = [], re = new RegExp('\\{\\{\\s*(?:' + ad + ')(?=\\s*[|}\\n])', 'gi'); let m;
  while((m = re.exec(wt))){ let d = 0, j = m.index;
    for(; j < wt.length; j++){ if(wt[j] === '{' && wt[j + 1] === '{'){ d++; j++; } else if(wt[j] === '}' && wt[j + 1] === '}'){ d--; j++; if(!d) break; } }
    out.push({ i: m.index, t: wt.slice(m.index, j + 1) }); re.lastIndex = j + 1; }
  return out;
}
function sablonAlan(t){
  const ic = t.replace(/^\{\{[^|}]*\|?/, '').replace(/\}\}$/, ''), o = {}; let d = 0, parca = '';
  const bit = () => { const e = parca.indexOf('='); if(e > 0) o[parca.slice(0, e).trim().toLowerCase()] = parca.slice(e + 1).trim(); parca = ''; };
  for(let i = 0; i < ic.length; i++){ const c = ic[i], n = ic[i + 1];
    if((c === '{' && n === '{') || (c === '[' && n === '[')){ d++; parca += c + n; i++; continue; }
    if((c === '}' && n === '}') || (c === ']' && n === ']')){ d--; parca += c + n; i++; continue; }
    if(c === '|' && d === 0){ bit(); continue; } parca += c; }
  bit(); return o;
}
const AY_EN = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function wikiZaman(tarih, saat){
  let y, a, g, m; const t = wikiTemizle(tarih);
  if((m = /\{\{\s*start date[^|]*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(tarih))){ y = +m[1]; a = +m[2]; g = +m[3]; }
  else if((m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(t)) && AY_EN[m[2].toLowerCase()]){ y = +m[3]; a = AY_EN[m[2].toLowerCase()]; g = +m[1]; }
  else if((m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(t)) && AY_EN[m[1].toLowerCase()]){ y = +m[3]; a = AY_EN[m[1].toLowerCase()]; g = +m[2]; }
  else if((m = /(\d{4})-(\d{2})-(\d{2})/.exec(t))){ y = +m[1]; a = +m[2]; g = +m[3]; }
  else return null;
  // saat çoğunlukla Türkiye saati (UTC+3); {{CET|..}} / {{CEST|..}} şablonuyla yazılmışsa o dilimden çevrilir
  const ham = String(saat || '').replace(/<!--[\s\S]*?-->/g, ''), s = /(\d{1,2})[:.](\d{2})/.exec(ham); const hh = s ? +s[1] : 12, mm = s ? +s[2] : 0;
  const fark = /\{\{\s*CEST\b/i.test(ham) ? 2 : /\{\{\s*CET\b/i.test(ham) ? 1 : /\{\{\s*(UTC|GMT|WET)\b/i.test(ham) ? 0 : 3;
  return { z: new Date(Date.UTC(y, a - 1, g, hh - (s ? fark : 3), mm)).toISOString(), saatYok: !s };
}
function wikiGoller(x, taraf){
  const o = []; if(!x) return o;
  x.split(/<br\s*\/?>|\n/i).forEach(sat => {
    const ad = wikiTemizle(sat.replace(/\{\{[\s\S]*?\}\}/g, '')).replace(/[,;]+$/, '').trim();
    sablonlar(sat, 'goal|own goal|pengoal|og|penalty goal').forEach(z => { const ic = z.t.replace(/^\{\{\s*/, '').replace(/\}\}$/, '').split('|'); const tur0 = ic[0].trim().toLowerCase();
      const dk = ic.slice(1).filter(p => /^\s*\d+(\+\d+)?\s*'?\s*$/.test(p));
      const tip = (/own|^og$/.test(tur0) || ic.some(p => /^o\.?g\.?$/i.test(p.trim()))) ? 'og' : ((/pen/.test(tur0) || ic.some(p => /^pen\.?$/i.test(p.trim()))) ? 'pen_goal' : 'goal');
      dk.forEach(d => { const mm = /(\d+)(?:\+(\d+))?/.exec(d); o.push({ type: tip, min: +mm[1] + (mm[2] ? +mm[2] : 0), team: taraf, player: ad }); }); });
  });
  return o;
}
function kutularOku(wt){
  const bas = []; let m; const hr = /^(={2,4})\s*([^=\n]+?)\s*\1\s*$/gm; while((m = hr.exec(wt))) bas.push({ i: m.index, ad: wikiTemizle(m[2]) });
  // tur adı: maç kutusunun üstündeki en yakın anlamlı başlık ("Matches", "Seedings" gibi genel başlıklar atlanır), Türkçeye çevrilir
  const GENEL = /^(matches|match|match details|details|results|fixtures|summary|bracket|draw|seedings?|upsets|venue|teams|route to the final|qualified teams|qualification|rounds|top scorers|see also|notes|references)$/i;
  const TUR_TR = a => { let m; const s = a.trim();
    if((m = /^(first|second|third|fourth|fifth|sixth|seventh)\s+round$/i.exec(s))) return ({ first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7 })[m[1].toLowerCase()] + '. Tur';
    if((m = /^round\s+(\d+)$/i.exec(s))) return m[1] + '. Tur';
    if((m = /^group\s+([A-Z])$/i.exec(s))) return m[1].toUpperCase() + ' Grubu';
    if(/^group stage$/i.test(s)) return 'Grup Aşaması'; if(/^play-?off/i.test(s)) return 'Play-off'; if(/round of 16|last 16/i.test(s)) return 'Son 16';
    if(/quarter/i.test(s)) return 'Çeyrek Final'; if(/semi/i.test(s)) return 'Yarı Final'; if(/^final$/i.test(s)) return 'Final'; return s; };
  const turAdi = i => { let a = ''; bas.forEach(b => { if(b.i < i && !GENEL.test(b.ad)) a = b.ad; }); return TUR_TR(a); };
  const mac = [];
  sablonlar(wt, 'Football box collapsible|Football box|Footballbox collapsible|Footballbox').forEach(k => {
    const f = sablonAlan(k.t), zz = wikiZaman(f.date || '', f.time || ''); if(!zz) return;
    const t1 = wikiTemizle(f.team1), t2 = wikiTemizle(f.team2); if(!t1 || !t2 || /^TBD|winner|loser/i.test(t1 + ' ' + t2)) return;
    const skH = wikiTemizle(f.score) || (f.score1 != null && String(f.score1).trim() !== '' && f.score2 != null && String(f.score2).trim() !== '' ? wikiTemizle(f.score1) + '–' + wikiTemizle(f.score2) : ''), sk = skH.replace(/[–—]/g, '-'); const sm = /^(\d+)\s*-\s*(\d+)/.exec(sk);
    const pen = wikiTemizle(f.penaltyscore || '').replace(/[–—]/g, '-'); const pm = /^(\d+)\s*-\s*(\d+)/.exec(pen);
    const id = 'w' + require('crypto').createHash('md5').update(zz.z.slice(0, 10) + '|' + norm(t1) + '|' + norm(t2)).digest('hex').slice(0, 10);
    mac.push({ id, r: turAdi(k.i), z: zz.z, saatYok: zz.saatYok, ev: norm(t1).replace(/ /g, '_'), dep: norm(t2).replace(/ /g, '_'), evAd: t1, depAd: t2, evLogo: '', depLogo: '',
      evG: sm ? +sm[1] : null, depG: sm ? +sm[2] : null, d: sm ? 'FT' : '', st: [wikiTemizle(f.stadium), wikiTemizle(f.location)].filter(Boolean).join(', '),
      hakem: wikiTemizle(f.referee) || '', pen: pm ? pm[1] + '-' + pm[2] : '', uz: /a\.?e\.?t/i.test(skH + ' ' + (f.aet || '')),
      olay: wikiGoller(f.goals1, 'home').concat(wikiGoller(f.goals2, 'away')).sort((a, b) => a.min - b.min) });
  });
  const sira = []; mac.forEach(m => { if(!sira.includes(m.r)) sira.push(m.r); });
  mac.forEach(m => { m.tur = m.r; m.r = sira.indexOf(m.tur) + 1; });   // hafta numarası = tur sırası; tur adı ayrıca
  return mac;
}
async function wikiSayfa(baslik){ const j = await al('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' + encodeURIComponent(baslik)); return (j && j.parse && j.parse.wikitext && j.parse.wikitext['*']) || ''; }
const KUL_EK = /\b(fk|sk|jk|as|spor kulubu|futbol kulubu|a s|football|s k|f k|j k)\b/g;
async function wikiLig(L, eski){
  const s = new Date(), y = s.getUTCMonth() >= 6 ? s.getUTCFullYear() : s.getUTCFullYear() - 1;
  const adaylar = L.slug === 'tur.super' ? [String(y + 1) + ' Turkish Super Cup', String(y) + ' Turkish Super Cup', String(y - 1) + ' Turkish Super Cup']
    : [y + '–' + String((y + 1) % 100).padStart(2, '0') + ' Turkish Cup', (y - 1) + '–' + String(y % 100).padStart(2, '0') + ' Turkish Cup'];
  let mac = [], sezonAdi = '', yil = y;
  // Sayfa geçerli sayılır: oynanmış maçı ya da ileri tarihli maçı varsa (Vikipedi'de gelecek yılın sayfası bazen eski tarihlerle boş açılıyor)
  for(const b of adaylar){ let wt = await wikiSayfa(b); if(!wt) continue;
    for(const [, alt] of [...wt.matchAll(/\{\{\s*:([^{}|]+)\}\}/g)].slice(0, 4)){ const e = await wikiSayfa(alt.trim()); if(e) wt += '\n' + e; }   // {{:2025 Turkish Super Cup final}} gibi gömülü sayfalar
    const m2 = kutularOku(wt), simdi = Date.now();
    if(m2.some(m => m.evG != null || Date.parse(m.z) > simdi - 864e5)){ mac = m2; sezonAdi = b.replace(/ Turkish (Super )?Cup$/, ''); yil = parseInt(b, 10); break; } }
  // Logo, Türkçe ad ve Wikidata kaydı: aynı kulübün Süper Lig / TFF ligi dosyasından
  const dizin = {}, anah = a => norm(a).replace(KUL_EK, ' ').replace(/\s+/g, ' ').trim();
  for(const sl of ['tur.1', 'tur.2', 'tur.3']){ try{ const j = JSON.parse(fs.readFileSync(path.join(VERI, sl + '.json'), 'utf8'));
    Object.values(j.takim || {}).forEach(t => { [t.ad, t.adTr, t.wdAd, t.kisa].filter(Boolean).forEach(a => { const k = anah(a); if(k && !dizin[k]) dizin[k] = t; }); }); }catch(e){} }
  const takim = {};
  mac.forEach(m => { [[m.ev, m.evAd], [m.dep, m.depAd]].forEach(([id, ad]) => { if(takim[id]) return; const k = dizin[anah(ad)] || null;
    takim[id] = { ad: (k && (k.adTr || k.ad)) || ad, kisa: ad, yer: '', logo: (k && k.logo) || '' }; if(k && k.wd) takim[id].wd = k.wd; }); });
  mac.forEach(m => { m.evLogo = takim[m.ev].logo; m.depLogo = takim[m.dep].logo; m.evAd = takim[m.ev].ad; m.depAd = takim[m.dep].ad; });
  return { yil, sezonAdi, takim, gecmis: {}, mac, kaynak: 'Vikipedi' };
}

// ── SIRALAMALAR: UEFA ülke ve kulüp katsayıları (UEFA'nın kendi sitesinin veri servisi), FIFA dünya sıralaması (FIFA'nın sitesinin veri servisi) ──
async function siralamaTopla(){
  const dosya = path.join(VERI, 'siralama.json'); let eski = {}; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  const o = { t: Date.now() };
  const s = new Date(), hedef = s.getUTCMonth() >= 6 ? s.getUTCFullYear() + 1 : s.getUTCFullYear();   // 2026-27 sezonu = 2027
  const uefa = async tip => { const j = await al('https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=' + tip + '&language=EN&page=1&pagesize=500&seasonYear=' + hedef, { h: { 'User-Agent': 'Mozilla/5.0' } });
    return (j && j.data && j.data.members) ? { guncel: j.data.lastUpdateDate || '', liste: j.data.members } : null; };
  const ulke = await uefa('MEN_ASSOCIATION');
  if(ulke) o.uefaUlke = { guncel: ulke.guncel, sezon: hedef, liste: ulke.liste.map(m => ({ s: m.overallRanking.position, kod: m.member.countryCode, ad: m.member.countryName, logo: m.member.logoUrl, p: m.overallRanking.totalValue,
    takim: m.overallRanking.numberOfTeams, kalan: m.overallRanking.numberOfTeamsStillInPlaying, egilim: m.overallRanking.trend,
    sz: (m.seasonRankings || []).map(z => ({ y: z.seasonYear, p: z.totalValue })).sort((a, b) => a.y - b.y) })).sort((a, b) => a.s - b.s) };
  else if(eski.uefaUlke) o.uefaUlke = eski.uefaUlke;
  const kulup = await uefa('MEN_CLUB');
  if(kulup) o.uefaKulup = { guncel: kulup.guncel, sezon: hedef, liste: kulup.liste.map(m => ({ s: m.overallRanking.position, ad: m.member.displayName, kod: m.member.countryCode, ulke: m.member.countryName, logo: m.member.logoUrl,
    p: m.overallRanking.totalValue, ulkeP: m.overallRanking.nationalAssociationPoints, egilim: m.overallRanking.trend, kupa: m.competition && m.competition.displayName || '',
    sz: (m.seasonRankings || []).map(z => ({ y: z.seasonYear, p: z.totalValue })).sort((a, b) => a.y - b.y) })).sort((a, b) => a.s - b.s) };
  else if(eski.uefaKulup) o.uefaKulup = eski.uefaKulup;
  // FIFA: sıralama sayfasının içindeki tarih listesinden en yeni resmî sıralama (ör. FRS_Male_Football_20260720). Aynıysa eski veri kullanılır;
  // değilse veri servisi o kimlikle, olmazsa sayısal kimlikler (id15175 gibi) taranarak bulunur.
  const fifa = async id => { const j = await al('https://inside.fifa.com/api/ranking-overview?locale=en&dateId=' + id, { h: { 'User-Agent': 'Mozilla/5.0' }, deneme: 2 }); return (j && j.rankings && j.rankings.length) ? j.rankings : null; };
  let enIyi = null, enId = (eski.fifa && eski.fifa.id) || '';
  const sayfa = String(await al('https://inside.fifa.com/fifa-world-ranking/men', { metin: true, h: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' } }) || '');
  let yeniId = ''; try{ const nd = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(sayfa); const d = JSON.parse(nd[1]).props.pageProps.pageData.ranking.dates;
    yeniId = d.flatMap(x => x.dates || []).map(x => x.id).filter(Boolean).sort((x, y) => (/(\d{8})$/.exec(y) || [0, '0'])[1].localeCompare((/(\d{8})$/.exec(x) || [0, '0'])[1]))[0] || ''; }catch(e){}
  const yeniGun = (/(\d{4})(\d{2})(\d{2})$/.exec(yeniId) || []).slice(1).join('-');
  const tarih = r => Date.parse((r[0] && r[0].lastUpdateDate) || '') || 0;
  if(eski.fifa && yeniGun && String(eski.fifa.guncel).slice(0, 10) === yeniGun){ o.fifa = eski.fifa; }
  else {
    if(yeniId){ const r = await fifa(yeniId); if(r){ enIyi = r; enId = yeniId; } }
    if(!enIyi){
      const ids = [...new Set(sayfa.match(/id1\d{4}/g) || [])].map(x => +x.slice(2)); if(/^id\d+$/.test(enId)) ids.push(+enId.slice(2));
      const n = ids.length ? Math.max(...ids) : 15175;
      const r0 = await fifa('id' + n); if(r0){ enIyi = r0; enId = 'id' + n; }
      for(let k = n + 1, bos = 0; k < n + 600 && bos < 150; k++){ const r = await fifa('id' + k); if(r && (!enIyi || tarih(r) >= tarih(enIyi))){ enIyi = r; enId = 'id' + k; bos = 0; if(yeniGun && String(r[0].lastUpdateDate).slice(0, 10) === yeniGun) break; } else bos++; }
    }
  }
  if(o.fifa){} else if(enIyi) o.fifa = { id: enId, guncel: (enIyi[0] && enIyi[0].lastUpdateDate) || '', liste: enIyi.map(x => ({ s: x.rankingItem.rank, ad: x.rankingItem.name, kod: x.rankingItem.countryCode, bayrak: x.rankingItem.flag && x.rankingItem.flag.src,
    p: x.rankingItem.totalPoints, onceki: x.rankingItem.previousRank, oncekiP: x.previousPoints, kita: x.tag && x.tag.text })).sort((a, b) => a.s - b.s) };
  else if(eski.fifa) o.fifa = eski.fifa;
  fs.writeFileSync(dosya, JSON.stringify(o));
  console.log('SIRALAMA', 'uefa ülke', o.uefaUlke ? o.uefaUlke.liste.length : 0, 'uefa kulüp', o.uefaKulup ? o.uefaKulup.liste.length : 0, 'fifa', o.fifa ? o.fifa.liste.length + ' ' + o.fifa.guncel + ' ' + o.fifa.id : 0);
}

// ── TFF (2026-11-18, kullanıcı: "bazı ligler kırmızı grup, beyaz grup veya 1., 2., 3. grup olarak adlandırılır ... araştırıp ona göre düzenle";
//    "spiker, yorumcu ve TV bilgisi dahil verileri otomatik olarak doğru bir kaynağa bağlarsan"). Türk liglerinin resmî kaynağı tff.org:
//    sezonun bütün fikstürü (grup grup: "Kırmızı Grup", "Beyaz Grup", "01 Grup"...), maç kodları ve her maçın sayfasındaki görevliler
//    (hakem, 1./2. yardımcı, dördüncü hakem, VAR, AVAR), tarih, saat, stat, takım logoları. Çıktı: veri/tff-<lig>.json.
//    Görevliler maçtan 1-3 gün önce açıklanır: yakın maçlar her çalışmada, oynanmış maçlar bir kez (arşiv) okunur.
const TFF_SAYFA = { 'tur.1': 198, 'tur.2': 142, 'tur.3': 976, 'tur.4': 971 };
async function tffAl(u){
  for(let i = 0; i < 3; i++){
    try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, signal: AbortSignal.timeout(40000) });
      if(r.status >= 500 || r.status === 429){ await bek(3000 * (i + 1)); continue; } if(!r.ok) return '';
      const b = Buffer.from(await r.arrayBuffer()); return /utf-8/i.test(r.headers.get('content-type') || '') ? b.toString('utf8') : new TextDecoder('windows-1254').decode(b); }catch(e){ await bek(2000 * (i + 1)); }
  }
  return '';
}
const tffEnt = s => String(s || '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&nbsp;?/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const GRUP_AD = g => { g = tffEnt(g); const m = /^0?(\d+)\.?\s*Grup$/i.exec(g); return m ? m[1] + '. Grup' : g; };
function tffListe(h){
  // Bölümler: <span ...font-size:11pt...>Lig<br/>Grup<br/>Sezon ...</span> ardından haftalar ("1.Hafta") ve satırlar
  const out = []; const re = /<span style="display:inline-block;font-size:11pt[^>]*>([\s\S]*?)<\/span>|>(\d+)\.Hafta<|kulupId=(\d+)">([^<]+)<\/a><\/td>\s*<td[^>]*><a href="\/Default\.aspx\?pageID=29&macId=(\d+)">([^<]*)<\/a><\/td>\s*<td[^>]*><a href="\/Default\.aspx\?pageID=28&kulupId=(\d+)">([^<]+)</gi;
  let m, grup = '', hafta = 0;
  while((m = re.exec(h))){
    if(m[1] != null){ const p = m[1].split(/<br\s*\/?>/i).map(tffEnt).filter(Boolean); grup = (p.length >= 3 && /grup/i.test(p[1])) ? GRUP_AD(p[1]) : ''; hafta = 0; continue; }
    if(m[2] != null){ hafta = +m[2]; continue; }
    const sk = /(\d+)\s*-\s*(\d+)/.exec(m[6] || '');
    out.push({ id: m[5], h: hafta, g: grup, evK: m[3], ev: tffEnt(m[4]), depK: m[7], dep: tffEnt(m[8]), evG: sk ? +sk[1] : null, depG: sk ? +sk[2] : null });
  }
  return out;
}
const TFF_ROL = { 'Hakem': 'referee', '1. Yardımcı Hakem': 'assistRef1', '2. Yardımcı Hakem': 'assistRef2', 'Dördüncü Hakem': 'fourthRef', 'VAR': 'varRef', 'AVAR': 'avarRef' };
const adDuzelt = s => tffEnt(s).toLocaleLowerCase('tr-TR').replace(/(^|[\s\-'(.])(\p{L})/gu, (a, b, c) => b + c.toLocaleUpperCase('tr-TR'));
function tffMacOku(h){
  const o = {}, duz = h.replace(/<[^>]+>/g, ' '), mk = Math.max(0, duz.indexOf('Maç Kodu')); const t = /(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2}):(\d{2})/.exec(duz.slice(mk));
  if(t) o.z = new Date(Date.UTC(+t[3], +t[2] - 1, +t[1], +t[4] - 3, +t[5])).toISOString();   // Türkiye saati
  const hk = {}; for(const m of h.matchAll(/lnkHakem"[^>]*>([^<]+?)\(([^()<]+)\)<\/a>/g)){ const r = TFF_ROL[tffEnt(m[2])]; if(r && !hk[r]) hk[r] = adDuzelt(m[1]); }
  if(Object.keys(hk).length) o.hk = hk;
  const lg = [...h.matchAll(/src="(https:\/\/fys\.tff\.org\/TFFUploadFolder\/KulupLogolari[^"]+)"/g)].map(m => m[1].replace(/\\/g, '/'));
  if(lg.length >= 2){ o.evLogo = lg[0]; o.depLogo = lg[1]; }
  const st = /lnkStad"[^>]*>([^<]+)</.exec(h); if(st) o.st = adDuzelt(st[1]);
  return o;
}
async function tffTopla(){
  const simdi = Date.now(), ozet = [];
  for(const [slug, sayfa] of Object.entries(TFF_SAYFA)){
    const dosya = path.join(VERI, 'tff-' + slug + '.json'); let eski = {}; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
    const h = await tffAl('https://www.tff.org/default.aspx?pageID=' + sayfa); const liste = h ? tffListe(h) : [];
    if(!liste.length){ ozet.push(slug + ' liste yok'); continue; }
    const once = {}; (eski.mac || []).forEach(m => { once[m.id] = m; });
    const mac = liste.map(m => { const e = once[m.id] || {}; return Object.assign({}, m, { z: e.z, hk: e.hk, st: e.st, evLogo: e.evLogo, depLogo: e.depLogo, t: e.t || 0 }); });
    // hangi maçların sayfası okunur: tarihi bilinmeyen (ilk kez), yakın (-1..+4 gün, 3 saatte bir), görevlisi eksik oynanmış maç (arşiv, bir kez)
    const yakin = m => m.z && Math.abs(Date.parse(m.z) - simdi) < 4 * 864e5;
    const sira = mac.filter(m => !m.t || (yakin(m) && simdi - m.t > 3 * 3600e3) || (m.evG != null && !m.hk && simdi - m.t > 864e5));
    sira.sort((a, b) => (yakin(b) ? 1 : 0) - (yakin(a) ? 1 : 0));
    const sinir = HIZLI ? 80 : 700; let n = 0;
    for(const m of sira.slice(0, sinir)){ const d = await tffAl('https://www.tff.org/Default.aspx?pageID=29&macID=' + m.id); if(!d) continue; Object.assign(m, tffMacOku(d)); m.t = simdi; n++; await bek(150); }
    const gruplar = {}; mac.forEach(m => { if(!m.g) return; const g = gruplar[m.g] || (gruplar[m.g] = {}); g[m.evK] = m.ev; g[m.depK] = m.dep; });
    const cikti = { lig: slug, kaynak: 'TFF', t: simdi, gruplar: Object.keys(gruplar).length ? gruplar : null, mac: mac.map(m => { const o = Object.assign({}, m); Object.keys(o).forEach(k => { if(o[k] == null || o[k] === '') delete o[k]; }); return o; }) };
    fs.writeFileSync(dosya, JSON.stringify(cikti));
    ozet.push(slug + ' maç ' + mac.length + ' okunan ' + n + ' görevlili ' + mac.filter(m => m.hk).length + ' grup ' + Object.keys(gruplar).join('/'));
  }
  console.log('TFF', ozet.join(' | '));
}
// TFF 3. Lig gibi yalnız TFF'de olan ligler: maçlar ve takımlar TFF dosyasından (logolar TFF'nin kulüp logoları)
async function tffLig(L, eski){
  let j = null; try{ j = JSON.parse(fs.readFileSync(path.join(VERI, 'tff-' + L.slug + '.json'), 'utf8')); }catch(e){}
  if(!j || !j.mac) return { yil: 0, sezonAdi: '', takim: (eski && eski.takim) || {}, gecmis: {}, mac: (eski && eski.mac) || [], kaynak: 'TFF' };
  const s = new Date(), y = s.getUTCMonth() >= 6 ? s.getUTCFullYear() : s.getUTCFullYear() - 1;
  const takim = {}, kisa = a => adDuzelt(a).replace(/\s+(A\.?\s?Ş\.?|Futbol Kulübü|Spor Kulübü|Kulübü|Futbol Spor Kulübü|Spor Faaliyetleri A\.?Ş\.?)$/i, '').trim();
  j.mac.forEach(m => { [[m.evK, m.ev, m.evLogo], [m.depK, m.dep, m.depLogo]].forEach(([k, a, lg]) => { const t = takim[k] || (takim[k] = { ad: kisa(a), kisa: kisa(a), logo: '' }); if(lg && !t.logo) t.logo = lg; }); });
  const mac = j.mac.filter(m => m.z).map(m => ({ id: m.id, r: m.h, z: m.z, ev: m.evK, dep: m.depK, evAd: takim[m.evK].ad, depAd: takim[m.depK].ad, evLogo: takim[m.evK].logo, depLogo: takim[m.depK].logo,
    evG: m.evG, depG: m.depG, d: m.evG != null ? 'FT' : '', st: m.st || '', hakem: (m.hk && m.hk.referee) || '', grup: m.g || '' }));
  return { yil: y, sezonAdi: y + '-' + (y + 1), takim, gecmis: {}, mac, kaynak: 'TFF' };
}

// ── TV: beIN SPORTS yayın akışı (bugün ve yarın; beIN 1-4). Canlı maçın kanalı, maç saatinde başlayan "Ev - Deplasman" satırından bulunur.
//    Spiker / yorumcu adı beIN'in hiçbir sayfasında ve veri servisinde yok (maç servisi hakemleri veriyor, yayın ekibini vermiyor).
async function yayinTopla(){
  const dosya = path.join(VERI, 'yayin.json'); let eski = {}; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  const KANAL = [['beinsports', 'beIN SPORTS 1'], ['beinsports-2', 'beIN SPORTS 2'], ['beinsports-3', 'beIN SPORTS 3'], ['beinsports-4', 'beIN SPORTS 4']];
  const GUN = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
  const tr = new Date(Date.now() + 3 * 3600e3), gunler = [GUN[tr.getUTCDay()], GUN[(tr.getUTCDay() + 1) % 7]];
  const yeni = []; let okunan = 0;
  for(const [yol, ad] of KANAL) for(const g of gunler){
    const h = await tffAl('https://beinsports.com.tr/yayin-akisi/' + yol + '/' + g); const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(h || ''); if(!m) continue;
    let d = null; try{ d = JSON.parse(m[1]).props.pageProps.data; }catch(e){} const l = (d && d.listTvGuides) || []; if(!l.length) continue; okunan++;
    l.forEach(x => { const t = /(\d+)\/(\d+)\/(\d{4})/.exec(x.event_date || ''), s = /^(\d{2}):(\d{2})/.exec(x.event_time || ''); if(!t || !s || !/ - /.test(x.name || '')) return;
      yeni.push({ g: t[3] + '-' + t[1].padStart(2, '0') + '-' + t[2].padStart(2, '0'), s: s[1] + ':' + s[2], ad: x.name, k: ad, mid: x.related_match_id || undefined }); });
  }
  const sinir = Date.now() - 12 * 864e5, anah = x => x.g + '|' + x.s + '|' + x.k + '|' + x.ad, gor = {};
  const tum = yeni.concat(eski.liste || []).filter(x => { if(Date.parse(x.g) < sinir || gor[anah(x)]) return false; gor[anah(x)] = 1; return true; });
  fs.writeFileSync(dosya, JSON.stringify({ t: Date.now(), kaynak: 'beIN SPORTS yayın akışı', liste: tum }));
  console.log('YAYIN', 'okunan sayfa', okunan, 'yeni satır', yeni.length, 'toplam', tum.length);
}
// ── Lig ─────────────────────────────────────────────────────────────────────────────────────────────
async function ligIsle(L){
  const dosya = path.join(VERI, L.slug + '.json');
  let eski = null; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  if(HIZLI && !L.tsdb) return;
  const t0 = Date.now(); const ad = (x) => console.log('  ' + L.slug + ' ' + x + ' ' + ((Date.now() - t0) / 1000 | 0) + 's');
  const temel = L.tsdb === 'wiki' ? await wikiLig(L, eski) : L.tsdb === 'tff' ? await tffLig(L, eski) : L.tsdb ? await tsdbLig(L, eski) : await espnLig(L, eski); ad('temel');
  const takim = {};
  Object.entries(temel.takim).forEach(([id, t]) => { takim[id] = Object.assign({}, t); const tr = TR_AD[t.ad]; if(tr) takim[id].adTr = tr; });
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
    if(L.tsdb && L.tsdb !== 'wiki' && L.tsdb !== 'tff' && Date.now() - ((eski && eski.kadroT) || 0) > 6 * 864e5){ kadroDosya = await wdKadro(takim); kadroT = Date.now(); }
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
  const tum = ligleriOku();
  const ligler = tum.filter((l, i) => (!SECILI.length || SECILI.includes(l.slug)) && (!(GRUP.length === 2 && GRUP[1] > 0) || i % GRUP[1] === GRUP[0]));
  if(!HIZLI && (SECILI.includes('siralama') || (!SECILI.length && !(GRUP.length === 2 && GRUP[0] !== 0)))){ try{ await siralamaTopla(); }catch(e){ console.log('HATA sıralama', e && e.stack || e); } }
  const ana = !SECILI.length && !(GRUP.length === 2 && GRUP[0] !== 0);   // tek iş (grup 0) ortak dosyaları yazar
  if(SECILI.includes('tff') || ana){ try{ await tffTopla(); }catch(e){ console.log('HATA tff', e && e.stack || e); } }
  if(SECILI.includes('yayin') || ana){ try{ await yayinTopla(); }catch(e){ console.log('HATA yayın', e && e.stack || e); } }
  for(const L of ligler){ try{ await ligIsle(L); }catch(e){ console.log('HATA', L.slug, e && e.stack || e); } }
  if(!SECILI.length) fs.writeFileSync(path.join(VERI, 'liste.json'), JSON.stringify({ ligler: tum.map(l => l.slug) }));
  if(OZET.length) console.log('FOTOĞRAF ÖZETİ', JSON.stringify(OZET));
})();
