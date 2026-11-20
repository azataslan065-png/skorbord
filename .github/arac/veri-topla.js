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
  const s = fs.readFileSync(path.join(KOK, 'gercek.js'), 'utf8'); const m0 = /var LIGLER=\[([\s\S]*?)\n\];/.exec(s), m1 = /var LIGLER_SPOR=\[([\s\S]*?)\n\];/.exec(s);
  const m = [null, m0[1] + '\n' + ((m1 && m1[1]) || '')];   // futbol + basketbol / voleybol (2026-11-18-L)
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
  // eleme turları (TheSportsDB: 125 çeyrek final, 150 yarı final, 160 üçüncülük, 200 final vb.) ve play-off
  /* 0: turu tutulmayan ligler (KBL, BNXT, BAL…) */ for(const r of [0, 100, 125, 150, 160, 170, 180, 200, 300, 400, 500]){ const j = await tsdb('eventsround.php?id=' + id + '&r=' + r + '&s=' + s); const e = (j && j.events) || []; e.forEach(x => { if(!mac.some(m => m.id === x.idEvent)) mac.push(tsdbMac(x, r)); }); }
  return mac;
}
function tsdbMac(x, r){
  return { id: x.idEvent, r: +x.intRound || r, z: x.strTimestamp ? x.strTimestamp + (/Z|[+-]\d\d:?\d\d$/.test(x.strTimestamp) ? '' : 'Z') : (x.dateEvent ? x.dateEvent + 'T' + (x.strTime || '00:00:00') + 'Z' : ''),
    ev: x.idHomeTeam, dep: x.idAwayTeam, evAd: x.strHomeTeam, depAd: x.strAwayTeam, evLogo: x.strHomeTeamBadge || '', depLogo: x.strAwayTeamBadge || '',
    evG: x.intHomeScore === null || x.intHomeScore === '' || x.intHomeScore === undefined ? null : +x.intHomeScore, depG: x.intAwayScore === null || x.intAwayScore === '' || x.intAwayScore === undefined ? null : +x.intAwayScore,
    d: x.strStatus || '', st: x.strVenue || '', setler: tsdbPeriyot(x) };
}
// (2026-11-19) TheSportsDB strResult: basketbolda "Takım Quarters:<br>24 21 10 21 <br><br>Takım2 Quarters:<br>…", voleybolda
// "Takım First:<br>25 21 <br>Second<br>29 27 …" → "(24-18) (21-25) …" (uygulama çeyrek / set tablosu olarak gösterir)
function tsdbPeriyot(x){
  const r = String(x.strResult || ''); if(!r) return '';
  const h = x.intHomeScore == null || x.intHomeScore === '' ? null : +x.intHomeScore, a = x.intAwayScore == null || x.intAwayScore === '' ? null : +x.intAwayScore;
  if(/Quarters?:/i.test(r)){ const bl = r.split(/<br>\s*<br>/i).map(b => { const m = /Quarters?:\s*<br>([\d\s]+)/i.exec(b); return m ? m[1].trim().split(/\s+/).filter(Boolean).map(Number) : null; }).filter(Boolean);
    if(bl.length >= 2 && bl[0].length && bl[0].length === bl[1].length){ const t0 = bl[0].reduce((p, q) => p + q, 0), t1 = bl[1].reduce((p, q) => p + q, 0);
      if(h == null || (t0 <= h && t1 <= a && h - t0 <= 30 && a - t1 <= 30)) return bl[0].map((v, i) => '(' + v + '-' + bl[1][i] + ')').join(' '); }
    return ''; }
  const set = [...r.matchAll(/(First|Second|Third|Fourth|Fifth|Golden)[a-z ]*:?\s*<br>\s*(\d+)\s+(\d+)/gi)].map(m => [+m[2], +m[3]]);
  if(set.length){ const k = set.filter(q => q[0] > q[1]).length, l = set.filter(q => q[1] > q[0]).length;
    const ters = h != null && k !== h && l === h; return set.map(q => ters ? '(' + q[1] + '-' + q[0] + ')' : '(' + q[0] + '-' + q[1] + ')').join(' '); }
  return '';
}
// Basketbol / voleybol takım kadroları (TheSportsDB ücretsiz: takım başına en çok 10 oyuncu; teknik direktör ayrılır)
const OYUNCU_MEVKI = [[/point guard/i, 'OK'], [/shooting guard/i, 'ŞT'], [/guard/i, 'G'], [/small forward/i, 'KF'], [/power forward/i, 'UF'], [/forward/i, 'F'], [/center/i, 'P'],
  [/setter/i, 'PS'], [/opposite/i, 'PÇ'], [/outside|hitter|wing/i, 'SM'], [/middle/i, 'OO'], [/libero/i, 'LB']];
