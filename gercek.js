/* GERÇEK VERİ MODÜLÜ (Skorbord). Skorbord arayüzünü gerçek liglerle besler.
   - Veri: ESPN'in açık skor servisi (anahtar gerektirmez). Hiçbir şey SAHA / Admin / Skorbord veritabanına yazılmaz;
     lig verisi yalnızca cihaz belleğindeki yerel ağaca (yerel-vt.js) "leagues/<lig>" altına yerleştirilir ve arayüz onu
     kendi olağan yolundan okur. Böylece puan durumu, fikstür, sonuçlar, form, istatistik, karşılaştırma ve lig analizi
     arayüzün kendi hesaplarıyla, gerçek maçlardan çıkar.
   - Her gerçek lig arayüzde bir "sezon" olarak görünür; lig değiştirmek = sezon değiştirmek. */
(function(){
'use strict';
if(window.Gercek) return;
var ESPN='https://site.api.espn.com/', SITE=ESPN+'apis/site/v2/sports/soccer/', STAND=ESPN+'apis/v2/sports/soccer/';
var HIZLI=5000, ORTA=60000, SEZON_TAZE=6*3600*1000;
/* YÖNETİCİ AYARLARI (2026-11-16): Admin > Yönetim > Skorbord'dan yönetilir; burada YALNIZCA OKUNUR (Skorbord hiçbir yere yazmaz).
   Skorbord'un futbol-ligi ile tek bilinçli bağı budur: herkese açık, salt okunur "skorbord/ayarlar" düğümü (oyuncu/lig verisi yok). */
var UZAK_URL='https://superlig-208e3-default-rtdb.europe-west1.firebasedatabase.app/skorbord/ayarlar.json', U={};
function gunluk(){ try{ console.log.apply(console, ['[SB]'].concat([].slice.call(arguments))); }catch(e){} }

/* ---------- ligler: [ESPN kısa adı, Türkçe ad, ülke/öbek] ; sıra = seçicideki sıra ---------- */
var LIGLER=[
 ['tur.1','Süper Lig','Türkiye'],['tur.2','TFF 1. Lig','Türkiye'],
 ['uefa.champions','UEFA Şampiyonlar Ligi','Avrupa'],['uefa.europa','UEFA Avrupa Ligi','Avrupa'],['uefa.europa.conf','UEFA Konferans Ligi','Avrupa'],
 ['eng.1','İngiltere Premier Lig','İngiltere'],['esp.1','İspanya La Liga','İspanya'],['ita.1','İtalya Serie A','İtalya'],['ger.1','Almanya Bundesliga','Almanya'],['fra.1','Fransa Ligue 1','Fransa'],
 ['ned.1','Hollanda Eredivisie','Hollanda'],['por.1','Portekiz Primeira Liga','Portekiz'],['bel.1','Belçika Pro Lig','Belçika'],['sco.1','İskoçya Premiership','İskoçya'],
 ['gre.1','Yunanistan Süper Lig','Yunanistan'],['rus.1','Rusya Premier Lig','Rusya'],['aut.1','Avusturya Bundesliga','Avusturya'],['sui.1','İsviçre Süper Lig','İsviçre'],
 ['den.1','Danimarka Superliga','Danimarka'],['nor.1','Norveç Eliteserien','Norveç'],['swe.1','İsveç Allsvenskan','İsveç'],
 ['eng.2','İngiltere Championship','İngiltere'],['esp.2','İspanya La Liga 2','İspanya'],['ita.2','İtalya Serie B','İtalya'],['ger.2','Almanya 2. Bundesliga','Almanya'],['fra.2','Fransa Ligue 2','Fransa'],
 ['sau.1','Suudi Arabistan Pro Lig','Suudi Arabistan'],['usa.1','ABD MLS','ABD'],['bra.1','Brezilya Serie A','Brezilya'],['arg.1','Arjantin Primera','Arjantin'],['mex.1','Meksika Liga MX','Meksika'],
 ['jpn.1','Japonya J1 Lig','Japonya'],['aus.1','Avustralya A-League','Avustralya'],['uefa.nations','UEFA Uluslar Ligi','Milli'],['fifa.worldq.uefa','Dünya Kupası Elemeleri (Avrupa)','Milli']
];
var LIG_AD={}; LIGLER.forEach(function(l){ LIG_AD[l[0]]=l[1]; });
/* Yönetici "görünen ligleri" seçtiyse yalnız onlar listelenir; seçmediyse hepsi. */
function aktifLigler(){ var a=U&&U.ligler; if(!a||typeof a!=='object') return LIGLER; var f=LIGLER.filter(function(l){ return a[l[0].replace(/\./g,'_')]; }); return f.length?f:LIGLER; }
function ligAktifMi(slug){ return aktifLigler().some(function(l){ return l[0]===slug; }); }

/* ---------- Türkçe adlar: ESPN'in İngilizce / harfsiz yazdığı takım ve ülke adları ---------- */
var TR_AD={
 'Besiktas':'Beşiktaş','Caykur Rizespor':'Çaykur Rizespor','Erzurum BB':'Erzurumspor FK','Erzurum':'Erzurumspor','Eyupspor':'Eyüpspor','Fenerbahce':'Fenerbahçe','Genclerbirligi':'Gençlerbirliği','Genclerbirli':'Gençlerbirliği',
 'Goztepe':'Göztepe','Istanbul Basaksehir':'Başakşehir','Istanbul BB':'Başakşehir','Kasimpasa':'Kasımpaşa','Ankaragucu':'Ankaragücü','Umraniyespor':'Ümraniyespor','Istanbulspor':'İstanbulspor',
 'Bandirmaspor':'Bandırmaspor','Keciorengucu':'Keçiörengücü','Igdir FK':'Iğdır FK','Sanliurfaspor':'Şanlıurfaspor','Corum FK':'Çorum FK','Sariyer':'Sarıyer','Altinordu':'Altınordu','Fatih Karagumruk':'Fatih Karagümrük',
 'Adana Demirspor':'Adana Demirspor','Bodrum FK':'Bodrum FK','Eskisehirspor':'Eskişehirspor','Elazigspor':'Elazığspor','Diyarbakirspor':'Diyarbakırspor','Kahramanmarasspor':'Kahramanmaraşspor','Usakspor':'Uşakspor',
 'Turkey':'Türkiye','Türkiye':'Türkiye','Germany':'Almanya','Spain':'İspanya','France':'Fransa','Italy':'İtalya','England':'İngiltere','Netherlands':'Hollanda','Portugal':'Portekiz','Belgium':'Belçika',
 'Croatia':'Hırvatistan','Switzerland':'İsviçre','Austria':'Avusturya','Denmark':'Danimarka','Sweden':'İsveç','Norway':'Norveç','Finland':'Finlandiya','Iceland':'İzlanda','Scotland':'İskoçya','Wales':'Galler',
 'Northern Ireland':'Kuzey İrlanda','Republic of Ireland':'İrlanda','Ireland':'İrlanda','Poland':'Polonya','Czechia':'Çekya','Czech Republic':'Çekya','Slovakia':'Slovakya','Slovenia':'Slovenya','Hungary':'Macaristan',
 'Romania':'Romanya','Bulgaria':'Bulgaristan','Greece':'Yunanistan','Serbia':'Sırbistan','Bosnia and Herzegovina':'Bosna Hersek','Bosnia-Herzegovina':'Bosna Hersek','Montenegro':'Karadağ','North Macedonia':'Kuzey Makedonya',
 'Albania':'Arnavutluk','Kosovo':'Kosova','Ukraine':'Ukrayna','Russia':'Rusya','Belarus':'Belarus','Georgia':'Gürcistan','Armenia':'Ermenistan','Azerbaijan':'Azerbaycan','Kazakhstan':'Kazakistan','Israel':'İsrail',
 'Cyprus':'Kıbrıs','Malta':'Malta','Luxembourg':'Lüksemburg','Estonia':'Estonya','Latvia':'Letonya','Lithuania':'Litvanya','Moldova':'Moldova','Faroe Islands':'Faroe Adaları','Andorra':'Andorra','San Marino':'San Marino',
 'Gibraltar':'Cebelitarık','Liechtenstein':'Lihtenştayn','Brazil':'Brezilya','Argentina':'Arjantin','Uruguay':'Uruguay','Colombia':'Kolombiya','Chile':'Şili','Peru':'Peru','Ecuador':'Ekvador','Paraguay':'Paraguay',
 'Mexico':'Meksika','United States':'ABD','USA':'ABD','Canada':'Kanada','Japan':'Japonya','South Korea':'Güney Kore','Australia':'Avustralya','Saudi Arabia':'Suudi Arabistan','Iran':'İran','Qatar':'Katar',
 'Morocco':'Fas','Egypt':'Mısır','Algeria':'Cezayir','Tunisia':'Tunus','Nigeria':'Nijerya','Senegal':'Senegal','Ghana':'Gana','Cameroon':'Kamerun','Ivory Coast':'Fildişi Sahili','South Africa':'Güney Afrika',
 'Bayern Munich':'Bayern Münih','Internazionale':'Inter','AC Milan':'Milan','Atletico Madrid':'Atletico Madrid','Sporting CP':'Sporting Lizbon','Red Star Belgrade':'Kızılyıldız','Olympiacos':'Olimpiakos','Dinamo Zagreb':'Dinamo Zagreb'
};
/* ülke adları (milli maçlar): İngilizce -> Türkçe */
var ULKE={"Ascension Island":"Ascension Adası","United Arab Emirates":"Birleşik Arap Emirlikleri","Afghanistan":"Afganistan","Antigua & Barbuda":"Antigua ve Barbuda","Albania":"Arnavutluk","Armenia":"Ermenistan","Antarctica":"Antarktika","Argentina":"Arjantin","American Samoa":"Amerikan Samoası","Austria":"Avusturya","Australia":"Avustralya","Åland Islands":"Åland Adaları","Azerbaijan":"Azerbaycan","Bosnia & Herzegovina":"Bosna-Hersek","Bangladesh":"Bangladeş","Belgium":"Belçika","Bulgaria":"Bulgaristan","Bahrain":"Bahreyn","St. Barthélemy":"Saint Barthelemy","Bolivia":"Bolivya","Caribbean Netherlands":"Karayip Hollandası","Brazil":"Brezilya","Bahamas":"Bahamalar","Bhutan":"Butan","Bouvet Island":"Bouvet Adası","Botswana":"Botsvana","Canada":"Kanada","Cocos (Keeling) Islands":"Cocos (Keeling) Adaları","Congo - Kinshasa":"Kongo - Kinşasa","Central African Republic":"Orta Afrika Cumhuriyeti","Congo - Brazzaville":"Kongo - Brazavil","Switzerland":"İsviçre","Cook Islands":"Cook Adaları","Chile":"Şili","Cameroon":"Kamerun","China":"Çin","Colombia":"Kolombiya","Clipperton Island":"Clipperton Adası","Costa Rica":"Kosta Rika","Serbia":"Sırbistan","Cuba":"Küba","Cape Verde":"Yeşil Burun Adaları","Christmas Island":"Christmas Adası","Cyprus":"Kıbrıs","Czechia":"Çekya","Germany":"Almanya","Djibouti":"Cibuti","Denmark":"Danimarka","Dominica":"Dominika","Dominican Republic":"Dominik Cumhuriyeti","Algeria":"Cezayir","Ceuta & Melilla":"Ceuta ve Melilla","Ecuador":"Ekvador","Estonia":"Estonya","Egypt":"Mısır","Western Sahara":"Batı Sahra","Eritrea":"Eritre","Spain":"İspanya","Ethiopia":"Etiyopya","European Union":"Avrupa Birliği","Eurozone":"Euro Bölgesi","Finland":"Finlandiya","Falkland Islands":"Falkland Adaları","Micronesia":"Mikronezya","Faroe Islands":"Faroe Adaları","France":"Fransa","United Kingdom":"Birleşik Krallık","Georgia":"Gürcistan","French Guiana":"Fransız Guyanası","Ghana":"Gana","Gibraltar":"Cebelitarık","Greenland":"Grönland","Gambia":"Gambiya","Guinea":"Gine","Equatorial Guinea":"Ekvator Ginesi","Greece":"Yunanistan","South Georgia & South Sandwich Islands":"Güney Georgia ve Güney Sandwich Adaları","Guinea-Bissau":"Gine-Bissau","Hong Kong SAR China":"Çin Hong Kong ÖİB","Heard & McDonald Islands":"Heard Adası ve McDonald Adaları","Croatia":"Hırvatistan","Hungary":"Macaristan","Canary Islands":"Kanarya Adaları","Indonesia":"Endonezya","Ireland":"İrlanda","Israel":"İsrail","Isle of Man":"Man Adası","India":"Hindistan","British Indian Ocean Territory":"Britanya Hint Okyanusu Toprakları","Iraq":"Irak","Iran":"İran","Iceland":"İzlanda","Italy":"İtalya","Jamaica":"Jamaika","Jordan":"Ürdün","Japan":"Japonya","Kyrgyzstan":"Kırgızistan","Cambodia":"Kamboçya","Comoros":"Komorlar","St. Kitts & Nevis":"Saint Kitts ve Nevis","North Korea":"Kuzey Kore","South Korea":"Güney Kore","Kuwait":"Kuveyt","Cayman Islands":"Cayman Adaları","Kazakhstan":"Kazakistan","Lebanon":"Lübnan","St. Lucia":"Saint Lucia","Liberia":"Liberya","Lithuania":"Litvanya","Luxembourg":"Lüksemburg","Latvia":"Letonya","Morocco":"Fas","Monaco":"Monako","Montenegro":"Karadağ","St. Martin":"Saint Martin","Madagascar":"Madagaskar","Marshall Islands":"Marshall Adaları","North Macedonia":"Kuzey Makedonya","Mongolia":"Moğolistan","Macao SAR China":"Çin Makao ÖİB","Northern Mariana Islands":"Kuzey Mariana Adaları","Martinique":"Martinik","Mauritania":"Moritanya","Maldives":"Maldivler","Malawi":"Malavi","Mexico":"Meksika","Malaysia":"Malezya","Mozambique":"Mozambik","Namibia":"Namibya","New Caledonia":"Yeni Kaledonya","Niger":"Nijer","Norfolk Island":"Norfolk Adası","Nigeria":"Nijerya","Nicaragua":"Nikaragua","Netherlands":"Hollanda","Norway":"Norveç","New Zealand":"Yeni Zelanda","Oman":"Umman","French Polynesia":"Fransız Polinezyası","Papua New Guinea":"Papua Yeni Gine","Philippines":"Filipinler","Poland":"Polonya","St. Pierre & Miquelon":"Saint Pierre ve Miquelon","Pitcairn Islands":"Pitcairn Adaları","Puerto Rico":"Porto Riko","Palestinian Territories":"Filistin Bölgeleri","Portugal":"Portekiz","Qatar":"Katar","Outlying Oceania":"Uzak Okyanusya","Réunion":"Reunion","Zimbabwe":"Zimbabve","Romania":"Romanya","Russia":"Rusya","Rwanda":"Ruanda","Saudi Arabia":"Suudi Arabistan","Solomon Islands":"Solomon Adaları","Seychelles":"Seyşeller","Sweden":"İsveç","Singapore":"Singapur","St. Helena":"Saint Helena","Slovenia":"Slovenya","Svalbard & Jan Mayen":"Svalbard ve Jan Mayen","Slovakia":"Slovakya","Somalia":"Somali","Suriname":"Surinam","South Sudan":"Güney Sudan","São Tomé & Príncipe":"Sao Tome ve Principe","Syria":"Suriye","Eswatini":"Esvatini","Turks & Caicos Islands":"Turks ve Caicos Adaları","Chad":"Çad","French Southern Territories":"Fransız Güney Toprakları","Thailand":"Tayland","Tajikistan":"Tacikistan","Turkmenistan":"Türkmenistan","Tunisia":"Tunus","Trinidad & Tobago":"Trinidad ve Tobago","Taiwan":"Tayvan","Tanzania":"Tanzanya","Ukraine":"Ukrayna","U.S. Outlying Islands":"ABD Küçük Harici Adaları","United Nations":"Birleşmiş Milletler","United States":"ABD","Uzbekistan":"Özbekistan","Vatican City":"Vatikan","St. Vincent & Grenadines":"Saint Vincent ve Grenadinler","British Virgin Islands":"Britanya Virjin Adaları","U.S. Virgin Islands":"ABD Virjin Adaları","Wallis & Futuna":"Wallis ve Futuna","Pseudo-Accents":"Psödo Aksanlar","Pseudo-Bidi":"Psödo Bidi","Kosovo":"Kosova","South Africa":"Güney Afrika","Zambia":"Zambiya","Unknown Region":"Bilinmeyen Bölge","Bosnia-Herz":"Bosna Hersek","Bosnia-Herzegovina":"Bosna Hersek","Eq. Guinea":"Ekvator Ginesi","Cent Afr Rep":"Orta Afrika Cumhuriyeti","USA":"ABD","England":"İngiltere","Scotland":"İskoçya","Wales":"Galler","Northern Ireland":"Kuzey İrlanda","N. Ireland":"Kuzey İrlanda","Republic of Ireland":"İrlanda","Rep. of Ireland":"İrlanda","Ivory Coast":"Fildişi Sahili","Czech Republic":"Çekya","Korea Republic":"Güney Kore","DR Congo":"Kongo DC","Congo DR":"Kongo DC","Cape Verde Islands":"Yeşil Burun Adaları","Turkey":"Türkiye","Macedonia":"Kuzey Makedonya","UAE":"BAE","China PR":"Çin","Chinese Taipei":"Çin Taypeyi","Kyrgyz Republic":"Kırgızistan","Curacao":"Curaçao","Sao Tome and Principe":"Sao Tome ve Principe","The Gambia":"Gambiya"};
function trAd(a){ return (a && (TR_AD[a] || ULKE[a])) || a || '?'; }
var MEVKI={G:'Kaleci',D:'Defans',M:'Orta Saha',F:'Forvet'};

/* ---------- ayar ---------- */
var AK='sb_ayar', A={lig:'tur.1', serit:'hepsi'};
var _ilkAcilis=true; try{ _ilkAcilis=!localStorage.getItem(AK); }catch(e){}
try{ var _a=JSON.parse(localStorage.getItem(AK)||'{}'); if(_a&&typeof _a==='object') Object.keys(_a).forEach(function(k){ A[k]=_a[k]; }); }catch(e){}
function ayarYaz(){ try{ localStorage.setItem(AK, JSON.stringify(A)); }catch(e){} }

/* ---------- yardımcılar ---------- */
function p2(n){ return ('0'+n).slice(-2); }
function ymd(d){ return ''+d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate()); }
function tarihYaz(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
function gunBas(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function gunEkle(d,n){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); }
function ayniGun(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function sc(v){ return v==null?null:(typeof v==='object'?(v.displayValue!=null?v.displayValue:v.value):v); }
function dk(s){ var m=/(\d+)(?:'?\s*\+\s*(\d+))?/.exec(String(s||'')); return m?(+m[1])+(m[2]?+m[2]:0):0; }
function ligKimlik(slug){ return 'sb_'+String(slug).replace(/[^a-z0-9]+/gi,'_'); }
function kimliktenSlug(id){ for(var i=0;i<LIGLER.length;i++) if(ligKimlik(LIGLER[i][0])===id) return LIGLER[i][0]; return null; }
function ham(url){
  return fetch(url).then(function(r){
    if(r.ok) return r.json();
    return r.text().then(function(t){ throw new Error('HTTP '+r.status+' '+String(t||'').slice(0,100)); }, function(){ throw new Error('HTTP '+r.status); });
  });
}
function getJSON(url){
  return ham(url).catch(function(e){
    // Android uygulaması: tarayıcı isteği olmazsa aynı adres uygulamanın kendi bağlantısıyla denenir (bkz. Ana.java "__espn")
    if(window.SkorbordApp && url.indexOf(ESPN)===0)
      return ham(location.origin+'/skorbord/__espn/'+url.slice(ESPN.length)).catch(function(e2){ throw new Error(e.message+' / uygulama: '+e2.message); });
    throw e;
  });
}

/* ---------- ESPN maçı -> ara biçim ---------- */
function olayTuru(d){
  var t=String((d.type&&(d.type.type||d.type.text))||'').toLowerCase();
  if(t.indexOf('substitution')>=0) return 'sub';
  if(d.redCard||/red.?card/.test(t)) return 'red';
  if(d.yellowCard||t.indexOf('yellow')>=0) return 'yellow';
  if(d.ownGoal||t.indexOf('own')>=0) return 'og';
  if(t.indexOf('penalty')>=0 && (t.indexOf('miss')>=0||t.indexOf('saved')>=0)) return 'pen_miss';
  if(d.scoringPlay||t.indexOf('goal')>=0||t.indexOf('penalty---scored')>=0||t.indexOf('penalty - scored')>=0) return (d.penaltyKick||t.indexOf('penalty')>=0)?'pen_goal':'goal';
  return '';
}
function olaylar(liste, evId, depId){
  var out=[];
  (liste||[]).forEach(function(d){
    if(d.shootout) return;
    var tur=olayTuru(d); if(!tur) return;
    var ks=d.athletesInvolved||(d.participants||[]).map(function(p){ return p.athlete||{}; });
    var tid=String((d.team&&d.team.id)||'');
    var o={type:tur, min:dk(d.clock&&d.clock.displayValue), team:(tid===depId?'away':'home'),
      player:(ks[0]&&(ks[0].displayName||ks[0].shortName))||''};
    if(tur==='sub'){ o.playerIn=o.player; o.playerOut=(ks[1]&&(ks[1].displayName||ks[1].shortName))||''; }
    out.push(o);
  });
  return out;
}
function esAl(ev, kova){
  var comp=(ev.competitions&&ev.competitions[0])||{}, cs=comp.competitors||[];
  var h=cs.filter(function(c){ return c.homeAway==='home'; })[0]||cs[0]||{};
  var a=cs.filter(function(c){ return c.homeAway==='away'; })[0]||cs[1]||{};
  var st=ev.status||comp.status||{}, tp=st.type||{};
  function taraf(c){ var t=c.team||{}; return {id:String(t.id||''), name:trAd(t.shortDisplayName||t.displayName||t.name), full:trAd(t.displayName||t.name),
    logo:t.logo||(t.logos&&t.logos[0]&&t.logos[0].href)||'', score:sc(c.score), pen:c.shootoutScore, color:t.color||'', alt:t.alternateColor||''}; }
  var m=/l:(\d+)/.exec(ev.uid||'');
  var H=taraf(h), Aw=taraf(a);
  return {rid:String(ev.id), lid:(m&&m[1])||'', date:new Date(ev.date), state:tp.state||'pre', sname:tp.name||'', clock:st.displayClock||'', period:+st.period||0,
    sezon:(ev.season&&ev.season.year)||0, kova:kova||'', h:H, a:Aw, evs:olaylar(comp.details, H.id, Aw.id),
    stad:(comp.venue&&(comp.venue.fullName||comp.venue.displayName))||(ev.venue&&ev.venue.displayName)||'',
    not:String(comp.altGameNote||'').split(',').slice(1).join(',').trim()};
}
function durumNotu(e){
  var n=e.sname;
  if(/POSTPONED/.test(n)) return 'Ertelendi';
  if(/CANCEL/.test(n)) return 'İptal edildi';
  if(/ABANDON|SUSPEND/.test(n)) return 'Yarıda kaldı';
  if(/DELAY/.test(n)) return 'Gecikti';
  return '';
}
function macNesnesi(e, hafta, eski){
  var d=e.date, m=eski||{};
  m.id='m'+e.rid; m.homeId='t'+e.h.id; m.awayId='t'+e.a.id;
  m.week=hafta||m.week||1;
  m.date=tarihYaz(d); m.time=p2(d.getHours())+':'+p2(d.getMinutes());
  var canli=e.state==='in', bitti=e.state==='post' && !/POSTPONED|CANCEL/.test(e.sname);
  m.played=bitti; m.isLive=canli;
  if(canli||bitti){ m.homeGoals=+e.h.score||0; m.awayGoals=+e.a.score||0; } else { delete m.homeGoals; delete m.awayGoals; }
  if(canli){ m.minute=dk(e.clock)||1; m.isHalftime=/HALFTIME/.test(e.sname); } else { delete m.minute; delete m.isHalftime; }
  if(e.evs.length || !m.events || !m._ozet) m.events=(m._ozet && (m.events||[]).length>=e.evs.length)?m.events:e.evs;
  if(e.stad) m.stadium=e.stad;
  var nt=durumNotu(e); if(nt) m.note=nt; else if(m.note && /Ertelendi|İptal|Yarıda|Gecikti/.test(m.note)) delete m.note;
  m.espn=e.rid;
  return m;
}

/* ---------- haftalar: maç günleri kümelenir (bir takım aynı haftada iki kez oynamaz; 36 saatten uzun ara yeni hafta) ---------- */
function haftalariBul(liste, takimSayisi){
  var s=liste.slice().sort(function(x,y){ return x.date-y.date; }), kumeler=[], cur=null;
  s.forEach(function(e){
    var yeni=!cur || (e.date-cur.son)>36*3600*1000 || cur.takim[e.h.id] || cur.takim[e.a.id];
    if(yeni){ cur={mac:[], takim:{}, son:e.date}; kumeler.push(cur); }
    cur.mac.push(e); cur.takim[e.h.id]=1; cur.takim[e.a.id]=1; cur.son=e.date;
  });
  var esik=Math.max(2, Math.floor((takimSayisi||0)/8)), hafta=0, sonuc={};
  kumeler.forEach(function(k){
    if(k.mac.length>=esik || hafta===0) hafta++;     // küçük küme = ertelenmiş maç: önceki haftaya yazılır
    k.mac.forEach(function(e){ sonuc[e.rid]=hafta; });
  });
  return sonuc;
}

/* ---------- lig yükleme ---------- */
var L={};  // slug -> {t:zaman, veri:{...}, yukleniyor:Promise}
function sezonAdi(s){ try{ var a=new Date(s.startDate).getFullYear(), b=new Date(s.endDate).getFullYear(); if(new Date(s.endDate).getMonth()<1) b=b-1; return a===b?String(a):a+'-'+String(b).slice(2); }catch(e){ return ''; } }
function ligYukle(slug, zorla){
  var k=L[slug]||(L[slug]={});
  if(k.yukleniyor) return k.yukleniyor;
  if(k.veri && !zorla && Date.now()-k.t<SEZON_TAZE) return Promise.resolve(k.veri);
  k.yukleniyor=Promise.all([
    getJSON(SITE+slug+'/scoreboard'),
    getJSON(SITE+slug+'/teams?limit=200').catch(function(){ return null; }),
    getJSON(STAND+slug+'/standings').catch(function(){ return null; })
  ]).then(function(r){
    var sb=r[0], lg=(sb.leagues&&sb.leagues[0])||{}, sez=lg.season||{}, yil=sez.year||new Date().getFullYear();
    var y1=sez.startDate?new Date(sez.startDate).getFullYear():yil, y2=sez.endDate?new Date(sez.endDate).getFullYear():yil, yillar=[];
    if(sez.endDate && new Date(sez.endDate).getMonth()<1 && y2>y1) y2--; // bitişi 1 Ocak olan sezon tek yıllıktır
    for(var y=y1;y<=y2;y++) yillar.push(y);
    return Promise.all(yillar.map(function(y){ return getJSON(SITE+slug+'/scoreboard?dates='+y+'&limit=1000').catch(function(e){ gunluk('yıl alınamadı',y,e.message); return null; }); })).then(function(ys){
      var gor={}, es=[];
      ys.concat([sb]).forEach(function(j){ ((j&&j.events)||[]).forEach(function(ev){
        if(gor[ev.id]) return; var e=esAl(ev,'');
        if(e.sezon && e.sezon!==yil) return; if(!e.h.id||!e.a.id||isNaN(e.date)) return;
        gor[ev.id]=1; es.push(e);
      }); });
      if(!es.length) throw new Error('Bu lig için maç bulunamadı');
      var teams={};
      function takimEkle(t){ if(!t.id||teams['t'+t.id]) return; teams['t'+t.id]={id:'t'+t.id, name:t.full||t.name, shortName:t.name, logo:t.logo||'', color:t.color?'#'+t.color:'', espn:t.id}; }
      var tl=r[1]&&r[1].sports&&r[1].sports[0]&&r[1].sports[0].leagues&&r[1].sports[0].leagues[0]&&r[1].sports[0].leagues[0].teams;
      var oynayan={}; es.forEach(function(e){ oynayan[e.h.id]=1; oynayan[e.a.id]=1; });
      (tl||[]).forEach(function(x){ var t=x.team||{}; if(!oynayan[t.id]) return;
        takimEkle({id:String(t.id), full:trAd(t.displayName||t.name), name:trAd(t.shortDisplayName||t.displayName), logo:(t.logos&&t.logos[0]&&t.logos[0].href)||'', color:t.color}); });
      es.forEach(function(e){ takimEkle(e.h); takimEkle(e.a); });
      var hf=haftalariBul(es, Object.keys(teams).length), matches={};
      es.forEach(function(e){ matches['m'+e.rid]=macNesnesi(e, hf[e.rid]); });
      k.veri={slug:slug, lid:String(lg.id||''), ad:LIG_AD[slug]||lg.name||slug, sezon:sezonAdi(sez)||String(yil), yil:yil,
        logo:(lg.logos&&lg.logos[0]&&lg.logos[0].href)||'', teams:teams, matches:matches, notlar:bolgeNotlari(r[2])};
      k.t=Date.now(); k.yukleniyor=null;
      gunluk('lig yüklendi', slug, Object.keys(teams).length+' takım', es.length+' maç');
      return k.veri;
    });
  }).catch(function(e){ k.yukleniyor=null; throw e; });
  return k.yukleniyor;
}

/* ---------- puan durumu bölgeleri (Şampiyonlar Ligi, küme düşme...) ---------- */
var BOLGE_TR=[[/champions league qual/i,'Şampiyonlar Ligi Elemesi','#3b82f6'],[/champions league/i,'Şampiyonlar Ligi','#2563eb'],[/europa league qual/i,'Avrupa Ligi Elemesi','#f59e0b'],[/europa league/i,'Avrupa Ligi','#f97316'],
 [/conference league qual/i,'Konferans Ligi Elemesi','#10b981'],[/conference league/i,'Konferans Ligi','#059669'],[/relegation play/i,'Küme Düşme Play-off','#fb923c'],[/relegat/i,'Küme Düşme','#ef4444'],
 [/promotion play/i,'Yükselme Play-off','#22d3ee'],[/promot/i,'Yükselme','#22c55e'],[/play-?offs?/i,'Play-off','#a78bfa'],[/round of 16|knockout/i,'Üst Tur','#22c55e'],[/libertadores/i,'Libertadores','#2563eb'],[/sudamericana/i,'Sudamericana','#f59e0b'],[/eliminat/i,'Elendi','#ef4444']];
function bolgeNotlari(j){
  try{
    var gr=(j&&j.children&&j.children.length)?j.children:[j||{}];
    if(gr.length!==1) return [];           // gruplu turnuvalarda tek tablo bölgesi anlamsız
    var en=((gr[0].standings&&gr[0].standings.entries)||[]).slice();
    var sira=function(e){ var s=(e.stats||[]).filter(function(x){ return x.name==='rank'; })[0]; return s?+(s.value!=null?s.value:s.displayValue):0; };
    en.sort(function(a,b){ return sira(a)-sira(b); });
    var out=[], cur=null;
    en.forEach(function(e,i){
      var d=e.note&&e.note.description, pos=i+1;
      if(!d){ cur=null; return; }
      var tr=null; for(var k=0;k<BOLGE_TR.length;k++) if(BOLGE_TR[k][0].test(d)){ tr=BOLGE_TR[k]; break; }
      var etiket=tr?tr[1]:d, renk=tr?tr[2]:((e.note.color&&/^#?[0-9a-f]{6}$/i.test(e.note.color))?('#'+String(e.note.color).replace('#','')):'#3b82f6');
      if(cur&&cur.label===etiket&&cur.to===pos-1) cur.to=pos; else { cur={from:pos,to:pos,color:renk,label:etiket}; out.push(cur); }
    });
    return out;
  }catch(e){ return []; }
}

/* ---------- yerel ağaca yerleştirme ---------- */
function ligBelgesi(v){
  return {leagueName:v.ad, season:v.sezon, logoUrl:v.logo||null, teams:v.teams, matches:v.matches,
    lgConfig:{winPts:3, drawPts:1}, rankNotes:v.notlar||[], sbGercek:{slug:v.slug, t:Date.now()}};
}
function agacaYaz(v){
  var id=ligKimlik(v.slug), eski=YerelVT.ham('leagues/'+id)||{}, b=ligBelgesi(v);
  // kullanıcının bu ligde cihazında tuttuğu şeyler (ziyaretçi kaydı vb.) korunur
  Object.keys(eski).forEach(function(k){ if(!(k in b)) b[k]=eski[k]; });
  YerelVT.yaz('leagues/'+id, b);
}
function metaYaz(){
  var meta={}, i=0;
  aktifLigler().forEach(function(l){ i++; meta[ligKimlik(l[0])]={name:LIG_AD[l[0]]||l[1], status:'active', createdAt:1000000-i, sbSlug:l[0], sira:i}; });
  YerelVT.yaz('leaguesMeta', meta);
  YerelVT.yaz('activeDisplayLeague', ligKimlik(A.lig));
}
function ligiAc(slug){
  return ligYukle(slug).then(function(v){ agacaYaz(v); return v; });
}

/* ---------- giriş: ayrı uygulamada hesap yok; cihazdaki adla doğrudan açılır ---------- */
function girisYap(){
  var n=0, z=setInterval(function(){
    n++;
    try{
      if(typeof _curLeagueId!=='undefined' && _curLeagueId && typeof doEnterAfterPasswordCheck==='function'){
        clearInterval(z);
        var ad=A.ad||'Misafir';
        var chk=document.getElementById('rememberMeChk'); if(chk) chk.checked=false;
        doEnterAfterPasswordCheck(ad);
        gunluk('giriş yapıldı', ad);
      }
    }catch(e){ gunluk('giriş hatası', e.message); clearInterval(z); }
    if(n>200) clearInterval(z);
  }, 100);
}

function ligSec(slug){
  if(!kimliktenSlug(ligKimlik(slug))) return;
  A.lig=slug; ayarYaz();
  var id=ligKimlik(slug);
  if(!YerelVT.ham('leagues/'+id)) YerelVT.yaz('leagues/'+id, {leagueName:LIG_AD[slug]||slug, season:'', teams:{}, matches:{}, lgConfig:{winPts:3,drawPts:1}});
  YerelVT.yaz('activeDisplayLeague', id);
  try{ _curLeagueId=id; localStorage.setItem('pt_curLeague', id); try{ ptElleSezonYaz(id); }catch(e){} listenToLeague(id); }catch(e){ gunluk('lig değiştirilemedi', e.message); }
  window._tickerStructSig=null;
  return ligiAc(slug).then(function(v){ try{ showToast((v.ad||'Lig')+' yüklendi'); }catch(e){} dongu(); return v; },
    function(e){ try{ showToast('Lig verisi alınamadı: '+e.message,'er'); }catch(x){} });
}

/* ---------- bugünün maçları: alt şerit bütün liglerin o günkü maçlarını ve canlı skorları gösterir ---------- */
var B={liste:[], t:0, imza:'', yukleniyor:false};
function bugunYukle(kovalar){
  var bu=gunBas(new Date()), hepsi=[gunEkle(bu,-1),bu,gunEkle(bu,1)].map(ymd), iste=kovalar||hepsi;
  return Promise.all(iste.map(function(k){
    return getJSON(SITE+'all/scoreboard?dates='+k+'&limit=1000').then(function(j){ return {k:k, l:((j&&j.events)||[]).map(function(ev){ return esAl(ev,k); })}; }, function(){ return null; });
  })).then(function(rs){
    var ok=rs.filter(Boolean); if(!ok.length) throw new Error('yanıt yok');
    var gelen={}, gor={}, out=[];
    ok.forEach(function(r){ gelen[r.k]=1; });
    B.liste.forEach(function(e){ if(!gelen[e.kova]&&ayniGun(e.date,bu)&&!gor[e.rid]){ gor[e.rid]=1; out.push(e); } });
    ok.forEach(function(r){ r.l.forEach(function(e){ if(gor[e.rid]||!e.h.id||!e.a.id||isNaN(e.date)||!ayniGun(e.date,bu)) return; gor[e.rid]=1; out.push(e); }); });
    B.liste=out; B.t=Date.now();
    return out;
  });
}
function seritListe(){
  var l=B.liste, v=L[A.lig]&&L[A.lig].veri;
  if(A.serit==='secili' && v) l=l.filter(function(e){ return e.lid===v.lid; });
  var sira={in:0,pre:1,post:2};
  return l.slice().sort(function(x,y){ return (sira[x.state]-sira[y.state])||(x.date-y.date)||(x.rid<y.rid?-1:1); });
}
window.__sbSerit={
  on:function(){ return B.liste.length>0; },
  matches:function(){ return seritListe().map(function(e){ var c=e.state==='in', b=e.state==='post'&&!/POSTPONED|CANCEL/.test(e.sname);
    return {id:'m'+e.rid, homeId:'t'+e.h.id, awayId:'t'+e.a.id, homeGoals:+e.h.score||0, awayGoals:+e.a.score||0, played:b, isLive:c, week:0, time:p2(e.date.getHours())+':'+p2(e.date.getMinutes())}; }); },
  teams:function(){ var t={}; B.liste.forEach(function(e){ t['t'+e.h.id]={id:'t'+e.h.id,name:e.h.name,logo:e.h.logo}; t['t'+e.a.id]={id:'t'+e.a.id,name:e.a.name,logo:e.a.logo}; }); return t; }
};
function seritCiz(){ try{ if(typeof renderLiveTicker==='function') renderLiveTicker(); }catch(e){} }

/* ---------- seçili ligin maçlarını güncelle (yalnızca değişen maç ağaca yazılır) ---------- */
function macImza(m){ return [m.played,m.isLive,m.homeGoals,m.awayGoals,m.minute,m.isHalftime,m.date,m.time,(m.events||[]).length,m.note||''].join('|'); }
function ligeIsle(es){
  var v=L[A.lig]&&L[A.lig].veri; if(!v) return 0;
  var id=ligKimlik(A.lig), n=0;
  es.forEach(function(e){
    if(v.lid && e.lid && e.lid!==v.lid) return;
    var eski=v.matches['m'+e.rid]; if(!eski) return;
    var once=macImza(eski), kopya=JSON.parse(JSON.stringify(eski));
    var yeni=macNesnesi(e, eski.week, kopya);
    if(macImza(yeni)===once) return;
    v.matches['m'+e.rid]=yeni; n++;
    YerelVT.yaz('leagues/'+id+'/matches/m'+e.rid, yeni);
  });
  return n;
}

/* ---------- maç özeti: hakem, stat, istatistik, kadro, ayrıntılı olaylar ---------- */
var O={};  // maç kimliği -> {t, yukleniyor}
var MEVKI_KOD=[[/^G/,'KL'],[/^(CD|SW|D$|DC)/,'STP'],[/^LB|^LWB/,'SLB'],[/^RB|^RWB/,'SĞB'],[/^DM/,'DOS'],[/^(CM|M$)/,'MOS'],[/^AM-?L|^LM/,'SLO'],[/^AM-?R|^RM/,'SĞO'],[/^AM/,'OOS'],[/^LW|^LF/,'SLA'],[/^RW|^RF/,'SĞA'],[/^(F|CF|ST|S$)/,'SF']];
function mevkiKod(k, say){
  k=String(k||'').toUpperCase();
  for(var i=0;i<MEVKI_KOD.length;i++) if(MEVKI_KOD[i][0].test(k)){
    var c=MEVKI_KOD[i][1];
    if(c==='STP'){ say.stp=(say.stp||0)+1; return say.stp%2?'STP1':'STP2'; }
    if(c==='SF'){ say.sf=(say.sf||0)+1; return say.sf>1?'GF':'SF'; }
    if(c==='MOS'){ say.mos=(say.mos||0)+1; return say.mos%2?'MOS':'OOS'; }
    return c;
  }
  return 'OOS';
}
function evet(v){ return v===true || !!(v&&v.didSub); }
function ozetIsle(mid, j){
  var v=L[A.lig]&&L[A.lig].veri; if(!v) return;
  var m=v.matches[mid]; if(!m) return;
  var m2=JSON.parse(JSON.stringify(m)), hId=String(m.homeId).slice(1), aId=String(m.awayId).slice(1);
  var gi=j.gameInfo||{};
  var hk=(gi.officials||[])[0]; if(hk&&(hk.fullName||hk.displayName)) m2.referee=hk.fullName||hk.displayName;
  if(gi.venue&&(gi.venue.fullName||gi.venue.shortName)) m2.stadium=gi.venue.fullName||gi.venue.shortName;
  if(gi.attendance) m2.attendance=gi.attendance;
  var yayin=(j.broadcasts||[]).map(function(b){ return (b.media&&b.media.shortName)||b.station||(b.names&&b.names[0])||''; }).filter(Boolean);
  if(yayin.length) m2.tv=yayin.slice(0,2).join(', ');
  // istatistik
  var ts=j.boxscore&&j.boxscore.teams;
  if(ts&&ts.length>=2){
    var al=function(tid){ var t=ts.filter(function(x){ return x.team&&String(x.team.id)===tid; })[0]; if(!t) return null; var o={}; (t.statistics||[]).forEach(function(s){ o[s.name]=parseFloat(s.displayValue); });
      var r={sahiplik:o.possessionPct, sut:o.totalShots, isabet:o.shotsOnTarget, pas:o.totalPasses, isabetliPas:o.accuratePasses, kurtaris:o.saves, korner:o.wonCorners, faul:o.foulsCommitted, ofsayt:o.offsides,
             // (2026-11-16) ESPN'in verdiği ama önceden kullanılmayan istatistikler
             engellenen:o.blockedShots, topKapma:o.effectiveTackles, uzaklastirma:o.totalClearance, pasIsabet:(o.passPct!=null&&!isNaN(o.passPct)?Math.round(o.passPct*(o.passPct<=1?100:1)):null)};
      Object.keys(r).forEach(function(k){ if(r[k]==null||isNaN(r[k])) delete r[k]; }); return Object.keys(r).length?r:null; };
    var sh=al(hId), sa=al(aId);
    if(sh&&sa) m2.sahaStats={home:sh, away:sa};
  }
  // kadro
  var kadro={};
  (j.rosters||[]).forEach(function(r){
    var taraf=(r.team&&String(r.team.id)===hId)?'home':((r.team&&String(r.team.id)===aId)?'away':null); if(!taraf||!r.roster||!r.roster.length) return;
    var say={}, l=[];
    r.roster.forEach(function(p){
      var at=p.athlete||{}, girdi=!p.starter&&evet(p.subbedIn);
      if(!p.starter&&!girdi) return;
      var o={name:at.displayName||at.shortName||'?', position:mevkiKod(p.position&&p.position.abbreviation, say)};
      if(p.jersey) o.number=+p.jersey||p.jersey;
      if(girdi) o.girdi=true;
      l.push(o);
    });
    if(l.length){ kadro[taraf]=l; if(r.formation){ m2[taraf==='home'?'homeFormation':'awayFormation']=r.formation; } }
  });
  if(kadro.home||kadro.away) m2.sahaKadro=kadro;
  // olaylar (oyuncu değişiklikleri dahil)
  var ke=(j.keyEvents||[]).map(function(k){
    var tur=olayTuru(k); if(!tur||k.shootout) return null;
    var ps=(k.participants||[]).map(function(p){ return (p.athlete&&(p.athlete.displayName||p.athlete.shortName))||''; });
    var tid=String((k.team&&k.team.id)||'');
    var o={type:tur, min:dk(k.clock&&k.clock.displayValue), team:(tid===aId?'away':'home'), player:ps[0]||''};
    if(tur==='sub'){ o.player2=ps[1]||''; }
    return o;
  }).filter(Boolean);
  if(ke.length>=(m2.events||[]).filter(function(e){ return e.type!=='sub'; }).length){ m2.events=ke; m2._ozet=1; }
  if(JSON.stringify(m2)===JSON.stringify(m)) return;
  v.matches[mid]=m2;
  YerelVT.yaz('leagues/'+ligKimlik(A.lig)+'/matches/'+mid, m2);
}
function ozetIste(mid){
  var v=L[A.lig]&&L[A.lig].veri, m=v&&v.matches[mid]; if(!m||!m.espn) return;
  if(!m.played&&!m.isLive&&(new Date(m.date+'T'+(m.time||'00:00'))-Date.now())>3*3600*1000) return;   // başlamasına çok var: özet boş
  var c=O[mid]||(O[mid]={t:0});
  if(c.yukleniyor) return;
  if(c.t && (!m.isLive||Date.now()-c.t<15000) && !(m.played&&!m._ozet&&Date.now()-c.t>60000)) return;
  c.yukleniyor=true;
  getJSON(SITE+'all/summary?event='+m.espn).then(function(j){ c.t=Date.now(); ozetIsle(mid, j); }, function(e){ c.t=Date.now(); gunluk('özet alınamadı', mid, e.message); })
    .then(function(){ c.yukleniyor=false; });
}
/* ---------- takım kadrosu: lig kadro listesi + takımın son maçındaki ilk 11 ---------- */
var K={};  // takım kimliği -> {t, yukleniyor}
var DIZILIS={'4-4-2':1,'4-3-3':1,'4-2-3-1':1,'5-3-2':1,'4-3-2-1':1};
function kadroIste(tid){
  var slug=A.lig, v=L[slug]&&L[slug].veri, t=v&&v.teams[tid]; if(!t||!t.espn) return;
  var c=K[slug+tid]||(K[slug+tid]={t:0});
  if(c.yukleniyor || (c.t && Date.now()-c.t<SEZON_TAZE)) return;
  c.yukleniyor=true;
  var son=Object.keys(v.matches).map(function(k){ return v.matches[k]; }).filter(function(m){ return m.played&&(m.homeId===tid||m.awayId===tid); })
    .sort(function(x,y){ return (x.date+x.time)<(y.date+y.time)?1:-1; })[0];
  Promise.all([
    getJSON(SITE+slug+'/teams/'+t.espn+'/roster').catch(function(){ return null; }),
    son?getJSON(SITE+'all/summary?event='+son.espn).catch(function(){ return null; }):Promise.resolve(null)
  ]).then(function(r){
    c.t=Date.now();
    if(L[slug].veri!==v) return;
    var liste=(r[0]&&r[0].athletes)||[], say={}, hepsi={}, sira=[];
    liste.forEach(function(a){
      var o={name:a.displayName||a.fullName||'?', position:mevkiKod(a.position&&a.position.abbreviation, say)};
      if(a.jersey) o.number=+a.jersey||a.jersey;
      if(a.headshot&&a.headshot.href) o.photo=a.headshot.href;
      if(a.age) o.age=a.age;
      if(a.citizenship) o.nat=trAd(a.citizenship);
      hepsi[o.name]=o; sira.push(o);
    });
    var ilk=[], dizilis='';
    var ro=r[1]&&(r[1].rosters||[]).filter(function(x){ return x.team&&String(x.team.id)===t.espn; })[0];
    if(ro&&ro.roster){ var s2={}; dizilis=ro.formation||'';
      ro.roster.forEach(function(p){ if(!p.starter) return; var at=p.athlete||{}, ad=at.displayName||at.shortName||'?', o=hepsi[ad]||{name:ad};
        o=JSON.parse(JSON.stringify(o)); o.position=mevkiKod(p.position&&p.position.abbreviation, s2); if(!o.number&&p.jersey) o.number=+p.jersey||p.jersey; ilk.push(o); }); }
    if(!sira.length&&!ilk.length) return;
    var ilkAd={}; ilk.forEach(function(o){ ilkAd[o.name]=1; });
    var t2=JSON.parse(JSON.stringify(v.teams[tid]));
    t2.squad={starting:ilk, bench:sira.filter(function(o){ return !ilkAd[o.name]; })};
    if(DIZILIS[dizilis]) t2.formation=dizilis;
    v.teams[tid]=t2;
    YerelVT.yaz('leagues/'+ligKimlik(slug)+'/teams/'+tid, t2);
  }).then(function(){ c.yukleniyor=false; }, function(){ c.yukleniyor=false; });
}
function acikMac(){ try{ return (typeof _mdMatchId!=='undefined'&&_mdMatchId)||null; }catch(e){ return null; } }

/* ---------- döngüler: canlı maç 5 sn, bugünün tamamı canlı varken 20 sn / yokken 60 sn, hepsi 5 dk ---------- */
var zH=null, zB=null, sonTam=0, hMesgul=false;
function ligCanli(){
  var v=L[A.lig]&&L[A.lig].veri; if(!v) return false; var now=Date.now();
  return Object.keys(v.matches).some(function(k){ var m=v.matches[k]; if(m.isLive) return true; if(m.played) return false;
    var t=new Date(m.date+'T'+(m.time||'00:00')).getTime(); return t-now<90000 && now-t<3*3600*1000; });
}
function hizli(){
  clearTimeout(zH);
  if(document.hidden) return;
  var mid=acikMac(); if(mid) ozetIste(mid);
  if(!ligCanli()||hMesgul){ zH=setTimeout(hizli, ligCanli()?HIZLI:15000); return; }
  hMesgul=true;
  getJSON(SITE+A.lig+'/scoreboard').then(function(j){ ligeIsle(((j&&j.events)||[]).map(function(ev){ return esAl(ev,''); })); }, function(){})
    .then(function(){ hMesgul=false; zH=setTimeout(hizli, HIZLI); });
}
function bugunDongu(){
  clearTimeout(zB);
  if(document.hidden) return;
  if(B.yukleniyor){ zB=setTimeout(bugunDongu, 5000); return; }
  var canli=B.liste.some(function(e){ return e.state==='in'; }), acik=B.liste.some(function(e){ return e.state!=='post'; });
  var tam=!B.t || Date.now()-sonTam>300000, kovalar=null;
  if(!tam){ var k={}; B.liste.forEach(function(e){ if(e.state!=='post'&&e.kova) k[e.kova]=1; }); kovalar=Object.keys(k); if(!kovalar.length) kovalar=null; }
  if(!kovalar) sonTam=Date.now();
  B.yukleniyor=true;
  bugunYukle(kovalar).then(function(l){ ligeIsle(l); var im=seritListe().map(function(e){ return e.rid+e.state+e.h.score+e.a.score; }).join('|'); if(im!==B.imza){ B.imza=im; seritCiz(); } },
    function(e){ gunluk('bugünün maçları alınamadı', e.message); })
   .then(function(){ B.yukleniyor=false; var c=B.liste.some(function(e){ return e.state==='in'; }); zB=setTimeout(bugunDongu, c?20000:60000); });
}
function dongu(){ hizli(); bugunDongu(); }
document.addEventListener('visibilitychange', function(){ if(!document.hidden) dongu(); });

/* ---------- Ayarlar > Skorbord: lig seçici ve şerit ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function ayarBolumu(){
  var sel='border-radius:10px;border:1px solid var(--br);background:var(--s3);color:var(--tx);padding:.55rem;width:100%;font-size:.8rem;font-family:inherit';
  var obek={}, sira=[];
  aktifLigler().forEach(function(l){ if(!obek[l[2]]){ obek[l[2]]=[]; sira.push(l[2]); } obek[l[2]].push(l); });
  var ops=sira.map(function(o){ return '<optgroup label="'+esc(o)+'">'+obek[o].map(function(l){ return '<option value="'+esc(l[0])+'"'+(l[0]===A.lig?' selected':'')+'>'+esc(LIG_AD[l[0]]||l[1])+'</option>'; }).join('')+'</optgroup>'; }).join('');
  var seritAcik=false; try{ seritAcik=!!_liveTickerEnabled; }catch(e){}
  return '<div id="sbAyarBolum"><div style="font-size:.68rem;font-weight:800;color:var(--mu);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.04em">Skorbord</div>'+
   '<div style="background:var(--s2);border-radius:12px;padding:.75rem .85rem;margin-bottom:.9rem">'+
   '<div style="font-size:.7rem;color:var(--mu);margin:0 0 .3rem">Lig</div><select id="sbLigSec" style="'+sel+'" onchange="Gercek.ligSec(this.value)">'+ops+'</select>'+
   '<div style="font-size:.7rem;color:var(--mu);margin:.7rem 0 .3rem">Alt şerit</div><select style="'+sel+'" onchange="Gercek.ayarla(\'serit\',this.value)">'+
     [['hepsi','Bugünün bütün maçları ve canlı skorlar'],['secili','Yalnızca seçili lig']].map(function(x){ return '<option value="'+x[0]+'"'+(A.serit===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select>'+
   '<label style="display:flex;align-items:center;gap:.55rem;padding:.6rem 0 .1rem;font-size:.8rem"><input type="checkbox" style="width:17px;height:17px;accent-color:var(--ac)"'+(seritAcik?' checked':'')+' onchange="Gercek.ayarla(\'seritAcik\',this.checked)"> Alt şerit açık</label>'+
   '<button type="button" onclick="Gercek.yenile()" style="margin-top:.6rem;width:100%;border-radius:10px;border:1px solid var(--br);background:var(--s3);color:var(--tx);padding:.55rem;font-size:.8rem;font-weight:700;font-family:inherit">Veriyi şimdi yenile</button>'+
   '<div style="font-size:.66rem;color:var(--mu);margin-top:.5rem;line-height:1.5">Veri: ESPN açık skor servisi. Canlı maçlar '+Math.round(HIZLI/1000)+' saniyede bir yenilenir.</div>'+
   '</div></div>';
}
function ayarla(k,v){
  if(k==='serit'){ A.serit=v; ayarYaz(); B.imza=''; window._tickerStructSig=null; seritCiz(); }
  else if(k==='seritAcik'){ try{ _liveTickerEnabled=!!v; localStorage.setItem('pt_liveTicker', v?'on':'off'); seritCiz(); }catch(e){} }
}
function yenile(){
  try{ showToast('Veri yenileniyor…'); }catch(e){}
  sonTam=0; B.t=0;
  ligYukle(A.lig, true).then(function(v){ agacaYaz(v); try{ showToast('Veri güncellendi'); }catch(e){} }, function(e){ try{ showToast('Veri alınamadı: '+e.message,'er'); }catch(x){} });
  bugunDongu();
}
function ayarKancasi(){
  var os=window.openSettings; if(typeof os!=='function'||os._sb) return;
  window.openSettings=function(){
    var r=os.apply(this, arguments);
    try{ var scn=document.getElementById('sheetContent');
      if(scn&&!document.getElementById('sbAyarBolum')){ var t=scn.children[1]||scn.children[0], d=document.createElement('div'); d.innerHTML=ayarBolumu();
        if(t&&t.parentNode) t.parentNode.insertBefore(d.firstChild, t.nextSibling); else scn.appendChild(d.firstChild); } }catch(e){ gunluk('ayar bölümü eklenemedi', e.message); }
    return r;
  };
  window.openSettings._sb=1;
}

/* ---------- yönetici ayarları: duyuru, bakım, görünen ligler, varsayılan lig, yenileme hızı ---------- */
function uzakUygula(d){
  var eski=JSON.stringify(U); U=(d&&typeof d==='object')?d:{};
  if(JSON.stringify(U)===eski) return;
  var sn=+U.canliYenileSn; HIZLI=(sn>=3&&sn<=60)?sn*1000:5000;
  // (2026-11-16) Admin › Skorbord paneli: lig adı ve takım adı düzeltmeleri, şerit varsayılanları.
  var adImza=adlariUygula();
  if(_ilkAcilis){
    if(U.seritVarsayilan==='hepsi'||U.seritVarsayilan==='secili'){ A.serit=U.seritVarsayilan; ayarYaz(); }
    if(typeof U.seritAcikVarsayilan==='boolean'){ try{ if(localStorage.getItem('pt_liveTicker')===null){ _liveTickerEnabled=U.seritAcikVarsayilan; localStorage.setItem('pt_liveTicker', U.seritAcikVarsayilan?'on':'off'); } }catch(e){} }
  }
  try{ metaYaz(); }catch(e){}
  if(adImza!==_adImza){ var ilk=_adImza===null; _adImza=adImza; if(!ilk||adImza!==''){ sonTam=0; ligYukle(A.lig, true).then(agacaYaz, function(){}); } }
  // Görünen ligler dışında kalan lig seçiliyse ya da bu cihazda ilk açılışsa yöneticinin varsayılan ligine geçilir.
  var hedef=null;
  if(!ligAktifMi(A.lig)) hedef=(U.varsayilanLig&&ligAktifMi(U.varsayilanLig))?U.varsayilanLig:aktifLigler()[0][0];
  else if(_ilkAcilis&&U.varsayilanLig&&U.varsayilanLig!==A.lig&&ligAktifMi(U.varsayilanLig)) hedef=U.varsayilanLig;
  _ilkAcilis=false;
  if(hedef){ try{ ligSec(hedef); }catch(e){} }
  duyuruCiz(); bakimCiz();
}
var LIG_AD0=JSON.parse(JSON.stringify(LIG_AD)), TR_AD0=JSON.parse(JSON.stringify(TR_AD)), _adImza=null;
/* ligAdlari: {"tur_1":"Trendyol Süper Lig"}; takimAdlari: [{espn:"Istanbul Basaksehir", tr:"RAMS Başakşehir"}] (Firebase anahtarında nokta olamadığından liste). */
function adlariUygula(){
  Object.keys(LIG_AD0).forEach(function(k){ LIG_AD[k]=LIG_AD0[k]; });
  Object.keys(TR_AD).forEach(function(k){ if(!(k in TR_AD0)) delete TR_AD[k]; else TR_AD[k]=TR_AD0[k]; });
  var la=(U.ligAdlari&&typeof U.ligAdlari==='object')?U.ligAdlari:{}, ta=U.takimAdlari, imza=[];
  LIGLER.forEach(function(l){ var v=la[l[0].replace(/\./g,'_')]; if(typeof v==='string'&&v.trim()){ LIG_AD[l[0]]=v.trim().slice(0,60); imza.push(l[0]+'='+LIG_AD[l[0]]); } });
  (Array.isArray(ta)?ta:(ta&&typeof ta==='object'?Object.keys(ta).map(function(k){ return ta[k]; }):[])).forEach(function(x){
    if(x&&typeof x.espn==='string'&&typeof x.tr==='string'&&x.espn.trim()&&x.tr.trim()){ TR_AD[x.espn.trim()]=x.tr.trim().slice(0,60); imza.push(x.espn+'='+x.tr); } });
  return imza.join('|');
}
function duyuruCiz(){
  var d=U.duyuru||{}, id='sbDuyuru', el=document.getElementById(id), imza=String(d.metin||'')+'|'+(d.ts||'');
  var kapali=false; try{ kapali=localStorage.getItem('sb_duyuruKapat')===imza; }catch(e){}
  if(!d.acik||!d.metin||kapali){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id=id; el.style.cssText='position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2147483000;display:flex;gap:.6rem;align-items:flex-start;padding:.7rem .85rem;border-radius:14px;color:#fff;font:600 .82rem/1.45 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)'; document.body.appendChild(el); }
  el.style.background=d.renk||'#2563eb';
  el.innerHTML='<div style="flex:1;min-width:0;white-space:pre-wrap">'+esc(d.metin)+'</div><button type="button" aria-label="Kapat" style="background:none;border:0;color:#fff;font-size:1.2rem;line-height:1;cursor:pointer;padding:0 .2rem">×</button>';
  el.querySelector('button').onclick=function(){ try{ localStorage.setItem('sb_duyuruKapat', imza); }catch(e){} el.remove(); };
}
function bakimCiz(){
  var b=U.bakim||{}, id='sbBakim', el=document.getElementById(id);
  if(!b.acik){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id=id; el.style.cssText='position:fixed;inset:0;z-index:2147483001;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;padding:2rem;text-align:center;background:var(--bg,#0a0a0f);color:var(--tx,#fff);font-family:system-ui,sans-serif'; document.body.appendChild(el); }
  el.innerHTML='<div style="font-size:2.4rem">⏳</div><div style="font-size:1.15rem;font-weight:900">Skorbord bakımda</div><div style="font-size:.86rem;opacity:.8;max-width:360px;white-space:pre-wrap">'+esc(b.mesaj||'Kısa bir süre sonra tekrar deneyin.')+'</div>';
}
function uzakDinle(){
  var al=function(){ return fetch(UZAK_URL,{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(uzakUygula, function(){}); };
  al();
  try{
    if(window.EventSource){ var es=new EventSource(UZAK_URL), say=0;
      var yenile=function(){ al(); };   // değişiklik bildirimi gelince tamamını yeniden oku (küçük belge)
      es.addEventListener('put', yenile); es.addEventListener('patch', yenile);
      es.onerror=function(){ if(++say>5){ try{ es.close(); }catch(e){} setInterval(al, 5*60000); } };
      return;
    }
  }catch(e){}
  setInterval(al, 5*60000);
}
function baslat(){
  if(!kimliktenSlug(ligKimlik(A.lig))){ A.lig='tur.1'; ayarYaz(); }
  uzakDinle();
  metaYaz();
  // lig belgesi gelene kadar arayüz boş bir sezon görür
  YerelVT.yaz('leagues/'+ligKimlik(A.lig), {leagueName:LIG_AD[A.lig]||A.lig, season:'', teams:{}, matches:{}, lgConfig:{winPts:3,drawPts:1}});
  try{ localStorage.setItem('pt_curLeague', ligKimlik(A.lig)); }catch(e){}
  girisYap(); ayarKancasi();
  // maç detayı açılınca özeti hemen iste (hakem, istatistik, kadro)
  try{ var sm=window.showMatchDetail; if(typeof sm==='function'&&!sm._sb){ window.showMatchDetail=function(id){ var r=sm.apply(this,arguments); try{ ozetIste(id); var v=L[A.lig]&&L[A.lig].veri, m=v&&v.matches[id]; if(m){ kadroIste(m.homeId); kadroIste(m.awayId); } }catch(e){} return r; }; window.showMatchDetail._sb=1; } }catch(e){}
  try{ var st=window.showTeamDetail; if(typeof st==='function'&&!st._sb){ window.showTeamDetail=function(tid){ var r=st.apply(this,arguments); try{ kadroIste(tid); }catch(e){} return r; }; window.showTeamDetail._sb=1; } }catch(e){}
  ligiAc(A.lig).then(function(){ dongu(); }, function(e){ gunluk('lig alınamadı', e.message); window.Gercek.hata=e.message; try{ showToast('Lig verisi alınamadı: '+e.message,'er'); }catch(x){} setTimeout(function(){ ligiAc(A.lig).then(dongu,function(){}); }, 15000); });
  bugunDongu();
}

window.Gercek={ayar:A, ligler:LIGLER, ligYukle:ligYukle, ligiAc:ligiAc, ligSec:ligSec, ayarla:ayarla, yenile:yenile, ozetIste:ozetIste, kadroIste:kadroIste, L:L, B:B, hata:''};
baslat();
})();
