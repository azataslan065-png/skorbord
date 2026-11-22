/* YEREL VERİ KATMANI (Skorbord). Arayüzün beklediği "firebase" nesnesi burada karşılanır. Lig / maç / takım verisi cihaz belleğinde
   tutulur (gerçek veri modülü gercek.js yerleştirir); yönetici ayarları Firebase'deki skorbord/ düğümünden salt okunur alınır (bkz. UZAK KÖK).
   SAHA / Skorbord verisine hiç bağlanmaz. Kullanıcının kendi ayarları (profil, favori takım vb.) cihazda saklanır (localStorage "sb_yerel"). */
(function(){
'use strict';
var KOK = {}, DINLEYEN = [], SAKLA = /^(userProfiles|kullanicilar|kimlik)(\/|$)/, SAKLA_ANAHTAR = 'sb_yerel';
try{ var kayit = JSON.parse(localStorage.getItem(SAKLA_ANAHTAR) || '{}') || {}; Object.keys(kayit).forEach(function(k){ KOK[k] = kayit[k]; }); }catch(e){}
try{ if(localStorage.getItem('pt_liveTicker') === null) localStorage.setItem('pt_liveTicker', 'on'); }catch(e){}   // alt şerit varsayılan açık
var saklaZ = null;
function sakla(){ if(saklaZ) return; saklaZ = setTimeout(function(){ saklaZ = null; try{ var o = {}; ['userProfiles','kullanicilar','kimlik'].forEach(function(k){ if(KOK[k] != null) o[k] = KOK[k]; }); localStorage.setItem(SAKLA_ANAHTAR, JSON.stringify(o)); }catch(e){} }, 800); }

function duz(y){ // yol: baştaki/sondaki eğik çizgi ve adres atılır; test/ ve sahaVeri/ önekleri tek ağaca indirgenir
  y = String(y == null ? '' : y).replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
  y = y.replace(/^test\//, '').replace(/^sahaVeri\//, '');
  return y;
}
function parcala(y){ return y ? y.split('/') : []; }
/* ═══ UZAK KÖK (2026-11-16-D, kullanıcı: "adminindeki varsayılan bütün özellikler skorboard için de geçerli olacak; saha ve saha dışı
   sistem aynı, sadece veritabanı ayrı"). Admin, Skorbord kaynağında bütün ayarlarını Firebase'deki skorbord/ düğümüne yazar (bakım,
   duyuru, görünüm, menüler, lig ayarları...). Bu katman o düğümü salt okunur olarak canlı dinler (herkese açık okuma, kimlik gerekmez)
   ve uygulamanın gördüğü ağaçla birleştirir:
   · Maç / takım / lig listesi (ESPN, gercek.js) ve kullanıcının kendi verisi YEREL kalır ve aynı alanda yerel kazanır.
   · Diğer her şey uzaktan gelir. Kullanıcı yazmaları yalnızca cihazda kalır (Skorbord'da hesap yok). */
var UZAK = {}, UZAK_ADRES = 'https://superlig-208e3-default-rtdb.europe-west1.firebasedatabase.app/skorbord.json';
var YALNIZ_YEREL = /^(leaguesMeta|activeDisplayLeague|userProfiles|kullanicilar|kimlik|ayarlar)(\/|$)|^leagues\/[^\/]+\/(teams|matches|season|leagueName)(\/|$)/;
function agacOku(kok, y){
  var p = parcala(y), n = kok;
  for(var i = 0; i < p.length; i++){ if(n == null || typeof n !== 'object') return null; n = n[p[i]]; }
  return n === undefined ? null : n;
}
function birlestir(u, l, y){ // u: uzak, l: yerel; aynı alanda yerel kazanır; yalnız-yerel dallarda uzak yok sayılır
  if(l === null || l === undefined) return YALNIZ_YEREL.test(y) ? null : u;
  if(u === null || u === undefined || typeof u !== 'object' || typeof l !== 'object' || Array.isArray(l)) return l;
  var o = {};
  Object.keys(u).forEach(function(k){ var cy = y ? y + '/' + k : k; if(!YALNIZ_YEREL.test(cy)) o[k] = u[k]; });
  Object.keys(l).forEach(function(k){ o[k] = (k in o) ? birlestir(o[k], l[k], y ? y + '/' + k : k) : l[k]; });
  return o;
}
function oku(y){
  if(y === '.info/connected') return true;
  if(y === '.info/serverTimeOffset') return 0;
  var l = yerelOku(y);
  if(YALNIZ_YEREL.test(y)) return l;
  var u = agacOku(UZAK, y);
  /* (2026-11-16-E) Admin lig ayarlarını tek sezonda yapar (yayındaki sezon; yoksa Süper Lig). Skorbord'da 35 lig var: o sezonun ayarları
     bütün liglere temel olur, ligin kendi uzak ayarı onun üstüne, ESPN verisi en üste gelir. */
  var m = /^leagues\/([^\/]+)(\/.*)?$/.exec(y);
  if(m){ var t = temelLig();
    if(t !== m[1]){ var ub = agacOku(UZAK, 'leagues/' + t + (m[2] || '')); if(ub !== null) u = (u === null) ? ub : birlestir(ub, u, y); } }
  return (u === null) ? l : birlestir(u, l, y);
}
/* TEMEL SEZON (2026-11-17, kullanıcı: "admin paneli skorbord alanında yapılan hiçbir değişiklik skorborda yansımıyor"). KÖK SEBEP: temel
   sezon yalnızca "Yayına al" ile seçilen sezondu, yoksa Süper Lig (sb_tur_1) sayılıyordu. Admin ayarları ise panelde AÇIK olan sezona
   yazılıyor (admin'in kendi oluşturduğu sezon); yayına alınmadığı için Skorbord o sezonu hiç okumadı. ŞİMDİ: yayındaki sezon varsa o;
   yoksa adminin kendi oluşturduğu (Skorbord ligi olmayan) en son sezon; o da yoksa Süper Lig. */
function temelLig(){
  var t = agacOku(UZAK, 'activeDisplayLeague'), L = agacOku(UZAK, 'leagues') || {}, M = agacOku(UZAK, 'leaguesMeta') || {};
  if(typeof t === 'string' && t && L[t]) return t;
  var ad = Object.keys(L).filter(function(k){ return k.indexOf('sb_') !== 0 && L[k] && typeof L[k] === 'object'; });
  ad.sort(function(a, b){ return ((M[b] && M[b].createdAt) || 0) - ((M[a] && M[a].createdAt) || 0); });
  return ad[0] || 'sb_tur_1';
}
function uzakYaz(yol, v, yama){
  var p = parcala(String(yol || '').replace(/^\/+|\/+$/g, ''));
  if(!p.length){ if(yama && v && typeof v === 'object'){ Object.keys(v).forEach(function(k){ uzakYaz(k, v[k]); }); } else UZAK = (v && typeof v === 'object') ? v : {}; return; }
  if(yama && v && typeof v === 'object'){ Object.keys(v).forEach(function(k){ uzakYaz(p.join('/') + '/' + k, v[k]); }); return; }
  var m = UZAK;
  for(var i = 0; i < p.length - 1; i++){ if(m[p[i]] == null || typeof m[p[i]] !== 'object') m[p[i]] = {}; m = m[p[i]]; }
  if(v === null) delete m[p[p.length - 1]]; else m[p[p.length - 1]] = v;
}
function uzakDinle(){
  var olay = function(yama){ return function(e){ try{ var d = JSON.parse(e.data); if(!d) return; uzakYaz(d.path, d.data, yama); bildir(String(d.path || '').replace(/^\/+|\/+$/g, '')); }catch(x){} }; };
  var tazele = function(){ fetch(UZAK_ADRES, { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(v){ UZAK = (v && typeof v === 'object') ? v : {}; bildir(''); }, function(){}); };
  try{
    if(window.EventSource){
      var es = new EventSource(UZAK_ADRES), hata = 0;
      es.addEventListener('put', olay(false)); es.addEventListener('patch', olay(true));
      es.addEventListener('open', function(){ hata = 0; });
      es.onerror = function(){ if(++hata > 6){ try{ es.close(); }catch(e){} tazele(); setInterval(tazele, 120000); } };
      return;
    }
  }catch(e){}
  tazele(); setInterval(tazele, 120000);
}
function yerelOku(y){
  var p = parcala(y), n = KOK;
  for(var i = 0; i < p.length; i++){ if(n == null || typeof n !== 'object') return null; n = n[p[i]]; }
  return n === undefined ? null : n;
}
function kopya(v){ return (v == null || typeof v !== 'object') ? v : JSON.parse(JSON.stringify(v)); }
function temiz(v){ // sunucu zaman damgası çözülür; null/undefined/boş nesne dalları atılır (Firebase davranışı)
  if(v === undefined || v === null) return null;
  if(typeof v !== 'object') return (typeof v === 'number' && isNaN(v)) ? null : v;
  if(v['.sv'] === 'timestamp') return Date.now();
  if(v['.sv'] && v['.sv'].increment != null) return v['.sv'].increment;
  var d = Array.isArray(v), o = {}, var_ = false;
  Object.keys(v).forEach(function(k){ var t = temiz(v[k]); if(t !== null){ o[k] = t; var_ = true; } });
  if(!var_) return null;
  if(d){ var a = [], sirali = true, ks = Object.keys(o); ks.forEach(function(k, i){ if(String(i) !== k) sirali = false; }); if(sirali){ ks.forEach(function(k){ a.push(o[k]); }); return a; } }
  return o;
}
function yaz(y, v){
  var p = parcala(y); v = temiz(v);
  if(!p.length){ KOK = (v && typeof v === 'object') ? v : {}; return; }
  if(v === null){ // sil, boşalan üst dalları da temizle
    var yol = [KOK], n = KOK;
    for(var i = 0; i < p.length - 1; i++){ n = n && typeof n === 'object' ? n[p[i]] : undefined; if(n == null || typeof n !== 'object') return; yol.push(n); }
    if(Array.isArray(n)) n[p[p.length - 1]] = undefined; else delete n[p[p.length - 1]];
    for(var j = yol.length - 1; j > 0; j--){ var b = yol[j]; if(b && typeof b === 'object' && !Object.keys(b).filter(function(k){ return b[k] !== undefined; }).length) delete yol[j - 1][p[j - 1]]; else break; }
    return;
  }
  var m = KOK;
  for(var k = 0; k < p.length - 1; k++){ if(m[p[k]] == null || typeof m[p[k]] !== 'object') m[p[k]] = {}; m = m[p[k]]; }
  m[p[p.length - 1]] = v;
}
function ilgili(a, b){ return a === b || a === '' || b === '' || a.indexOf(b + '/') === 0 || b.indexOf(a + '/') === 0; }
function Anlik(y, deger){ this._y = y; this._v = deger; this.key = y ? y.split('/').pop() : null; this.ref = new Ref(y); }
Anlik.prototype = {
  val: function(){ return kopya(this._v); },
  exists: function(){ return this._v !== null && this._v !== undefined; },
  child: function(a){ var n = this._v, p = parcala(duzAlt(a)); for(var i = 0; i < p.length; i++){ n = (n && typeof n === 'object') ? n[p[i]] : null; if(n === undefined) n = null; } return new Anlik((this._y ? this._y + '/' : '') + duzAlt(a), n); },
  hasChild: function(a){ return this.child(a).exists(); },
  hasChildren: function(){ return !!(this._v && typeof this._v === 'object' && Object.keys(this._v).length); },
  numChildren: function(){ return (this._v && typeof this._v === 'object') ? Object.keys(this._v).length : 0; },
  forEach: function(f){ var s = this; if(!s._v || typeof s._v !== 'object') return false; return Object.keys(s._v).some(function(k){ return f(s.child(k)) === true; }); },
  toJSON: function(){ return this.val(); }
};
function duzAlt(a){ return String(a == null ? '' : a).replace(/^\/+|\/+$/g, ''); }
function bildir(y){
  DINLEYEN.slice().forEach(function(d){
    if(!ilgili(d.y, y) || d.bekliyor) return;
    d.bekliyor = true;
    setTimeout(function(){ d.bekliyor = false; if(DINLEYEN.indexOf(d) < 0) return; ates(d, false); }, 0);
  });
}
function suz(d, v){ // sorgu süzgeçleri (equalTo / limit) - yalnızca kullanılan kadarı
  if(!d.q || v == null || typeof v !== 'object') return v;
  var ks = Object.keys(v);
  if(d.q.esit !== undefined){ ks = ks.filter(function(k){ var x = d.q.alan ? (v[k] && v[k][d.q.alan]) : k; return x === d.q.esit; }); }
  if(d.q.son) ks = ks.slice(-d.q.son);
  if(d.q.ilk) ks = ks.slice(0, d.q.ilk);
  var o = {}; ks.forEach(function(k){ o[k] = v[k]; }); return Object.keys(o).length ? o : null;
}
function ates(d, ilk){
  try{
    var v = suz(d, oku(d.y));
    if(d.tur === 'value'){ d.cb.call(d.bag, new Anlik(d.y, v)); return; }
    var yeni = (v && typeof v === 'object') ? v : {}, eski = d.onceki || {};
    var imza = function(x){ try{ return JSON.stringify(x); }catch(e){ return ''; } };
    Object.keys(yeni).forEach(function(k){
      var s = imza(yeni[k]);
      if(!(k in eski)){ if(d.tur === 'child_added') d.cb.call(d.bag, new Anlik(d.y + '/' + k, yeni[k]), null); }
      else if(eski[k] !== s && d.tur === 'child_changed') d.cb.call(d.bag, new Anlik(d.y + '/' + k, yeni[k]), null);
    });
    if(d.tur === 'child_removed') Object.keys(eski).forEach(function(k){ if(!(k in yeni)) d.cb.call(d.bag, new Anlik(d.y + '/' + k, JSON.parse(eski[k] || 'null'))); });
    var o = {}; Object.keys(yeni).forEach(function(k){ o[k] = imza(yeni[k]); }); d.onceki = o;
  }catch(e){ try{ console.error('yerel veri dinleyicisi:', d.y, e); }catch(_){} }
}
var itme = 0;
function itmeAnahtari(){ itme++; var t = Date.now().toString(36); return '-Y' + ('00000000' + t).slice(-9) + ('0000' + itme.toString(36)).slice(-4) + Math.random().toString(36).slice(2, 6); }
function Ref(y, q){ this._y = duz(y); this._q = q || null; this.key = this._y ? this._y.split('/').pop() : null; }
Ref.prototype.toString = function(){ return 'https://yerel.skorbord/' + this._y; };
Ref.prototype.toJSON = Ref.prototype.toString;
Ref.prototype.child = function(a){ return new Ref((this._y ? this._y + '/' : '') + duzAlt(a)); };
Object.defineProperty(Ref.prototype, 'parent', { get: function(){ if(!this._y) return null; var p = this._y.split('/'); p.pop(); return new Ref(p.join('/')); } });
Object.defineProperty(Ref.prototype, 'root', { get: function(){ return new Ref(''); } });
Object.defineProperty(Ref.prototype, 'ref', { get: function(){ return new Ref(this._y); } });
Ref.prototype.isEqual = function(o){ return !!o && o._y === this._y && JSON.stringify(o._q) === JSON.stringify(this._q); };
Ref.prototype.on = function(tur, cb, iptal, bag){
  if(typeof cb !== 'function') return cb;
  if(iptal && typeof iptal === 'object' && bag === undefined) bag = iptal;
  var d = { y: this._y, tur: tur, cb: cb, bag: bag || null, q: this._q, bekliyor: true };
  DINLEYEN.push(d);
  setTimeout(function(){ d.bekliyor = false; if(DINLEYEN.indexOf(d) >= 0) ates(d, true); }, 0);
  return cb;
};
Ref.prototype.off = function(tur, cb){
  var y = this._y;
  DINLEYEN = DINLEYEN.filter(function(d){ return !(d.y === y && (!tur || d.tur === tur) && (!cb || d.cb === cb)); });
};
Ref.prototype.once = function(tur, cb, hata, bag){
  var s = this, an = new Anlik(s._y, suz({ q: s._q }, oku(s._y)));
  return new Promise(function(coz){ setTimeout(function(){ try{ if(typeof cb === 'function') cb.call(bag || null, an); }catch(e){} coz(an); }, 0); });
};
Ref.prototype.get = function(){ return this.once('value'); };
function yazVeBildir(y, v, cb){
  yaz(y, v); bildir(y); if(SAKLA.test(y)) sakla();
  return new Promise(function(coz){ setTimeout(function(){ try{ if(typeof cb === 'function') cb(null); }catch(e){} coz(); }, 0); });
}
Ref.prototype.set = function(v, cb){ return yazVeBildir(this._y, v, cb); };
Ref.prototype.setWithPriority = function(v, p, cb){ return yazVeBildir(this._y, v, cb); };
Ref.prototype.remove = function(cb){ return yazVeBildir(this._y, null, cb); };
Ref.prototype.update = function(o, cb){
  var s = this;
  Object.keys(o || {}).forEach(function(k){ var y = (s._y ? s._y + '/' : '') + duzAlt(k); yaz(y, o[k]); if(SAKLA.test(y)) sakla(); });
  bildir(s._y);
  return new Promise(function(coz){ setTimeout(function(){ try{ if(typeof cb === 'function') cb(null); }catch(e){} coz(); }, 0); });
};
Ref.prototype.push = function(v, cb){
  var r = this.child(itmeAnahtari());
  var p = (v === undefined) ? Promise.resolve(r) : r.set(v, cb).then(function(){ return r; });
  r.then = p.then.bind(p); r['catch'] = p['catch'].bind(p);
  return r;
};
Ref.prototype.transaction = function(f, cb){
  var yeni = f(kopya(oku(this._y))), s = this;
  if(yeni === undefined){ var a0 = new Anlik(s._y, oku(s._y)); if(cb) cb(null, false, a0); return Promise.resolve({ committed: false, snapshot: a0 }); }
  return yazVeBildir(s._y, yeni).then(function(){ var a = new Anlik(s._y, oku(s._y)); if(cb) cb(null, true, a); return { committed: true, snapshot: a }; });
};
Ref.prototype.onDisconnect = function(){ var p = function(){ return Promise.resolve(); }; return { set: p, remove: p, update: p, cancel: p, setWithPriority: p }; };
function sorgu(ek){ return function(a, b){ var q = {}; var e = this._q || {}; Object.keys(e).forEach(function(k){ q[k] = e[k]; }); ek(q, a, b); return new Ref(this._y, q); }; }
Ref.prototype.orderByKey = sorgu(function(q){ q.alan = null; });
Ref.prototype.orderByValue = sorgu(function(q){});
Ref.prototype.orderByPriority = sorgu(function(q){});
Ref.prototype.orderByChild = sorgu(function(q, a){ q.alan = a; });
Ref.prototype.equalTo = sorgu(function(q, a){ q.esit = a; });
Ref.prototype.limitToLast = sorgu(function(q, a){ q.son = a; });
Ref.prototype.limitToFirst = sorgu(function(q, a){ q.ilk = a; });
Ref.prototype.startAt = sorgu(function(q){});
Ref.prototype.endAt = sorgu(function(q){});
Ref.prototype.startAfter = sorgu(function(q){});
Ref.prototype.endBefore = sorgu(function(q){});
Ref.prototype.keepSynced = function(){};

var VT = { ref: function(y){ return new Ref(y); }, refFromURL: function(u){ return new Ref(u); }, goOnline: function(){}, goOffline: function(){}, useEmulator: function(){}, app: null };
function veritabani(){ return VT; }
veritabani.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' }, increment: function(n){ return { '.sv': { increment: n } }; } };
veritabani.Reference = Ref; veritabani.Query = Ref; veritabani.enableLogging = function(){};

var KULLANICI = { uid: 'yerel-cihaz', isAnonymous: true, displayName: null, email: null, photoURL: null, providerData: [],
  getIdToken: function(){ return Promise.resolve(''); }, getIdTokenResult: function(){ return Promise.resolve({ claims: {} }); },
  reload: function(){ return Promise.resolve(); }, linkWithPopup: function(){ return Promise.reject(new Error('Bu uygulamada hesap bağlama yok')); },
  linkWithRedirect: function(){ return Promise.reject(new Error('Bu uygulamada hesap bağlama yok')); }, linkWithCredential: function(){ return Promise.reject(new Error('Bu uygulamada hesap bağlama yok')); },
  unlink: function(){ return Promise.resolve(KULLANICI); }, delete: function(){ return Promise.resolve(); } };
var KIMLIK = { currentUser: KULLANICI, app: null,
  onAuthStateChanged: function(cb){ setTimeout(function(){ try{ if(typeof cb === 'function') cb(KULLANICI); else if(cb && cb.next) cb.next(KULLANICI); }catch(e){} }, 0); return function(){}; },
  onIdTokenChanged: function(cb){ return KIMLIK.onAuthStateChanged(cb); },
  signInAnonymously: function(){ return Promise.resolve({ user: KULLANICI }); },
  signInWithCustomToken: function(){ return Promise.resolve({ user: KULLANICI }); },
  signInWithCredential: function(){ return Promise.reject(new Error('Bu uygulamada Google ile giriş yok')); },
  signInWithPopup: function(){ return Promise.reject(new Error('Bu uygulamada Google ile giriş yok')); },
  signInWithRedirect: function(){ return Promise.reject(new Error('Bu uygulamada Google ile giriş yok')); },
  getRedirectResult: function(){ return Promise.resolve({ user: null }); },
  setPersistence: function(){ return Promise.resolve(); }, signOut: function(){ return Promise.resolve(); }, useDeviceLanguage: function(){} };
function kimlik(){ return KIMLIK; }
kimlik.Auth = { Persistence: { LOCAL: 'local', SESSION: 'session', NONE: 'none' } };
kimlik.GoogleAuthProvider = function(){ this.addScope = function(){}; this.setCustomParameters = function(){}; };
kimlik.GoogleAuthProvider.credential = function(){ return {}; };

var UYG = { name: '[DEFAULT]', options: {}, database: veritabani, auth: kimlik };
VT.app = UYG; KIMLIK.app = UYG;
window.firebase = {
  SDK_VERSION: 'yerel', apps: [UYG],
  initializeApp: function(a){ UYG.options = a || {}; return UYG; },
  app: function(){ return UYG; },
  database: veritabani, auth: kimlik,
  appCheck: function(){ return { activate: function(){}, setTokenAutoRefreshEnabled: function(){} }; },
  storage: function(){ var r = { child: function(){ return r; }, put: function(){ return Promise.reject(new Error('Bu uygulamada dosya yükleme yok')); }, putString: function(){ return Promise.reject(new Error('Bu uygulamada dosya yükleme yok')); }, getDownloadURL: function(){ return Promise.reject(new Error('yok')); }, delete: function(){ return Promise.resolve(); } }; return { ref: function(){ return r; }, refFromURL: function(){ return r; } }; }
};
/* Gerçek veri modülü ağaca buradan yazar / okur. */
window.YerelVT = { yaz: function(y, v){ y = duz(y); yaz(y, v); bildir(y); }, oku: function(y){ return kopya(yerelOku(duz(y))); }, ham: function(y){ return yerelOku(duz(y)); }, uzak: function(y){ return kopya(agacOku(UZAK, duz(y))); },
  guncelle: function(y, o){ return new Ref(y).update(o); }, bildir: function(y){ bildir(duz(y)); } };
try{ uzakDinle(); }catch(e){}
})();