async function tsdbOyuncular(takim){
  const o = {};
  for(const id of Object.keys(takim)){
    const j = await tsdb('lookup_all_players.php?id=' + id); const l = (j && (j.player || j.players)) || [];
    o[id] = l.filter(p => !/manager|coach|antren/i.test(p.strPosition || '')).map(p => { const m = OYUNCU_MEVKI.find(x => x[0].test(p.strPosition || ''));
      const x = { ad: p.strPlayer || '', mevki: m ? m[1] : (p.strPosition || ''), no: p.strNumber ? +p.strNumber || p.strNumber : '', uyruk: p.strNationality || '' };
      const f = p.strCutout || p.strThumb || p.strRender; if(f) x.foto = { f: f + (/\.(png|jpg)$/i.test(f) ? '/small' : ''), l: 'TheSportsDB', u: 'https://www.thesportsdb.com/player/' + p.idPlayer };
      if(p.dateBorn){ const y = new Date(p.dateBorn); if(!isNaN(y)) x.yas = Math.floor((Date.now() - y) / 31557600000); } return x; });
  }
  return o;
}
async function tsdbLig(L, eski){
  const lj = await tsdb('lookupleague.php?id=' + L.tsdb); const lig = (lj && lj.leagues && lj.leagues[0]) || {};
  let s = (HIZLI && eski && eski.sezonAdi && eski.mac && eski.mac.length) ? eski.sezonAdi : (lig.strCurrentSeason || ((eski && eski.sezonAdi) || ''));
  let mac;
  if(HIZLI && eski && eski.mac && eski.mac.length && eski.sezonAdi === s){
    // 30 dakikalık güncelleme: yalnızca bitmemiş ve şu ana yakın (dün-yarın) maçların turları yeniden istenir
    const simdi = Date.now(), turlar = new Set();
    eski.mac.forEach(m => { const z = Date.parse(m.z); if(!/^ft$|finish|aet|pen/i.test(m.d || '') && z > simdi - 864e5 && z < simdi + 2 * 864e5) turlar.add(m.r); });
    mac = eski.mac.slice();
    for(const r of turlar){ const j = await tsdb('eventsround.php?id=' + L.tsdb + '&r=' + r + '&s=' + s); const e = (j && j.events) || [];
      e.forEach(x => { const i = mac.findIndex(m => m.id === x.idEvent); const yeni = tsdbMac(x, r); if(i >= 0) mac[i] = Object.assign({}, mac[i], yeni, { evLogo: mac[i].evLogo || yeni.evLogo, depLogo: mac[i].depLogo || yeni.depLogo }); else mac.push(yeni); }); }
  } else mac = await tsdbSezon(L.tsdb, s);
  // TheSportsDB'nin "güncel sezon" adı bazen maçların sezon adından farklı (EuroCup: "2026" / maçlar "2026-2027"): diğer yazımlar denenir
  if(!mac.length && !HIZLI && s){ const y = parseInt(s, 10); for(const a of (/-/.test(s) ? [String(y + 1), String(y)] : [y + '-' + (y + 1), (y - 1) + '-' + y])){ const m2 = await tsdbSezon(L.tsdb, a); if(m2.length){ mac = m2; s = a; break; } } }
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
  if(!HIZLI && y0 && !/^(bsk|vlb)\./.test(L.slug)) for(const y of [y0 - 1, y0 - 2]){
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
    const b = await sparql('SELECT ?c ?cTr ?cEn ?inc ?pre ?stTr ?stEn ?cap ?kd ?tr ?en ?resmi WHERE { VALUES ?c { ' + p.map(x => 'wd:' + x).join(' ') + ' } '
      + 'OPTIONAL { ?c rdfs:label ?cTr FILTER(lang(?cTr)="tr") } OPTIONAL { ?c rdfs:label ?cEn FILTER(lang(?cEn)="en") } '
      + 'OPTIONAL { ?c p:P571/psv:P571 [ wikibase:timeValue ?inc ; wikibase:timePrecision ?pre ] } '
      + 'OPTIONAL { ?c wdt:P115 ?st . OPTIONAL { ?st rdfs:label ?stTr FILTER(lang(?stTr)="tr") } OPTIONAL { ?st rdfs:label ?stEn FILTER(lang(?stEn)="en") } OPTIONAL { ?st wdt:P1083 ?cap } OPTIONAL { ?st wdt:P625 ?kd } } '
      + 'OPTIONAL { ?trw schema:about ?c ; schema:isPartOf <https://tr.wikipedia.org/> ; schema:name ?tr } OPTIONAL { ?enw schema:about ?c ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?en } }');
    b.forEach(x => { const c = qid(v(x, 'c')); const k = o[c] || (o[c] = { ad: v(x, 'cTr') || v(x, 'cEn') });
      if(v(x, 'inc') && !k.wdT){ const d = v(x, 'inc').replace(/^\+/, ''), pr = +v(x, 'pre'); const m = /^(-?\d+)-(\d\d)-(\d\d)/.exec(d); if(m) k.wdT = { y: +m[1], a: pr >= 10 ? +m[2] : 0, g: pr >= 11 ? +m[3] : 0 }; }
      if(v(x, 'stTr') || v(x, 'stEn')){ k.stad = v(x, 'stTr') || v(x, 'stEn'); if(v(x, 'cap')) k.kap = Math.round(+v(x, 'cap')); }
      { const km = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(v(x, 'kd') || ''); if(km && !k.koord) k.koord = [+(+km[2]).toFixed(4), +(+km[1]).toFixed(4)]; }   // stadın konumu: hava durumu için
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
  const o = {}, duz = h.replace(/<[^>]+>/g, ' '), mk = Math.max(0, duz.indexOf('Maç Kodu')); const lt = /lblTarih">([^<]+)</.exec(h); const t = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2}):(\d{2})/.exec(lt ? lt[1] : duz.slice(mk));   // gün tek haneli olabilir: 6.09.2026
  if(t) o.z = new Date(Date.UTC(+t[3], +t[2] - 1, +t[1], +t[4] - 3, +t[5])).toISOString();   // Türkiye saati
  else { const g = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(lt ? lt[1] : duz.slice(mk, mk + 400)); if(g){ o.z = new Date(Date.UTC(+g[3], +g[2] - 1, +g[1], 9, 0)).toISOString(); o.saatYok = true; } }   // saati henüz açıklanmamış
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
    const mac = liste.map(m => { const e = once[m.id] || {}; return Object.assign({}, m, { z: e.z, saatYok: e.saatYok, hk: e.hk, st: e.st, evLogo: e.evLogo, depLogo: e.depLogo, t: e.t || 0 }); });
    // hangi maçların sayfası okunur: tarihi bilinmeyen (ilk kez), yakın (-1..+4 gün), görevlisi eksik oynanmış maç (arşiv, bir kez).
    // (2026-11-20, kullanıcı: "hakemler TFF tarafından açıklanmış fakat bizim sistem bunu ve diğer maçları görmüyor") KÖK SEBEP: yakın maçın sayfası
    // en fazla 3 saatte bir okunuyordu; TFF atamayı bu arada açıklayınca maç saatine kadar hakem görünmüyordu (Iğdır - Ümraniyespor: son okuma
    // 21:17, atama sonra geldi). ŞİMDİ hakemi henüz açıklanmamış yakın maç 20 dakikada bir, açıklanmış olan (değişiklik için) 3 saatte bir okunur;
    // hakemsizler sıranın başına alınır.
    const yakin = m => m.z && Math.abs(Date.parse(m.z) - simdi) < 4 * 864e5;
    const sira = mac.filter(m => !m.t || (yakin(m) && simdi - m.t > (m.hk ? 3 * 3600e3 : 20 * 60e3)) || (!m.z) || (m.saatYok && simdi - m.t > 12 * 3600e3) || (m.evG != null && !m.hk && simdi - m.t > 864e5));
    const oncelik = m => (yakin(m) ? 2 : 0) + (yakin(m) && !m.hk ? 1 : 0), uzak = m => m.z ? Math.abs(Date.parse(m.z) - simdi) : 9e15;
    sira.sort((a, b) => (oncelik(b) - oncelik(a)) || (uzak(a) - uzak(b)));   // en yakın maç önce
    const bas = Date.now();   // hızlı turda lig başına en çok 75 sn: canlı skor turu (6 dk) gecikmesin; kalanlar sonraki turda okunur
    const sinir = HIZLI ? 80 : 700; let n = 0;
    let hata = 0, top = 0;
    for(const m of sira.slice(0, sinir)){ if(HIZLI && Date.now() - bas > 75e3) break; const d = await tffAl('https://www.tff.org/Default.aspx?pageID=29&macID=' + m.id); const o = d ? tffMacOku(d) : {};
      if(!o.z){ hata++; top++; if(top >= 40) break; if(hata >= 6){ await bek(20000); hata = 0; } else await bek(1200); continue; }   // boş / sınır sayfası: işaretlenmez, sonraki çalışmada yeniden denenir
      hata = 0; Object.assign(m, o); m.t = simdi; n++; await bek(300); }
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
  const takim = {}, kisa = a => { let x = adDuzelt(a).replace(/\b(Fk|Sk|Jk|Bk|Gsk|Fsk|As)\b/g, k => k.toUpperCase()), y;
    do{ y = x; x = x.replace(/\s+(A\.?\s?Ş\.?|Futbol Kulübü SK|Kulübü SK|Futbol Kulübü|Spor Kulübü|Kulübü|Futbol Spor|Spor Faaliyetleri|Faaliyetleri|Futbol Yatırımları|Futbol|Anonim Şirketi)$/i, '').trim(); }while(x !== y && x.length > 3);
    return x; };
  j.mac.forEach(m => { [[m.evK, m.ev, m.evLogo], [m.depK, m.dep, m.depLogo]].forEach(([k, a, lg]) => { const t = takim[k] || (takim[k] = { ad: kisa(a), kisa: kisa(a), logo: '' }); if(lg && !t.logo) t.logo = lg; }); });
  // TFF resmî adları sponsorlu yazar ("Kızılkaya Tarım Şanlıurfaspor", "GMG Kastamonuspor"); TheSportsDB'nin sponsorsuz adı varsa o gösterilir
  let AD = {}; try{ AD = JSON.parse(fs.readFileSync(path.join(__dirname, 'tff-adlar.json'), 'utf8')); }catch(e){} if(AD[L.slug]){ const tl = AD[L.slug];   // eski TheSportsDB dosyasındaki sponsorsuz adlar (tff-adlar.json)
    const P = a => norm(a).split(' ').filter(x => x.length > 1 && !/^(fk|sk|as|a|s|kulubu|futbol|spor)$/.test(x)).map(x => x.length > 6 ? x.replace(/spor$/, '') : x);
    const ben = (a, b) => { const A = P(a), B = P(b); if(!A.length || !B.length) return 0; return A.filter(x => B.some(y => y === x || (x.length >= 4 && y.length >= 4 && (y.startsWith(x) || x.startsWith(y))))).length / Math.min(A.length, B.length); };
    const kul = {}; Object.values(takim).forEach(t => { let en = null, ep = 0; tl.forEach(n => { if(kul[n]) return; const p = ben(t.ad, n); if(p > ep){ ep = p; en = n; } }); if(en && ep >= 1 && P(en).length < P(t.ad).length){ kul[en] = 1; t.tffAd = t.ad; t.ad = t.kisa = TR_AD[en] || en; } }); console.log('  ' + L.slug + ' sponsorsuz ad listesi', tl.length, 'değişen', Object.keys(kul).length, tl.slice(0, 5).join('/')); }
  else if(eski && eski.takim) Object.entries(takim).forEach(([k, t]) => { const e = eski.takim[k]; if(e && e.tffAd && e.tffAd === t.ad){ t.tffAd = e.tffAd; t.ad = t.kisa = e.ad; } });
  const mac = j.mac.filter(m => m.z).map(m => ({ id: m.id, r: m.h, z: m.z, ev: m.evK, dep: m.depK, evAd: takim[m.evK].ad, depAd: takim[m.depK].ad, evLogo: takim[m.evK].logo, depLogo: takim[m.depK].logo,
    evG: m.evG, depG: m.depG, d: m.evG != null ? 'FT' : '', st: m.st || '', saatYok: m.saatYok || undefined, hakem: (m.hk && m.hk.referee) || '', grup: m.g || '' }));
  return { yil: y, sezonAdi: y + '-' + (y + 1), takim, gecmis: {}, mac, kaynak: 'TFF' };
}

// ── TV: beIN SPORTS yayın akışı (bugün ve yarın; beIN 1-4). Canlı maçın kanalı, maç saatinde başlayan "Ev - Deplasman" satırından bulunur.
//    Spiker / yorumcu adı beIN'in hiçbir sayfasında ve veri servisinde yok (maç servisi hakemleri veriyor, yayın ekibini vermiyor).
async function yayinTopla(){
  const dosya = path.join(VERI, 'yayin.json'); let eski = {}; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  const KANAL = [['beinsports', 'beIN SPORTS 1'], ['beinsports-2', 'beIN SPORTS 2'], ['beinsports-3', 'beIN SPORTS 3'], ['beinsports-4', 'beIN SPORTS 4'], ['bein-sports-haber', 'beIN SPORTS HABER']];
  const GUN = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
  const tr = new Date(Date.now() + 3 * 3600e3), gunler = [GUN[tr.getUTCDay()], GUN[(tr.getUTCDay() + 1) % 7]];
  const yeni = []; let okunan = 0;
  for(const [yol, ad] of KANAL) for(const g of gunler){
    const h = await tffAl('https://beinsports.com.tr/yayin-akisi/' + yol + '/' + g); const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(h || ''); if(!m) continue;
    let d = null; try{ d = JSON.parse(m[1]).props.pageProps.data; }catch(e){} const l = (d && d.listTvGuides) || []; if(!l.length) continue; okunan++;
    l.forEach(x => { const t = /(\d+)\/(\d+)\/(\d{4})/.exec(x.event_date || ''), s = /^(\d{2}):(\d{2})/.exec(x.event_time || ''); if(!t || !s || !/ - /.test(x.name || '')) return;
      yeni.push({ g: t[3] + '-' + t[1].padStart(2, '0') + '-' + t[2].padStart(2, '0'), s: s[1] + ':' + s[2], ad: x.name, k: ad, mid: x.related_match_id || undefined }); });
  }
  // (2026-11-18, kullanıcı: "sadece beIN Sports yazması yetmiyor ... beIN Sports 1, 2, 3, Haber, tabii Spor 1, 2, 3 ve benzeri kanallar")
  // Kanal kanal yayın akışları (XMLTV, 7 güne kadar): beIN SPORTS 1-5 / MAX 1-2 / HABER, S Sport / S Sport 2, TRT 1, TRT Spor, TRT Spor Yıldız,
  // A Spor, ATV, TV8, TV8,5. Maçın kanalı, maç saatinde (±20 dk) başlayan ve iki takımın adını taşıyan programdan bulunur (uygulama eşleştirir).
  const EPG = ['https://iptv-epg.org/files/epg-tr.xml', 'https://www.open-epg.com/files/turkey1.xml', 'https://epgshare01.online/epgshare01/epg_ripper_TR1.xml.gz'];
  const KAD = id => { const x = id.replace(/\.tr$/i, '').replace(/[._]/g, ' ').replace(/\s+/g, ' ').replace(/\bHD\b/i, '').trim(), u = x.toUpperCase().replace(/\s+/g, '');
    let m; if((m = /^(?:BEINSPORTS|BEINSPORT)(\d)$/.exec(u)) || /^BEINSPORTS$/.test(u) && (m = [0, '1'])) return 'beIN SPORTS ' + m[1]; if((m = /^BEINSPORTSMAX(\d)$/.exec(u))) return 'beIN SPORTS MAX ' + m[1]; if(/^BEINSPORTSHABER$/.test(u)) return 'beIN SPORTS HABER';
    if(/^SSPORT?$/.test(u)) return 'S Sport'; if(/^SSPORT?2$/.test(u)) return 'S Sport 2'; if(/^SSPORT?PLUS$/.test(u)) return 'S Sport Plus'; if(/^TRT1$/.test(u)) return 'TRT 1'; if(/^(TRT3\/)?TRTSPOR$|^TRT3SPOR$/.test(u)) return 'TRT Spor'; if(/^TRTSPORYILDIZ$/.test(u)) return 'TRT Spor Yıldız';
    // (2026-11-20) Suudi Pro Lig HT Spor'da, Asya / Güney Amerika futbolu Spor Smart'ta (D-Smart), tenis / bisiklet Eurosport'ta: bu kanallar tanınmıyordu
    if(/^HTSPOR$/.test(u)) return 'HT Spor'; if((m = /^SPORSMART(\d?)$/.exec(u))) return 'Spor Smart' + (m[1] && m[1] !== '1' ? ' ' + m[1] : ''); if((m = /^EUROSPORT(\d?)$/.exec(u))) return 'Eurosport' + (m[1] && m[1] !== '1' ? ' ' + m[1] : '');
    if(/^ASPOR$/.test(u)) return 'A Spor'; if(/^ATV$/.test(u)) return 'ATV'; if(/^TV8$/.test(u)) return 'TV8'; if(/^TV8,?5$/.test(u)) return 'TV8,5'; if((m = /^TABII(?:SPOR)?(\d)$/.exec(u))) return 'tabii Spor ' + m[1]; if((m = /^TIVIBUSPOR(\d?)$/.exec(u))) return 'Tivibu Spor' + (m[1] ? ' ' + m[1] : ''); return ''; };
  const zlib = require('zlib'), ent = x => String(x || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (a, n) => String.fromCharCode(+n)).trim();
  const trSaat = (st) => { const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\d{0,2}\s*([+-]\d{4})?/.exec(st); if(!m) return null; const of = m[6] ? (+m[6].slice(0, 3)) * 60 + Math.sign(+m[6].slice(0, 3) || 1) * (+m[6].slice(3)) : 0;
    const z = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - of * 60e3, t = new Date(z + 3 * 3600e3).toISOString(); return { z, g: t.slice(0, 10), s: t.slice(11, 16) }; };
  let epgSay = 0;
  for(const u of EPG){
    try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(90000) }); if(!r.ok) continue; let b = Buffer.from(await r.arrayBuffer()); if(b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b); const x = b.toString('utf8');
      for(const m of x.matchAll(/<programme start="([^"]+)"[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)){ const k = KAD(m[2]); if(!k) continue;
        const ti = ent((/<title[^>]*>([^<]*)</.exec(m[3]) || [])[1]), de = ent((/<desc[^>]*>([^<]*)</.exec(m[3]) || [])[1]); const ad = (ti + ' | ' + de).slice(0, 300);
        if(!/ - | – | vs\.? /i.test(ad) || /\b(BANT|TEKRAR|ÖZET|ÖZETLER|ARŞİV|ARSIV|HIGHLIGHTS)\b/i.test(ti)) continue;
        const t = trSaat(m[1]); if(!t || t.z < Date.now() - 864e5 || t.z > Date.now() + 8 * 864e5) continue;
        yeni.push({ g: t.g, s: t.s, ad, k, canli: /<live\s*\/>/.test(m[3]) || undefined }); epgSay++; } }catch(e){ console.log('  EPG okunamadı', u, e.message); }
  }
  // (2026-11-20, kullanıcı: "bazı yayın ihaleleri iki kanal üzerinden veriliyor; eğer ulaşılırsa ona göre bilgi eklensin") TFF 1. Lig 2026-27'de
  // beIN SPORTS'un yanında TRT Spor ve tabii'de de şifresiz yayınlanıyor; XMLTV akışlarında TRT Spor'un maç başlıkları yok. TRT Spor'un kendi
  // yayın akışı (trtspor.com.tr, 7 gün; TRT Spor, TRT Spor Yıldız, tabii Spor) okunur. Başlık: "TRENDYOL 1.LİG FUTBOL KARŞILAŞMASI 15.HAFTA
  // ALAGÖZ HOLDİNG IĞDIR FUTBOL KULÜBÜ - EMİNEVİM ÜMRANİYESPOR". Tekrarlar (isRepeat) alınmaz. Saatler "Z" etiketli ama Türkiye saati
  // (Iğdır - Ümraniyespor 20:00 → "20:00:00.000Z"); ileride gerçekten UTC'ye geçerse diye iki yorum da yazılır (uygulama ±20 dk ile eşleştirir,
  // yanlış olan hiçbir maçla tutmaz). TRT Spor'un canlı yayını tabii'de de aynı anda verildiği için TRT Spor maçlarına "tabii" de eklenir.
  let trtSay = 0;
  try{
    const h = await tffAl('https://www.trtspor.com.tr/yayin-akisi/trt-spor'); const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(h || '');
    let epg = null; const gez = x => { if(!x || typeof x !== 'object' || epg) return; if(Array.isArray(x.epg)){ epg = x.epg; return; } Object.values(x).forEach(gez); };
    if(m){ try{ gez(JSON.parse(m[1]).props.pageProps); }catch(e){} }
    const KAN = { 'trt-spor': 'TRT Spor', 'trt-spor-yildiz': 'TRT Spor Yıldız', 'tabii-spor': 'tabii Spor' };
    (epg || []).forEach(g => (g.tvChannels || []).forEach(c => { const k = KAN[c.slug]; if(!k) return;
      [].concat(c.past || [], c.upcoming || []).forEach(p => {
        const ti = String(p.title || '').replace(/\s+/g, ' ').trim(); if(p.isRepeat || !/ - | – /.test(ti) || /ÖZET|GOLLER|TEKRAR|BANT/i.test(ti)) return;
        const st = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(p.starttime || ''); if(!st) return;
        const ad = ti.replace(/^.*?\d+\.\s*HAFTA\s*/i, '').replace(/^.*?(KARŞILAŞMASI|MAÇI)\s*/i, '').trim() || ti;
        const yerel = { g: st[1], s: st[2] + ':' + st[3] }, z = new Date(Date.parse(st[1] + 'T' + st[2] + ':' + st[3] + ':00Z') + 3 * 3600e3).toISOString(), utc = { g: z.slice(0, 10), s: z.slice(11, 16) };
        [yerel, utc].forEach(t => { yeni.push({ g: t.g, s: t.s, ad, k, canli: true }); if(k === 'TRT Spor') yeni.push({ g: t.g, s: t.s, ad, k: 'tabii', canli: true }); });
        trtSay++; }); }));
  }catch(e){ console.log('  TRT Spor yayın akışı okunamadı', e.message); }
  console.log('  TRT Spor yayın akışı maç', trtSay);
  const sinir = Date.now() - 12 * 864e5, anah = x => x.g + '|' + x.s + '|' + x.k + '|' + x.ad, gor = {};
  const tum = yeni.concat(eski.liste || []).filter(x => { if(Date.parse(x.g) < sinir || gor[anah(x)]) return false; gor[anah(x)] = 1; return true; });
  fs.writeFileSync(dosya, JSON.stringify({ t: Date.now(), kaynak: 'beIN SPORTS yayın akışı ve kanal yayın akışları (XMLTV)', liste: tum }));
  console.log('  EPG maç programı', epgSay, 'kanallar', [...new Set(yeni.map(x => x.k))].join(', '));
  console.log('YAYIN', 'okunan sayfa', okunan, 'yeni satır', yeni.length, 'toplam', tum.length);
}

// ── YOUTUBE CANLI YAYINLARI (2026-11-18, kullanıcı: "Bazı maçlar YouTube'dan canlı yayınlanıyor; öyle bir sistem kur ki o maçlar TV sekmesinden
//    izlenebilsin"). Başlamak üzere olan / oynanan her maç için YouTube'da (anahtarsız arama sayfası) iki takımın adını taşıyan canlı ya da
//    planlanmış yayın aranır. Korsan yayın girmesin diye yalnızca: admin'in izin verdiği kanallar (skorbord/youtube/kanallar) ya da YouTube'un
//    doğruladığı (onay rozetli) kanallar kabul edilir; engellenen kanallar (skorbord/youtube/engel) ve özet / tahmin / oyun videoları atlanır.
//    Gömülü oynatılamayan yayın alınmaz. Çıktı: veri/youtube.json (uygulama TV sekmesine ekler).
const YT_UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };
async function ytSayfa(u){ try{ const r = await fetch(u, { headers: YT_UA, signal: AbortSignal.timeout(30000) }); return r.ok ? await r.text() : ''; }catch(e){ return ''; } }
function ytVideolar(h){
  const m = /var ytInitialData = (\{[\s\S]*?\});<\/script>/.exec(h); let j = null; try{ j = m ? JSON.parse(m[1]) : null; }catch(e){} const o = [];
  const gez = x => { if(!x || typeof x !== 'object') return; if(x.videoRenderer){ const v = x.videoRenderer, s = JSON.stringify;
      o.push({ v: v.videoId, b: ((v.title && v.title.runs) || []).map(r => r.text).join(''), k: (v.ownerText && v.ownerText.runs && v.ownerText.runs[0].text) || '',
        kid: (v.ownerText && v.ownerText.runs && v.ownerText.runs[0].navigationEndpoint && v.ownerText.runs[0].navigationEndpoint.browseEndpoint && v.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId) || '',
        canli: /LIVE/.test(s(v.badges || '') + s(v.thumbnailOverlays || '')), bas: v.upcomingEventData ? +v.upcomingEventData.startTime * 1000 : 0, onay: /VERIFIED/.test(s(v.ownerBadges || '')) }); return; }
    if(x.lockupViewModel && x.lockupViewModel.contentId){ const v = x.lockupViewModel, s = JSON.stringify(v), md = v.metadata && v.metadata.lockupMetadataViewModel;
      o.push({ v: v.contentId, b: (md && md.title && md.title.content) || '', k: '', kid: '', canli: /BADGE_STYLE_LIVE|"CANLI"|"LIVE"/.test(s), yak: /UPCOMING|Planlandı|Bekleniyor|Scheduled/i.test(s), bas: 0, onay: false }); return; }
    Object.values(x).forEach(gez); };
  gez(j); return o;
}
const ytParca = a => norm(a).split(' ').filter(x => x.length > 1 && !/^(fk|sk|as|a|s|jk|fc|cf|ac|sc|kulubu|futbol|spor|club|the|de|of)$/.test(x)).map(x => x.length > 6 ? x.replace(/spor$/, '') : x);
const ytIcerir = (baslik, takim) => { const B = norm(baslik).split(' '), T = ytParca(takim); if(!T.length) return false;
  const var_ = t => B.some(b => b === t || (t.length >= 4 && b.length >= 4 && (b.indexOf(t) === 0 || t.indexOf(b) === 0)));
  const n = T.filter(var_).length, son = T.filter(t => !/^\d+$/.test(t)).pop(); return n / T.length >= 0.5 || (son && son.length >= 5 && var_(son)); };   // sponsorlu adlarda asıl ad sondadır
async function youtubeTopla(tum){
  const dosya = path.join(VERI, 'youtube.json'); let eski = {}; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  const ayar = (await al('https://superlig-208e3-default-rtdb.europe-west1.firebasedatabase.app/skorbord/youtube.json', { deneme: 2 })) || {};
  const izin = Object.values(ayar.kanallar || {}).concat(['TVF VOLEYBOL TV', 'TVF Voleybol TV', 'TBF', 'FIBA - The Basketball Channel', 'EuroLeague Women', 'Basketball Champions League', 'European Volleyball', 'Volleyball World']).map(norm), engel = Object.values(ayar.engel || {}).map(norm);
  // Kanalların "Canlı yayınlar" sekmesi doğrudan okunur: TFF'nin resmî kanalı (2. Lig, 3. Lig, Ziraat Türkiye Kupası, Turkcell Süper Kupa ve TFF'nin
  // seçtiği maçlar) ve admin'in @kullanıcıadı / UC... kimliğiyle yazdığı kanallar
  // Yayın hakkı sahiplerinin resmî kanalları (2026-27): TFF; A Spor (Ziraat Türkiye Kupası, Turkcell Süper Kupa, Uluslar Ligi — ATV/A Spor);
  // TRT Spor ve tabii Spor (UEFA kupaları, milli maçlar); Sıfır TV (geçen sezon 2. ve 3. Lig'in YouTube yayıncısı)
  const KANAL = [['channel/UCVoNfzLtczc_TV8-xKjcmKg', 'Türkiye Futbol Federasyonu'], ['channel/UCJElRTCNEmLemgirqvsW63Q', 'A Spor'], ['channel/UCfYNqluOf8EbQkL44otydMw', 'TRT Spor'],
    ['channel/UCb5OsXSwzcyqZFoKKs3Su3g', 'tabii Spor'], ['channel/UCDX7Vf8VLBHdC-HZtKG9gOQ', 'Sıfır TV'],
    // (2026-11-19) basketbol / voleybol yayın hakkı sahiplerinin YouTube kanalları: TVF Voleybol TV (Sultanlar / Efeler Ligi, Kupa Voley — TVF fikstüründe
    // "TVF Voleybol TV" yazan maçlar), TBF (TBL, TKBL, gençler ligleri), FIBA (FIBA Europe Cup ücretsiz canlı), EuroLeague Women (bütün maçlar, bölge kısıtı
    // dışında), BCL, CEV (Avrupa kupalarının bir kısmı), Volleyball World (milli turnuvaların bir kısmı)
    ['channel/UCTgQ8Bfq3AUuo1vWULdvRKw', 'TVF Voleybol TV'], ['channel/UC0BH4JA92bO7AOtqOWBNqdg', 'TBF'], ['channel/UCtInrnU3QbWqFGsdKT1GZtg', 'FIBA'],
    ['channel/UChsN13M_uLLQQ8lFewoXxzA', 'EuroLeague Women'], ['channel/UCZUkv6tSC5OfX54gLgjV9aw', 'Basketball Champions League'], ['channel/UC8XRC858pOERvclUDb_d7rg', 'European Volleyball'],
    ['channel/UCNMg6XDhRZI2QzL4pWOvP_w', 'Volleyball World']].concat(Object.values(ayar.kanallar || {}).map(x => String(x).trim()).filter(x => /^@[\w.-]+$|^UC[\w-]{20,}$/.test(x)).map(x => [x[0] === '@' ? x : 'channel/' + x, x]));
  const kanalYayin = [];
  for(const [yol, ad] of KANAL){ for(const sek of ['streams', 'live']){ const h = await ytSayfa('https://www.youtube.com/' + yol + '/' + sek); const l = ytVideolar(h).map(v => Object.assign(v, { k: v.k || ad, kanalan: true }));
      if(sek === 'live'){ const vid = /"videoId":"([\w-]{11})"[^]{0,400}?"isLive":true/.exec(h) || /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(h); const bas = /<meta name="title" content="([^"]+)"/.exec(h);
        if(vid && /"isLiveNow":true|"isLive":true/.test(h)) l.push({ v: vid[1], b: bas ? bas[1] : '', k: ad, canli: true, kanalan: true }); }
      l.forEach(v => { if((v.canli || v.yak) && !kanalYayin.some(x => x.v === v.v)) kanalYayin.push(v); }); await bek(500); } }
  const simdi = Date.now(), aday = [], trGun = new Date(simdi + 3 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');
  for(const L of tum){
    let j = null; try{ j = JSON.parse(fs.readFileSync(path.join(VERI, L.slug + '.json'), 'utf8')); }catch(e){}
    if(L.tsdb && j && j.mac){ j.mac.forEach(m => { const z = Date.parse(m.z); if(z - simdi < 75 * 60e3 && simdi - z < 120 * 60e3 && !/^ft$|finish|aet|pen/i.test(m.d || ''))
        aday.push({ lig: L.slug, rid: 'ts' + m.id, ev: m.evAd || (j.takim[m.ev] || {}).ad, dep: m.depAd || (j.takim[m.dep] || {}).ad, z }); }); continue; }
    if(L.tsdb) continue;
    const s = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + L.slug + '/scoreboard?dates=' + trGun, { deneme: 2 });
    ((s && s.events) || []).forEach(ev => { const z = Date.parse(ev.date), c = ev.competitions && ev.competitions[0], st = (ev.status && ev.status.type) || {};
      if(!c || st.completed || !(z - simdi < 75 * 60e3 && simdi - z < 120 * 60e3)) return; const t = h => { const x = (c.competitors || []).find(k => k.homeAway === h) || {}; return (x.team && (x.team.displayName || x.team.shortDisplayName)) || ''; };
      const ev2 = t('home'), dep = t('away'); aday.push({ lig: L.slug, rid: String(ev.id), ev: TR_AD[ev2] || ev2, dep: TR_AD[dep] || dep, z }); });
  }
  aday.sort((a, b) => (/^tur\./.test(b.lig) ? 1 : 0) - (/^tur\./.test(a.lig) ? 1 : 0));
  const once = {}; (eski.liste || []).forEach(x => { once[x.lig + '|' + x.rid] = x; });
    // (2026-11-20) Canlı aramada çıkan sahte "maç" yayınları (canlı skor, tepki / watchalong, eFootball simülasyonu, Arapça "رد فعل" / "محاكاة") ayıklanır:
  // bunlar onaylı kanallardan da gelebiliyor, yalnızca onay rozetine güvenilmez.
  const liste = [], RED = /özet|ozet|highlight|tahmin|prediction|reaction|tepki|analiz|efootball|\bpes\b|fifa ?\d{2}|\bfc ?2\d|simulat|simülasyon|gameplay|oyun|basın toplantısı|radyo|radio|iddaa|oran|live ?score|skor|score update|commentary|watch ?along|rival watch|fan ?cam|reacts?\b|pre-?recorded|رد فعل|محاكاة|نتيجة|لايف صوتي/i; let arama = 0;
  for(const a of aday){   // önce kanalların kendi canlı yayın listelerinde (arama gerekmez)
    const v = kanalYayin.find(v => !RED.test(v.b) && ytIcerir(v.b, a.ev) && ytIcerir(v.b, a.dep)); if(v){ a.bulundu = 1; liste.push(Object.assign({ lig: a.lig, rid: a.rid, ev: a.ev, dep: a.dep, z: a.z, t: simdi }, v)); }
  }
  // (2026-11-20, kullanıcı: Suudi Pro Lig maçı YouTube'da yayında ama sistem görmüyor; bağlantı HT Spor'un "7/24 Canlı Yayın"ıydı). KÖK SEBEP:
  // kanalın YouTube'daki sürekli canlı yayınının başlığında maç adı yok ("#CANLI | HT Spor 7/24 Canlı Yayın"), takım adıyla arama onu hiç bulamaz.
  // ŞİMDİ maçın kanalı yayın akışından biliniyorsa (veri/yayin.json, maç saatinde ±25 dk, iki takımın adı) ve o kanalın YouTube'da 7/24 canlı
  // yayını varsa, maç başlamadan 10 dk önceden itibaren o yayın maça bağlanır. Yayın yalnız Türkiye'den açılıyor (bölge kısıtı).
  const KANAL_7_24 = { 'HT Spor': '@htspor', 'A Spor': 'channel/UCJElRTCNEmLemgirqvsW63Q' };
  let akis = []; try{ akis = JSON.parse(fs.readFileSync(path.join(VERI, 'yayin.json'), 'utf8')).liste || []; }catch(e){}
  const surekli = {};
  for(const [k, yol] of Object.entries(KANAL_7_24)){
    if(!aday.some(a => !a.bulundu && a.z - simdi < 10 * 60e3)) break;
    const h = await ytSayfa('https://www.youtube.com/' + yol + '/live'); const m = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(h);
    if(m && /"isLiveNow":true|"isLive":true/.test(h)) surekli[k] = { v: m[1], b: ((/<meta name="title" content="([^"]+)"/.exec(h) || [])[1] || (k + ' canlı yayın')).replace(/&amp;/g, '&').replace(/&#39;/g, "'") };
    await bek(400);
  }
  for(const a of aday){ if(a.bulundu || a.z - simdi > 10 * 60e3) continue;
    const y = akis.find(y => surekli[y.k] && Math.abs(Date.parse(y.g + 'T' + y.s + ':00+03:00') - a.z) <= 25 * 60e3 && ytIcerir(y.ad, a.ev) && ytIcerir(y.ad, a.dep));
    if(y){ a.bulundu = 1; liste.push({ lig: a.lig, rid: a.rid, ev: a.ev, dep: a.dep, z: a.z, t: simdi, v: surekli[y.k].v, b: surekli[y.k].b, k: y.k, canli: true, kanalan: true, surekli: true }); }
  }
  for(const a of aday.filter(a => !a.bulundu).slice(0, 70)){
    const k = a.lig + '|' + a.rid, e = once[k];
    if(e && e.v && simdi - (e.t || 0) < 25 * 60e3){ liste.push(e); continue; }
    if(!a.ev || !a.dep) continue;
    const h = await ytSayfa('https://www.youtube.com/results?search_query=' + encodeURIComponent(a.ev + ' ' + a.dep + ' canlı')); arama++; await bek(400);
    const bul = ytVideolar(h).filter(v => (v.canli || (v.bas && Math.abs(v.bas - a.z) < 3 * 3600e3)) && !RED.test(v.b) && ytIcerir(v.b, a.ev) && ytIcerir(v.b, a.dep)
      && !engel.includes(norm(v.k)) && (izin.includes(norm(v.k)) || v.onay));
    let sec = null;
    for(const v of bul.slice(0, 3)){ const w = await ytSayfa('https://www.youtube.com/watch?v=' + v.v); if(/"playableInEmbed":true/.test(w)){ sec = v; break; } }
    if(sec) liste.push(Object.assign({ lig: a.lig, rid: a.rid, ev: a.ev, dep: a.dep, z: a.z, t: simdi }, sec));
  }
  fs.writeFileSync(dosya, JSON.stringify({ t: simdi, kaynak: 'YouTube', liste }));
  console.log('YOUTUBE', 'kanal yayını', kanalYayin.length, kanalYayin.slice(0, 6).map(v => (v.canli ? 'CANLI ' : 'PLAN ') + v.b).join(' | ').slice(0, 400), 'aday maç', aday.length, 'arama', arama, 'bulunan', liste.length, liste.map(x => x.lig + ' ' + x.ev + '-' + x.dep + ' @' + x.k).join(' | ').slice(0, 600));
}

// ── YAYIN EKİBİ HABERLERDEN (2026-11-18, kullanıcı: "az dan az çoktan çok ... şimdilik birkaç maç ... spiker ve yorumcu yayıncı").
//    Spiker / yorumcu adını yayımlayan herkese açık bir veri kaynağı yok (Maçkolik talebi reddetti). Büyük maçlardan önce haber siteleri
//    "maçı kim anlatıyor" haberleri yazıyor: Bing Haberler'de aranır, haber metinlerinden kesin ifadeler okunur ("maçın spikeri X",
//    "X anlatacak", "yorumcu koltuğunda X ve Y"). Soru biçimindeki tahminler ("X mi anlatıyor?") alınmaz. Türk takımlarının maçları.
//    Çıktı: veri/ekip.json (uygulama maç bilgisine işler; admin'in elle girdiği önce gelir).
const TR_KULUP = /anadolu efes|efes|t[uü]rk telekom|bah[cç]e[sş]ehir|vak[ıi]fbank|eczac[ıi]ba[sş]ı|eczaciba|halkbank|ziraat|thy|t[uü]rk hava|galatasaray|fenerbah|be[sş]ikta[sş]|trabzon|ba[sş]ak[sş]ehir|samsun|g[oö]ztepe|kasımpa[sş]a|kasimpasa|konya|antalya|alanya|kayseri|rize|sivas|gaziantep|kocaeli|ey[uü]p|amed|g[eç]n[cç]lerbirli|karag[uü]mr[uü]k|[cç]orum|erzurum|t[uü]rkiye|turkey/i;
const EKIP_KANAL = /(beIN SPORTS(?: (?:[1-5]|MAX ?\d?|HABER))?|TRT 1|TRT Spor Yıldız|TRT Spor|ATV|TV8,5|TV8|S Sport Plus|S Sport 2|S Sport|Exxen(?:spor)?|A Spor|Tivibu Spor|Tabii|TOD)/;
const AD = '([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){1,2})';
const EKIP_RED_K = new Set('süper lig ligi maç maçı maçın maçta maçını milli türkiye kupa kupası spor sports kim spiker spikeri yorumcu yorumcular saat kanal hakem teknik direktör haber haberler gazete galatasaray fenerbahçe beşiktaş trabzonspor avrupa şampiyonlar uluslar konferans futbol karşılaşma karşılaşmayı mücadele mücadeleyi yayın bu o'.split(' '));
const EKIP_RED = { test: a => String(a).split(/\s+/).some(w => EKIP_RED_K.has(w.toLocaleLowerCase('tr-TR'))) };
function ekipCikar(metinler, takimlar){
  const sp = {}, yr = {}, kn = {}, ekle = (o, ad, p) => { let w = ad.trim().split(/\s+/); while(w.length && EKIP_RED.test(w[0])) w.shift(); ad = w.join(' '); if(w.length < 2 || EKIP_RED.test(ad) || takimlar.some(t => norm(t) && norm(ad).includes(norm(t)))) return; o[ad] = (o[ad] || 0) + p; };
  const soru = (m, t) => /^\s*(mı|mi|mu|mü|mıdır|midir)\b/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 8));
  metinler.forEach(t => {
    const cumleler = t.split(/(?<=[.!?])\s+/).filter(c => !/\?\s*$/.test(c.trim()) || /kimdir/i.test(c));   // soru cümleleri tahmindir ("kimdir?" hariç)
    cumleler.forEach(c => {
      for(const m of c.matchAll(new RegExp('[Ss]piker(?:i|liğini|liğinde|liği|\\s+koltuğunda)?\\s+(?:olarak\\s+)?' + AD, 'g'))) if(!soru(m, c)) ekle(sp, m[1], 2);
      for(const m of c.matchAll(new RegExp(AD + '(?:\\s+[a-zçğıöşü]+)?\\s+(?:anlatacak|anlatıyor|anlatacağı|mikrofon başında|mikrofonda olacak)', 'g'))) if(!soru(m, c)) ekle(sp, m[1], 2);
      for(const m of c.matchAll(new RegExp('(?:[Yy]orumcu(?:luk|lar|ları|su)?(?:\\s+koltuğunda|\\s+olarak)?|[Yy]orumlarıyla)\\s+' + AD + '(?:\\s*(?:,|ve)\\s*' + AD + ')?(?:\\s*(?:,|ve)\\s*' + AD + ')?', 'g'))) if(!soru(m, c)) [m[1], m[2], m[3]].filter(Boolean).forEach(a => ekle(yr, a, 2));
      for(const m of c.matchAll(new RegExp(AD + '(?:\\s*(?:,|ve)\\s*' + AD + ')?\\s+(?:yorumlayacak|yorumcu olarak|yorumculuk yapacak)', 'g'))) if(!soru(m, c)) [m[1], m[2]].filter(Boolean).forEach(a => ekle(yr, a, 2));
      if(/kanal|yayınlan|ekran|canlı/i.test(c)){ const k = EKIP_KANAL.exec(c); if(k) kn[k[1]] = (kn[k[1]] || 0) + 1; }
    });
  });
  const en = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const s = en(sp)[0], y = en(yr).filter(x => !s || x[0] !== s[0]).slice(0, 3).map(x => x[0]), k = en(kn)[0];
  return { spiker: s ? s[0] : '', yorumcu: y, kanal: k ? k[0] : '' };
}
async function ekipTopla(tum){
  const dosya = path.join(VERI, 'ekip.json'); let eski = {}; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  const simdi = Date.now(), aday = [], gun = o => new Date(simdi + 3 * 3600e3 + o * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
  for(const L of tum){
    const SP = /^(bsk\.tur\.(bsl|kbsl|tbl)|vlb\.tur\.(sultanlar|efeler)|bsk\.int\.(euroleague|eurocup|bcl|euroligk)|vlb\.int\.(cevsl|cevkupa))$/.test(L.slug);   // basketbol / voleybol (2026-11-18-N)
    if(!SP && !/^tur\.|^uefa\.|^fifa\.|^conmebol\.america/.test(L.slug)) continue;
    let j = null; try{ j = JSON.parse(fs.readFileSync(path.join(VERI, L.slug + '.json'), 'utf8')); }catch(e){}
    const ekle = (rid, ev, dep, z) => { if(z - simdi > 3 * 864e5 || simdi - z > 3 * 3600e3) return; if(!/^tur\./.test(L.slug) && !/^(bsk|vlb)\.tur\./.test(L.slug) && !TR_KULUP.test(ev + ' ' + dep)) return; aday.push({ lig: L.slug, rid, ev, dep, z }); };
    if(L.tsdb){ if(j && j.mac && (SP || /^tur\.(1|2|cup|super)$/.test(L.slug))) j.mac.forEach(m => ekle('ts' + m.id, m.evAd || (j.takim[m.ev] || {}).ad, m.depAd || (j.takim[m.dep] || {}).ad, Date.parse(m.z))); continue; }
    const s = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + L.slug + '/scoreboard?dates=' + gun(0) + '-' + gun(3), { deneme: 2 });
    ((s && s.events) || []).forEach(ev => { const c = ev.competitions && ev.competitions[0]; if(!c) return; const t = h => { const x = (c.competitors || []).find(k => k.homeAway === h) || {}; const n = (x.team && (x.team.displayName || x.team.shortDisplayName)) || ''; return TR_AD[n] || n; };
      ekle(String(ev.id), t('home'), t('away'), Date.parse(ev.date)); });
  }
  const once = {}; (eski.liste || []).forEach(x => { once[x.lig + '|' + x.rid] = x; });
  const liste = [], ATLA = []; let arama = 0;
  for(const a of aday){
    const k = a.lig + '|' + a.rid, e = once[k];
    if(e && simdi - (e.t || 0) < (e.spiker ? 8 : 4) * 3600e3){ liste.push(e); continue; }   // bulunduysa 8, bulunmadıysa 4 saatte bir yeniden aranır
    if(arama >= 35){ if(e) liste.push(e); continue; }
    const q = a.ev + ' ' + a.dep + ' maçını kim anlatıyor'; arama++;
    const r = await al('https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&format=rss&setlang=tr&cc=tr', { metin: true, accept: 'application/rss+xml,text/xml' });
    const it = [...String(r || '').matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    const ent = x => String(x || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const ilgili = it.map(x => ({ b: ent((/<title>([\s\S]*?)<\/title>/.exec(x) || [])[1]), l: ent((/<link>([\s\S]*?)<\/link>/.exec(x) || [])[1]), z: Date.parse(ent((/<pubDate>([\s\S]*?)<\/pubDate>/.exec(x) || [])[1])) || 0 }))
      .filter(x => ytIcerir(x.b, a.ev) && ytIcerir(x.b, a.dep) && /spiker|anlat|yorum|kanal/i.test(x.b) && a.z - x.z < 6 * 864e5 && x.z - a.z < 864e5).slice(0, 4);
    const metin = [], kaynak = [];
    for(const x of ilgili){ let u = x.l; const m = /[?&]url=([^&]+)/.exec(u); if(m) u = decodeURIComponent(m[1]);
      try{ const rr = await fetch(u, { headers: { 'User-Agent': YT_UA['User-Agent'], 'Accept-Language': 'tr-TR,tr' }, signal: AbortSignal.timeout(20000) }); if(!rr.ok) continue; const h = await rr.text();
        metin.push(ent(h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' '))); kaynak.push(u); }catch(e){} await bek(300); }
    const c = ekipCikar(metin, [a.ev, a.dep]);
    const o = Object.assign({}, a, { t: simdi, spiker: c.spiker || (e && e.spiker) || '', yorumcu: c.yorumcu.length ? c.yorumcu : ((e && e.yorumcu) || []), kanal: c.kanal || (e && e.kanal) || '', kaynak: kaynak.slice(0, 3) });
    if(o.spiker || o.yorumcu.length || o.kanal) liste.push(o); else ATLA.push(a.ev + '-' + a.dep);
  }
  fs.writeFileSync(dosya, JSON.stringify({ t: simdi, kaynak: 'Haberler (Bing Haberler)', liste }));
  console.log('EKİP', 'aday', aday.length, 'arama', arama, 'bulunan', liste.length, liste.map(x => x.ev + '-' + x.dep + ': ' + [x.spiker, (x.yorumcu || []).join('+'), x.kanal].join(' / ')).join(' | ').slice(0, 900), 'bulunamayan', ATLA.slice(0, 8).join(', '));
}
// ── Lig ─────────────────────────────────────────────────────────────────────────────────────────────

// ── TVF (Türkiye Voleybol Federasyonu): Sultanlar Ligi, Efeler Ligi, Kupa Voley ───────────────────────────────────────────────
// (2026-11-18-L) TheSportsDB'de Sultanlar Ligi yok, Efeler eksik. TVF'nin lig sayfası (tvf.org.tr/lig/<lig>) fikstürü kendi "Fikstür"
// sekmesinde sitenin Livewire çağrısıyla getirir; aynı çağrı yapılır (herkese açık sayfa). Maç: tarih / saat (TR), salon, set sonuçları,
// yayın kanalı, takım logoları.
const TVF_UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36';
function lwCoz(x){ if(Array.isArray(x)){ if(x.length === 2 && x[1] && typeof x[1] === 'object' && x[1].s) return lwCoz(x[0]); return x.map(lwCoz); }
  if(x && typeof x === 'object'){ const o = {}; Object.keys(x).forEach(k => { o[k] = lwCoz(x[k]); }); return o; } return x; }
// TVF adları Türkçe büyük harfle (İ / I ayrımı doğru); yabancı marka adları noktasız I ile yazıldığı için birkaç istisna
const TR_ISTISNA = { MEDICANA: 'Medicana', DAIKIN: 'Daikin', HDI: 'HDI', TVF: 'TVF', SMS: 'SMS', AXA: 'AXA', THY: 'THY', ISTANBUL: 'İstanbul', BBSK: 'BBSK', GSK: 'GSK', BK: 'BK', SK: 'SK', PTT: 'PTT', TED: 'TED', ODTÜ: 'ODTÜ', MKE: 'MKE', 'İBB': 'İBB' };
function trBaslik(a){ return String(a || '').trim().split(/(\s+|[()\/-])/).map(w => { if(TR_ISTISNA[w]) return TR_ISTISNA[w]; const l = w.toLocaleLowerCase('tr-TR'); return l.charAt(0).toLocaleUpperCase('tr-TR') + l.slice(1); }).join(''); }
async function tvfLig(L, eski){
  const sayfa = L.tsdb.slice(4), adres = 'https://tvf.org.tr/lig/' + sayfa;
  const r = await fetch(adres, { headers: { 'User-Agent': TVF_UA, 'Accept-Language': 'tr-TR,tr' }, signal: AbortSignal.timeout(45000) });
  const ck = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  const t = await r.text(); const de = x => x.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
  const snm = [...t.matchAll(/wire:snapshot="([^"]+)"/g)].find(m => /league-detail/.test(m[1])), tok = (/data-csrf="([^"]+)"/.exec(t) || [])[1];   // birden çok bileşen olabilir: lig bileşeni seçilir
  if(!snm || !tok) throw new Error('TVF sayfası okunamadı');
  const u = await fetch('https://tvf.org.tr/livewire/update', { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json', 'X-Livewire': '', 'X-CSRF-TOKEN': tok, 'Cookie': ck, 'User-Agent': TVF_UA, 'Referer': adres },
    body: JSON.stringify({ _token: tok, components: [{ snapshot: de(snm[1]), updates: {}, calls: [{ path: '', method: 'setActiveTab', params: ['fikstur'] }] }] }) });
  const k = await u.json(); const d = lwCoz(JSON.parse(k.components[0].snapshot).data || {});
  const fx = d.leagueFixture || [], liste = [];
  (Array.isArray(fx) ? fx : [fx]).forEach(g => { if(g && typeof g === 'object') Object.keys(g).forEach(h => { (g[h] || []).forEach(m => { if(m && m.ATAKIMI) liste.push(m); }); }); });
  const takim = {}, mac = [];
  liste.forEach(m => {
    const tm = /(\d{2})\.(\d{2})\.(\d{4})/.exec(m.TARIH || ''); if(!tm) return;
    const z = tm[3] + '-' + tm[2] + '-' + tm[1] + 'T' + ((/^\d{1,2}:\d{2}$/.test(m.SAAT || '') ? m.SAAT.padStart(5, '0') : '00:00')) + ':00+03:00';
    const a = String(m.ATAKIMIID || m.ATAKIMI), b = String(m.BTAKIMIID || m.BTAKIMI);
    takim[a] = takim[a] || { ad: trBaslik(m.ATAKIMI), kisa: trBaslik(m.ATAKIMI), yer: '', logo: m.ALOGONAME || '' };
    takim[b] = takim[b] || { ad: trBaslik(m.BTAKIMI), kisa: trBaslik(m.BTAKIMI), yer: '', logo: m.BLOGONAME || '' };
    const sa = m.SETA === '' || m.SETA == null ? null : +m.SETA, sb = m.SETB === '' || m.SETB == null ? null : +m.SETB;
    const bitti = sa != null && sb != null && (Math.max(sa, sb) >= 3 || m.HUKMEN === '1');
    mac.push({ id: 'tvf' + sayfa.replace(/[^a-z]/g, '') + '_' + (m.HAFTA || 0) + '_' + (m.MACNO || mac.length), r: +m.HAFTA || 1, z, ev: a, dep: b, evAd: takim[a].ad, depAd: takim[b].ad, evLogo: takim[a].logo, depLogo: takim[b].logo,
      evG: bitti ? sa : null, depG: bitti ? sb : null, d: bitti ? 'FT' : '', st: trBaslik(m.YER || '') + (m.IL ? ' (' + trBaslik(m.IL) + ')' : ''), tv: (m.TVKANAL || '').trim(), setler: (m.SETSONUCLARI || '').trim() });
  });
  if(!mac.length) throw new Error('TVF fikstürü boş');
  const sezon = (liste[0] && String(liste[0].SEZON || '').trim()) || ((eski && eski.sezonAdi) || '');
  return { yil: parseInt(sezon, 10) || new Date().getFullYear(), sezonAdi: sezon, takim, gecmis: {}, mac, kaynak: 'TVF' };
}

// ── TAKIM LOGOLARI (2026-11-19, kullanıcı: "takım logolarının çoğu çerçeve içine alınmış") ─────────────────────────────────────
// KÖK SEBEP: TheSportsDB / TVF / TFF logolarının çoğu beyaz (ya da düz renk) kare zeminli; uygulamadaki kenar temizleme yalnız siyah
// zemini siliyor, üstelik başka sitelerin görsellerinde tarayıcı piksel okuyamıyor (CORS). ŞİMDİ logo burada indirilir: köşelerden
// başlayarak zemin rengi (kenara bağlı, düz renk) saydamlaştırılır, boşluk kırpılır, 128 px PNG olarak veri/takim-logo/ altına yazılır.
const TL_KLAS = path.join(VERI, 'takim-logo'); let TL_DIZIN = null, _sharp;
function tlDizin(){ if(!TL_DIZIN) TL_DIZIN = {}; return TL_DIZIN; }   // yalnız bu çalışmadaki başarısız indirmeler
async function logoTemizle(url){
  if(!url || !/^https?:/.test(url)) return url; const D = tlDizin(), ad = require('crypto').createHash('md5').update(url).digest('hex').slice(0, 16) + '.png';
  if(fs.existsSync(path.join(TL_KLAS, ad))) return 'veri/takim-logo/' + ad;   // dosya adı adresin özeti: dizin dosyasına gerek yok (paralel işler birbirini ezmez)
  if(D[url] === '') return url;   // bu çalışmada işlenemedi: kaynağın kendi adresi kalır
  if(_sharp === undefined){ try{ _sharp = require('sharp'); }catch(e){ _sharp = null; } } if(!_sharp) return url;
  try{
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }); if(!r.ok) throw new Error('HTTP ' + r.status);
    const giris = Buffer.from(await r.arrayBuffer());
    const { data, info } = await _sharp(giris).resize(256, 256, { fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, px = (x, y) => (y * W + x) * 4;
    const koseler = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].map(([x, y]) => data.slice(px(x, y), px(x, y) + 4));
    const opak = koseler.filter(c => c[3] > 200);
    if(opak.length >= 3){
      const zem = opak[0], fark = i => Math.abs(data[i] - zem[0]) + Math.abs(data[i + 1] - zem[1]) + Math.abs(data[i + 2] - zem[2]);
      const gor = new Uint8Array(W * H), kuyruk = [];
      for(let x = 0; x < W; x++){ kuyruk.push([x, 0], [x, H - 1]); } for(let y = 0; y < H; y++){ kuyruk.push([0, y], [W - 1, y]); }
      while(kuyruk.length){ const [x, y] = kuyruk.pop(); if(x < 0 || y < 0 || x >= W || y >= H) continue; const k = y * W + x; if(gor[k]) continue; gor[k] = 1; const i = k * 4;
        if(data[i + 3] < 30 || fark(i) <= 60){ data[i + 3] = 0; kuyruk.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); } }
    }
    let cik = _sharp(data, { raw: { width: W, height: H, channels: 4 } });
    try{ cik = _sharp(await cik.png().toBuffer()).trim({ threshold: 1 }); }catch(e){}
    const png = await cik.resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
    fs.mkdirSync(TL_KLAS, { recursive: true }); fs.writeFileSync(path.join(TL_KLAS, ad), png); return 'veri/takim-logo/' + ad;
  }catch(e){ D[url] = ''; return url; }
}
async function logolariTemizle(temel){
  const es = {}; for(const id of Object.keys(temel.takim || {})){ const t = temel.takim[id]; if(t.logo){ const y = await logoTemizle(t.logo); es[t.logo] = y; t.logo = y; } }
  (temel.mac || []).forEach(m => { if(m.evLogo && es[m.evLogo]) m.evLogo = es[m.evLogo]; if(m.depLogo && es[m.depLogo]) m.depLogo = es[m.depLogo];
    if(m.evLogo && !es[m.evLogo] && temel.takim[m.ev] && temel.takim[m.ev].logo) m.evLogo = temel.takim[m.ev].logo; if(m.depLogo && !es[m.depLogo] && temel.takim[m.dep] && temel.takim[m.dep].logo) m.depLogo = temel.takim[m.dep].logo; });
}
async function ligIsle(L){
  const dosya = path.join(VERI, L.slug + '.json');
  let eski = null; try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  if(HIZLI && !L.tsdb) return;
  if(/^espn:/.test(L.tsdb || '')) return;   // ESPN basketbol / voleybol ligleri: uygulama doğrudan ESPN'den okur, ek dosya yok
  const FUTBOL = !/^(bsk|vlb)\./.test(L.slug);   // basketbol / voleybol: kulüp eşleşmesi, kadro, geçmiş sezon futbol kaynaklarına göre; atlanır
  const t0 = Date.now(); const ad = (x) => console.log('  ' + L.slug + ' ' + x + ' ' + ((Date.now() - t0) / 1000 | 0) + 's');
  const temel = L.tsdb === 'wiki' ? await wikiLig(L, eski) : L.tsdb === 'tff' ? await tffLig(L, eski) : /^tvf:/.test(L.tsdb) ? await tvfLig(L, eski) : L.tsdb ? await tsdbLig(L, eski) : await espnLig(L, eski); ad('temel');
  if(L.tsdb){ try{ await logolariTemizle(temel); }catch(e){ console.log('HATA logo temizle', L.slug, e.message); } }   // TheSportsDB / TVF / TFF / Vikipedi logoları
  const takim = {};
  Object.entries(temel.takim).forEach(([id, t]) => { takim[id] = Object.assign({}, t); const tr = TR_AD[t.ad]; if(tr) takim[id].adTr = tr; });
  let foto = (eski && eski.foto) || {}, fotoT = (eski && eski.fotoT) || 0, kadroDosya = (eski && eski.kadro) || null, kadroT = (eski && eski.kadroT) || 0;
  if(!HIZLI && FUTBOL){
    const wd = await eslestir(temel.takim, L.obek === 'Milli', eski);
    const eskiKulup = {}; Object.values((eski && eski.takim) || {}).forEach(t => { if(t.wd) eskiKulup[t.wd] = t; });
    ad('eşleşme'); const bilgi = await kulupBilgi(Object.values(wd), eskiKulup); ad('kulüp');
    Object.keys(takim).forEach(id => { const c = wd[id]; takim[id].wd = c || null; const k = c && bilgi[c];
      if(k){ if(k.kur) takim[id].kur = k.kur; if(k.stad) takim[id].stad = k.stad; if(k.kap) takim[id].kap = k.kap; if(k.kupa) takim[id].kupa = k.kupa; if(k.ad) takim[id].wdAd = k.ad; if(k.koord) takim[id].koord = k.koord; } });
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
    if(L.tsdb && L.tsdb !== 'wiki' && L.tsdb !== 'tff' && !/^tvf:/.test(L.tsdb) && Date.now() - ((eski && eski.kadroT) || 0) > 6 * 864e5){ kadroDosya = await wdKadro(takim); kadroT = Date.now();
      if(/^\d+$/.test(L.tsdb) && !Object.values(kadroDosya || {}).some(l => l && l.length)){ try{ kadroDosya = await tsdbOyuncular(takim); }catch(e){} } }   // Wikidata boşsa TheSportsDB (takım başına 10 oyuncu)
  }
  if(!HIZLI && !FUTBOL && /^\d+$/.test(L.tsdb || '') && Date.now() - ((eski && eski.kadroT) || 0) > 6 * 864e5){ try{ kadroDosya = await tsdbOyuncular(takim); kadroT = Date.now(); }catch(e){ console.log('HATA oyuncu', L.slug, e.message); } }
  if(HIZLI && eski && eski.takim){ Object.keys(takim).forEach(id => { const e = eski.takim[id]; if(e) ['wd', 'kur', 'stad', 'kap', 'kupa', 'wdAd', 'koord'].forEach(k => { if(e[k] !== undefined) takim[id][k] = e[k]; }); }); }
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


/* LİG LOGOLARI (2026-11-18-J, kullanıcı: "lig ekranında logolar doğru görünmüyor, eski yapımlar kullanılıyor; bütün ligler için").
   ESPN'in lig logoları eski (sponsor öncesi) çizimler, TheSportsDB/TFF/Vikipedi ligleri ise logosuzdu (ekranda yöneticinin kendi sezon
   logosu görünüyordu). Kaynak sırası: TFF'nin kendi logo klasörü (2. ve 3. Lig) → Vikipedi madde görseli (Türk ligleri trwiki, diğerleri
   enwiki; fotoğraf/afiş .jpg'ler atlanır) → Wikidata P154 (tercih edilen). Görsel indirilip en çok 192 px'e küçültülür,
   veri/lig-logo/<lig>.png olarak saklanır (uygulama telefonlardan dış siteye gitmez). Haftada bir yenilenir ("logo" ile elle). */
const LOGO_TFF = { 'tur.3': 'https://www.tff.org/Resources/TFF/Images/0000000015/TFF/TFF-Logolar/Orjinal/nesine-2-lig.png',
  'tur.4': 'https://www.tff.org/Resources/TFF/Images/0000000015/TFF/TFF-Logolar/Orjinal/nesine-3-lig.png' };
const LOGO_TRWIKI = { 'tur.1': 'Süper Lig', 'tur.2': 'TFF 1. Lig', 'tur.cup': 'Türkiye Kupası', 'tur.super': 'Türkiye Süper Kupası', 'bsk.tur.bsl': 'Basketbol Süper Ligi', 'bsk.tur.tbl': 'Türkiye Basketbol Ligi', 'bsk.tur.kbsl': 'Kadınlar Basketbol Süper Ligi', 'vlb.tur.efeler': 'Efeler Ligi', 'vlb.tur.sultanlar': 'Sultanlar Ligi' };
async function vikiGorsel(site, map){
  const ks = Object.keys(map), o = {};
  for(let i = 0; i < ks.length; i += 45){
    const parca = ks.slice(i, i + 45);
    const j = await al('https://' + site + '.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail|name&pithumbsize=330&pilicense=any&pilimit=50&titles=' + encodeURIComponent(parca.map(k => map[k]).join('|')));
    const q = (j && j.query) || {}, ad = {}; parca.forEach(k => { ad[map[k]] = k; });
    (q.normalized || []).concat(q.redirects || []).forEach(n => { if(ad[n.from]) ad[n.to] = ad[n.from]; });
    Object.values(q.pages || {}).forEach(p => { const k = ad[p.title]; if(k && p.thumbnail && !/\.jpe?g$/i.test(p.pageimage || '')) o[k] = p.thumbnail.source.replace(/\?.*$/, ''); });
  }
  return o;
}
async function wdLogo(map){
  const o = {}, ks = Object.keys(map);
  for(let i = 0; i < ks.length; i += 40){
    const parca = ks.slice(i, i + 40);
    const j = await al(WD_API + '?action=wbgetentities&sites=enwiki&redirects=yes&props=claims|sitelinks&sitefilter=enwiki&format=json&titles=' + encodeURIComponent(parca.map(k => map[k]).join('|')));
    const E = Object.values((j && j.entities) || {});
    parca.forEach(k => { const e = E.find(x => x.sitelinks && x.sitelinks.enwiki && x.sitelinks.enwiki.title.toLowerCase() === map[k].toLowerCase()); const c = (e && e.claims && e.claims.P154) || [];
      const s = c.find(x => x.rank === 'preferred') || c.find(x => !(x.qualifiers && x.qualifiers.P582)); const f = s && s.mainsnak.datavalue && s.mainsnak.datavalue.value;
      if(f && !/\.jpe?g$/i.test(f)) o[k] = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f) + '?width=330'; });
  }
  return o;
}
async function ligLogoTopla(tum, zorla){
  const dosya = path.join(VERI, 'lig-logo.json'); let eski = {};
  try{ eski = JSON.parse(fs.readFileSync(dosya, 'utf8')); }catch(e){}
  if(!zorla && eski.t && Date.now() - eski.t < 7 * 864e5) return;
  let sharp = null; try{ sharp = require('sharp'); }catch(e){ console.log('logo: sharp yok, görseller küçültülmeden saklanacak'); }
  const W = JSON.parse(fs.readFileSync(path.join(__dirname, 'lig-wiki.json'), 'utf8'));
  const en = await vikiGorsel('en', W), tr = await vikiGorsel('tr', LOGO_TRWIKI), wd = await wdLogo(W);
  const klas = path.join(VERI, 'lig-logo'); fs.mkdirSync(klas, { recursive: true });
  const out = { t: Date.now(), logo: {}, kaynak: {} }, slugs = tum.map(l => l.slug);
  for(const s of slugs){
    const aday = [LOGO_TFF[s], tr[s], en[s], wd[s]].filter(Boolean);
    for(const u of aday){
      try{
        const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(40000) }); if(!r.ok) continue;
        let b = Buffer.from(await r.arrayBuffer()); if(b.length < 200) continue;
        if(sharp){ b = await sharp(b).resize(192, 192, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer(); }
        else if(b[0] !== 0x89) continue;   // küçültme yoksa yalnız PNG saklanır
        fs.writeFileSync(path.join(klas, s + '.png'), b);
        out.logo[s] = 'veri/lig-logo/' + s + '.png?v=' + require('crypto').createHash('md5').update(b).digest('hex').slice(0, 8);
        out.kaynak[s] = u.replace(/^https?:\/\//, '').split('/')[0]; break;
      }catch(e){}
      await bek(300);
    }
  }
  fs.writeFileSync(dosya, JSON.stringify(out));
  console.log('LİG LOGOLARI', Object.keys(out.logo).length + '/' + slugs.length, 'yok:', slugs.filter(s => !out.logo[s]).join(' '));
}
(async () => {
  fs.mkdirSync(VERI, { recursive: true }); trAdOku();
  const tum = ligleriOku();
  const G0 = !(GRUP.length === 2 && GRUP[0] !== 0);   // ortak işler (tff, yayın, logo…) yalnız ilk parçada
  const ligler = tum.filter(l => !SECILI.length || SECILI.includes(l.slug)).filter((l, i) => !(GRUP.length === 2 && GRUP[1] > 0) || i % GRUP[1] === GRUP[0]);
  if(!HIZLI && ((SECILI.includes('siralama') && G0) || (!SECILI.length && !(GRUP.length === 2 && GRUP[0] !== 0)))){ try{ await siralamaTopla(); }catch(e){ console.log('HATA sıralama', e && e.stack || e); } }
  const ana = !SECILI.length && !(GRUP.length === 2 && GRUP[0] !== 0);   // tek iş (grup 0) ortak dosyaları yazar
  if((SECILI.includes('tff') && G0) || ana){ try{ await tffTopla(); }catch(e){ console.log('HATA tff', e && e.stack || e); } }
  if((SECILI.includes('yayin') && G0) || ana){ try{ await yayinTopla(); }catch(e){ console.log('HATA yayın', e && e.stack || e); } }
  for(const L of ligler){ try{ await ligIsle(L); }catch(e){ console.log('HATA', L.slug, e && e.stack || e); } }
  if((SECILI.includes('ekip') && G0) || ana){ try{ await ekipTopla(tum); }catch(e){ console.log('HATA ekip', e && e.stack || e); } }
  if((SECILI.includes('youtube') && G0) || ana){ try{ await youtubeTopla(tum); }catch(e){ console.log('HATA youtube', e && e.stack || e); } }
  if(((SECILI.includes('logo') && G0) || ana) && !HIZLI){ try{ await ligLogoTopla(tum, (SECILI.includes('logo') && G0)); }catch(e){ console.log('HATA logo', e && e.stack || e); } }
  if(!SECILI.length) fs.writeFileSync(path.join(VERI, 'liste.json'), JSON.stringify({ ligler: tum.map(l => l.slug) }));
  if(OZET.length) console.log('FOTOĞRAF ÖZETİ', JSON.stringify(OZET));
})();
