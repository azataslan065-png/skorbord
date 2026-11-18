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

/* ---------- ligler: [kısa ad, Türkçe ad, ülke/öbek, (TheSportsDB lig no)] ; sıra = seçicideki sıra ----------
   (2026-11-18, kullanıcı: "yüklenmeyen ligleri kaldırmak değil, düzeltip ekstra ligler eklemek"). Teşhis (.github/arac/lig-dene.js):
   · TFF 1. Lig ve İsviçre Süper Lig ESPN'de yok (ESPN'in lig listesinde değiller, eski sezonda kalmışlar) → TheSportsDB'den (4. alan).
   · Suudi Arabistan'ın ESPN adı "ksa.1" (eskisi "sau.1" hata veriyordu).
   · Ek ligler: ESPN'in futbol listesindeki diğer ulusal ligler ve büyük turnuvalar; TFF 2. Lig TheSportsDB'den. */
var LIGLER=[
 ['tur.1','Süper Lig','Türkiye'],['tur.2','TFF 1. Lig','Türkiye','4676'],['tur.3','TFF 2. Lig','Türkiye','4679'],
 ['uefa.champions','UEFA Şampiyonlar Ligi','Avrupa'],['uefa.europa','UEFA Avrupa Ligi','Avrupa'],['uefa.europa.conf','UEFA Konferans Ligi','Avrupa'],['uefa.super_cup','UEFA Süper Kupa','Avrupa'],
 ['eng.1','İngiltere Premier Lig','İngiltere'],['eng.2','İngiltere Championship','İngiltere'],['eng.3','İngiltere League One','İngiltere'],['eng.4','İngiltere League Two','İngiltere'],['eng.5','İngiltere National League','İngiltere'],
 ['esp.1','İspanya La Liga','İspanya'],['esp.2','İspanya La Liga 2','İspanya'],
 ['ita.1','İtalya Serie A','İtalya'],['ita.2','İtalya Serie B','İtalya'],
 ['ger.1','Almanya Bundesliga','Almanya'],['ger.2','Almanya 2. Bundesliga','Almanya'],
 ['fra.1','Fransa Ligue 1','Fransa'],['fra.2','Fransa Ligue 2','Fransa'],
 ['ned.1','Hollanda Eredivisie','Hollanda'],['ned.2','Hollanda Eerste Divisie','Hollanda'],
 ['por.1','Portekiz Primeira Liga','Portekiz'],['bel.1','Belçika Pro Lig','Belçika'],
 ['sco.1','İskoçya Premiership','İskoçya'],['sco.2','İskoçya Championship','İskoçya'],
 ['gre.1','Yunanistan Süper Lig','Yunanistan'],['rus.1','Rusya Premier Lig','Rusya'],['aut.1','Avusturya Bundesliga','Avusturya'],['sui.1','İsviçre Süper Lig','İsviçre','4675'],
 ['den.1','Danimarka Superliga','Danimarka'],['nor.1','Norveç Eliteserien','Norveç'],['swe.1','İsveç Allsvenskan','İsveç'],
 ['ksa.1','Suudi Arabistan Pro Lig','Asya'],['jpn.1','Japonya J1 Lig','Asya'],['chn.1','Çin Süper Lig','Asya'],['ind.1','Hindistan Süper Lig','Asya'],['aus.1','Avustralya A-League','Asya'],
 ['usa.1','ABD MLS','Amerika'],['mex.1','Meksika Liga MX','Amerika'],['mex.2','Meksika Liga de Expansión','Amerika'],
 ['bra.1','Brezilya Serie A','Amerika'],['bra.2','Brezilya Serie B','Amerika'],['arg.1','Arjantin Primera','Amerika'],['arg.2','Arjantin Primera Nacional','Amerika'],
 ['col.1','Kolombiya Primera A','Amerika'],['chi.1','Şili Primera División','Amerika'],['uru.1','Uruguay Primera División','Amerika'],['ecu.1','Ekvador LigaPro','Amerika'],
 ['per.1','Peru Liga 1','Amerika'],['par.1','Paraguay Primera División','Amerika'],['bol.1','Bolivya Primera División','Amerika'],['crc.1','Kosta Rika Primera División','Amerika'],
 ['rsa.1','Güney Afrika Premiership','Afrika'],
 ['conmebol.libertadores','Copa Libertadores','Kıtalar arası'],['conmebol.sudamericana','Copa Sudamericana','Kıtalar arası'],['caf.champions','CAF Şampiyonlar Ligi','Kıtalar arası'],
 ['afc.champions','AFC Şampiyonlar Ligi Elite','Kıtalar arası'],['concacaf.champions','CONCACAF Şampiyonlar Kupası','Kıtalar arası'],['fifa.cwc','FIFA Kulüpler Dünya Kupası','Kıtalar arası'],
 ['fifa.world','FIFA Dünya Kupası','Milli'],['uefa.euro','UEFA Avrupa Şampiyonası','Milli'],['uefa.nations','UEFA Uluslar Ligi','Milli'],['uefa.euroq','Avrupa Şampiyonası Elemeleri','Milli'],
 ['fifa.worldq.uefa','Dünya Kupası Elemeleri (Avrupa)','Milli'],['fifa.worldq.conmebol','Dünya Kupası Elemeleri (Güney Amerika)','Milli'],['fifa.worldq.afc','Dünya Kupası Elemeleri (Asya)','Milli'],
 ['fifa.worldq.caf','Dünya Kupası Elemeleri (Afrika)','Milli'],['fifa.worldq.concacaf','Dünya Kupası Elemeleri (CONCACAF)','Milli'],
 ['conmebol.america','Copa América','Milli'],['caf.nations','Afrika Uluslar Kupası','Milli'],['afc.asian.cup','AFC Asya Kupası','Milli'],['concacaf.gold','CONCACAF Altın Kupa','Milli'],['concacaf.nations.league','CONCACAF Uluslar Ligi','Milli']
];
var LIG_AD={}, TSDB_LIG={}; LIGLER.forEach(function(l){ LIG_AD[l[0]]=l[1]; if(l[3]) TSDB_LIG[l[0]]=l[3]; });

/* ---------- VERİ DOSYASI (2026-11-18): veri/<lig>.json - GitHub'daki günlük görevin (.github/arac/veri-topla.js) ürettiği ek veri:
   kulüp kuruluş tarihi, stadyum, kupalar (Wikidata, kuruluştan bu yana), geçmiş sezonlar (ESPN arşivi), oyuncu fotoğrafları (Wikimedia
   Commons, yazar + lisans), ESPN'de olmayan liglerin maçları (TheSportsDB). Uygulama yalnızca bu dosyayı okur. ---------- */
var VD={};
function veriAl(slug, taze){
  var c=VD[slug]||(VD[slug]={t:0});
  if(c.p && !taze) return c.p;
  if(c.j && !taze && Date.now()-c.t<10*60000) return Promise.resolve(c.j);
  c.p=fetch(new URL('veri/'+slug+'.json?t='+Math.floor(Date.now()/60000), location.href).href, {cache:'no-store'})
    .then(function(r){ return r.ok?r.json():null; }).then(function(j){ c.p=null; if(j){ c.j=j; c.t=Date.now(); } return c.j||null; }, function(){ c.p=null; return c.j||null; });
  return c.p;
}
window.__sbVeri=function(){ var c=VD[A.lig]; return c&&c.j||null; };
/* TheSportsDB maçı -> ESPN ara biçimi (esAl çıktısıyla aynı alanlar) */
function tsdbE(m){
  var bitti=/finish|^ft$|aet|pen|after/i.test(m.d||'') || (m.evG!=null && Date.now()-Date.parse(m.z)>3*3600e3);
  var ert=/postp|cancel|abandon|susp/i.test(m.d||'');
  var canli=!bitti && !ert && m.evG!=null;
  var taraf=function(id, ad, logo, g){ return {id:String(id), name:trAd(ad), full:trAd(ad), logo:logo||'', score:g==null?null:String(g), color:'', alt:''}; };
  return {rid:'ts'+m.id, lid:'', date:new Date(m.z), state:bitti?'post':(canli?'in':'pre'), sname:ert?(/cancel/i.test(m.d)?'STATUS_CANCELED':'STATUS_POSTPONED'):'', clock:'', period:0, sezon:0, kova:'',
    h:taraf(m.ev, m.evAd, m.evLogo, m.evG), a:taraf(m.dep, m.depAd, m.depLogo, m.depG), evs:[], stad:m.st||'', not:'', tsdb:true, hafta:m.r};
}
function tsdbYukle(slug, k){
  return veriAl(slug, true).then(function(j){
    if(!j || !(j.mac||[]).length) throw new Error('Bu lig için maç bulunamadı (veri dosyası henüz hazır değil)');
    var teams={}, matches={};
    Object.keys(j.takim||{}).forEach(function(id){ var t=j.takim[id]; teams['t'+id]={id:'t'+id, name:trAd(t.ad), shortName:trAd(t.kisa||t.ad), logo:t.logo||'', color:'', tsdb:id}; });
    j.mac.forEach(function(m){ var e=tsdbE(m); if(isNaN(e.date)) return; var o=macNesnesi(e, m.r); o.espn=null; o.tsdb=m.id; matches['m'+e.rid]=o; });
    k.veri={slug:slug, lid:'', ad:LIG_AD[slug]||j.ad||slug, sezon:j.sezonAdi||'', yil:j.yil, logo:'', teams:teams, matches:matches, notlar:[], gruplar:null, tsdb:true};
    k.t=Date.now(); k.yukleniyor=null;
    gunluk('lig yüklendi (TheSportsDB)', slug, Object.keys(teams).length+' takım', j.mac.length+' maç');
    return k.veri;
  });
}
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
var MEVKI={G:'Kaleci',D:'Defans',M:'Orta Alan',F:'Forvet'};

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
  veriAl(slug);   // ek veri (kupa, kuruluş, fotoğraf) arka planda
  if(TSDB_LIG[slug]){ k.yukleniyor=tsdbYukle(slug, k).catch(function(e){ k.yukleniyor=null; throw e; }); return k.yukleniyor; }
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
        logo:(lg.logos&&lg.logos[0]&&lg.logos[0].href)||'', teams:teams, matches:matches, notlar:bolgeNotlari(r[2]), gruplar:gruplariAl(r[2], teams)};
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

/* ---------- GRUPLAR (2026-11-16, kullanıcı: "sıralama stabil görünmüyor" - UEFA Uluslar Ligi ekran görüntüsü). KÖK SEBEP: gruplu
   turnuvalarda (Uluslar Ligi, Dünya Kupası elemeleri...) bütün gruplar tek tabloda hesaplanıyordu: 54 takım farklı maç sayılarıyla tek
   sırada, sıra okları (▼5, ▲8) başka grupların maçlarıyla oynuyordu. Artık ESPN'in grup listesi alınır, puan durumu grup grup gösterilir
   (üstte grup seçici); sıra, ok ve hesap yalnızca o grubun takımlarıyla yapılır. ---------- */
function grupAdi(a){
  a=String(a||'').trim(); var m;
  if((m=/^League ([A-D])\s*,?\s*Group (\d+)$/i.exec(a))) return m[1].toUpperCase()+' Ligi · '+m[2]+'. Grup';
  if((m=/^Group ([A-Z0-9]+)$/i.exec(a))) return m[1].toUpperCase()+' Grubu';
  if((m=/^League ([A-D])$/i.exec(a))) return m[1].toUpperCase()+' Ligi';
  return a.replace(/\bGroup\b/i,'Grup').replace(/\bLeague\b/i,'Lig');
}
function gruplariAl(j, teams){
  try{
    var ust=(j&&j.children)||[], gr=[];
    var topla=function(c){ if(c&&c.children&&c.children.length){ c.children.forEach(topla); return; }
      var en=(c&&c.standings&&c.standings.entries)||[], ids=[];
      en.forEach(function(e){ var id=e&&e.team&&e.team.id; if(id&&teams['t'+id]) ids.push('t'+id); });
      if(ids.length) gr.push({ad:grupAdi(c.name||c.abbreviation), takimlar:ids}); };
    ust.forEach(topla);
    return gr.length>1?gr:null;
  }catch(e){ return null; }
}
var GRUP_AK='sb_grup';
function seciliGrup(gr){ var s=''; try{ s=JSON.parse(localStorage.getItem(GRUP_AK)||'{}')[A.lig]||''; }catch(e){} return gr.some(function(g){ return g.ad===s; })?s:gr[0].ad; }
window.__sbGrupTakim=function(teams){
  try{ var gr=window.D&&D.sbGruplar; if(!Array.isArray(gr)||gr.length<2) return teams;
    var g=gr.filter(function(x){ return x.ad===seciliGrup(gr); })[0]; if(!g) return teams;
    var o={}; g.takimlar.forEach(function(id){ if(teams[id]) o[id]=teams[id]; }); return Object.keys(o).length?o:teams;
  }catch(e){ return teams; }
};
window.__sbGrupSecici=function(){
  try{ var gr=window.D&&D.sbGruplar; if(!Array.isArray(gr)||gr.length<2) return '';
    var s=seciliGrup(gr);
    return '<div class="sb-grup-sec" style="display:flex;gap:.35rem;overflow-x:auto;padding:.1rem 0 .6rem;touch-action:pan-x;scrollbar-width:none">'+gr.map(function(g){ var a=g.ad===s;
      return '<button type="button" onclick="Gercek.grupSec(\''+esc(g.ad).replace(/'/g,"\\'")+'\')" style="flex:0 0 auto;padding:.38rem .7rem;border-radius:999px;font:inherit;font-size:.68rem;font-weight:700;cursor:pointer;border:1.5px solid '+(a?'var(--ac)':'var(--br)')+';background:'+(a?'var(--ac)':'var(--s2)')+';color:'+(a?'#fff':'var(--tx)')+'">'+esc(g.ad)+'</button>'; }).join('')+'</div>';
  }catch(e){ return ''; }
};
function grupSec(ad){ try{ var o=JSON.parse(localStorage.getItem(GRUP_AK)||'{}'); o[A.lig]=ad; localStorage.setItem(GRUP_AK, JSON.stringify(o)); }catch(e){} try{ renderStandings(); var b=document.querySelector('.sb-grup-sec button[style*="var(--ac)"]'); if(b&&b.scrollIntoView) b.scrollIntoView({inline:'center',block:'nearest'}); }catch(e){} }
/* Sıra numarası iki basamakta kesiliyordu (20 → "2(") ve takım adı uzunluğuna göre farklı boyda yazılıyordu: sabit genişlik ve tek boy. */
(function(){ try{ var st=document.createElement('style'); st.textContent='#pg-standings .st-row .rank-num{width:auto!important;flex:0 0 auto!important;min-width:2.2ch!important;overflow:visible!important;font-variant-numeric:tabular-nums;letter-spacing:-.03em}'
  +'#pg-standings .st-row .team-name-cell{font-size:.7rem!important}#pg-standings .st-row .t-logo-sm{object-fit:contain}.sb-grup-sec::-webkit-scrollbar{display:none}'; (document.head||document.documentElement).appendChild(st); }catch(e){} })();


/* ---------- KUPA DOLABI (2026-11-18, kullanıcı: "1903'te kurulan bu kulüp ve diğerleri kupa dolapları boş"). KÖK SEBEP: Skorbord'un
   kupa dolabı uygulamada kayıtlı geçmiş sezonlardan hesaplanır; Skorbord'da yalnızca bu sezon vardı. Artık veri dosyasından:
   · Kuruluş (gün ay yıl) ve stadyum: Wikidata + Vikipedi bilgi kutusu.
   · Kupalar: Wikidata'da kulübün kazandığı bütün turnuva sezonları - kuruluşundan bu yana, turnuva turnuva.
   · 2./3., en iyi sıra, sezonlar: ESPN puan durumu arşivi (arşivin başladığı yıldan beri; başlangıç yılı yazılır) + bu sezonun canlı sırası. ---------- */
var AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function kurulusYaz(k){ if(!k||!k.y) return ''; return (k.g?k.g+' ':'')+(k.a?AYLAR[k.a-1]+' ':'')+k.y; }
function takimVeri(tid){
  var j=window.__sbVeri(); if(!j) return null; var t=window.D&&D.teams&&D.teams[tid]; if(!t) return null;
  var k=t.espn||t.tsdb; if(!k) return null;
  var v=JSON.parse(JSON.stringify((j.takim||{})[k]||{}));
  // Admin düzeltmesi (Admin › Skorbord kaynağı › Kulüp bilgisi düzeltme): skorbord/duzeltme/<lig>/<takım>
  try{ var d=YerelVT.uzak('duzeltme/'+A.lig.replace(/\./g,'_')+'/'+k);
    if(d){ if(d.kur&&d.kur.y) v.kur=d.kur; if(d.stad) v.stad=d.stad; if(d.kap) v.kap=d.kap;
      (d.kupaEk||[]).forEach(function(x){ if(!x||!x.ad) return; var var_=(v.kupa=v.kupa||[]).filter(function(y){ return y.ad===x.ad; })[0];
        if(var_){ (x.sz||[]).forEach(function(z){ if(var_.sz.indexOf(z)<0) var_.sz.push(z); }); var_.sz.sort(); } else v.kupa.push({ad:x.ad, sz:(x.sz||[]).slice().sort()}); });
      if(v.kupa) v.kupa.sort(function(a,b){ return b.sz.length-a.sz.length; }); } }catch(_){}
  return {j:j, v:v, k:String(k)};
}
window.__sbKupaHtml=function(tid){
  try{
    var j=window.__sbVeri();
    if(!j){ var yer='sbKupa_'+tid; veriAl(A.lig).then(function(x){ var el=document.getElementById(yer); if(el&&x) el.outerHTML=window.__sbKupaHtml(tid); }); return '<div id="'+yer+'" class="empty" style="padding:1.2rem;text-align:center">Kupa dolabı hazırlanıyor…</div>'; }
    var tv=takimVeri(tid), v=(tv&&tv.v)||{}, key=tv?tv.k:'';
    var e=esc, md=function(n){ return n+'.'; };
    var h='';
    // kulüp kimliği
    if(v.kur&&v.kur.k==='Federasyon'&&/^(UEFA|FIFA|CONMEBOL|CAF|AFC|CONCACAF|OFC|Union of European)/i.test(v.kur.fed||'')) delete v.kur;   // kıta federasyonu ulusal federasyon sanılmasın
    var kur=kurulusYaz(v.kur), bilgi=[];
    if(kur) bilgi.push('<span><small>'+(v.kur&&v.kur.k==='Federasyon'?'Federasyon kuruluşu':'Kuruluş')+'</small><b>'+e(kur)+'</b></span>');
    if(v.stad) bilgi.push('<span><small>Stadyum</small><b>'+e(v.stad)+(v.kap?' · '+v.kap.toLocaleString('tr-TR'):'')+'</b></span>');
    if(bilgi.length) h+='<div class="sb-kulup">'+bilgi.join('')+'</div>';
    // raf: turnuva turnuva kupalar
    // Yaş grubu / olimpiyat turnuvaları A takımının kupası değildir (Wikidata'da bazen A takımına bağlanmış)
    var GENC=/(\d\d\s*Yaş|\bU-?\d\d\b|Under-?\s?\d\d|Youth|Gençl|Olimpiyat|Olympic|Kadın|Women)/i;
    var kupa=(v.kupa||[]).filter(function(x){ return x.sz&&x.sz.length&&!GENC.test(x.ad); }), topKupa=kupa.reduce(function(a,x){ return a+x.sz.length; },0);
    h+='<div class="ptk-raf">'+(kupa.length?kupa.map(function(x){
        return '<details class="sb-kupa"><summary><span class="sb-kupa-n">'+x.sz.length+'</span><b>'+e(x.ad)+'</b></summary><div class="sb-kupa-sz">'+x.sz.slice().reverse().map(e).join(' · ')+'</div></details>';
      }).join(''):'<div style="opacity:.8;font-size:.72rem;padding:.6rem;text-align:center;width:100%;color:#fff">'+(v.wd?'Kayıtlı kupa bulunamadı.':'Bu kulübün kupa bilgisi bulunamadı.')+'</div>')+'</div>';
    // arşiv: bu ligdeki geçmiş sezonlar + bu sezon
    var G=j.gecmis||{}, yillar=Object.keys(G).map(Number).sort(function(a,b){ return a-b; }), sz=[];
    yillar.forEach(function(y){ var r=(G[y].satir||[]).filter(function(x){ return x.t===key; })[0]; if(r) sz.push({ad:G[y].ad, y:y, s:r.s, P:r.P, O:r.O, G:r.G, B:r.B, M:r.M, AG:r.AG, YG:r.YG, n:(G[y].satir||[]).length, grup:r.g, bitti:true}); });
    try{ var st=calcS(D.teams||{}, D.matches||{}), i=st.findIndex(function(x){ return x.id===tid; }); if(i>=0){ var x=st[i]; var bitti=Object.keys(D.matches||{}).length&&Object.keys(D.matches).every(function(k){ return D.matches[k].played; });
      sz.push({ad:j.sezonAdi||D.season||'Bu sezon', y:9999, s:i+1, P:x.P, O:x.O, G:x.G, B:x.B, M:x.M, AG:x.AG, YG:x.YG, n:st.length, bitti:bitti, simdi:true}); } }catch(_){}
    var biten=sz.filter(function(z){ return z.bitti; }), say=function(n){ return biten.filter(function(z){ return z.s===n&&!z.grup; }).length; };
    var top=sz.reduce(function(a,z){ a.O+=z.O; a.G+=z.G; a.B+=z.B; a.M+=z.M; a.AG+=z.AG; a.YG+=z.YG; return a; },{O:0,G:0,B:0,M:0,AG:0,YG:0});
    var enIyi=sz.filter(function(z){ return !z.grup; }).reduce(function(a,z){ return a==null||z.s<a?z.s:a; },null), rekor=sz.reduce(function(a,z){ return a==null||z.P>a.P?z:a; },null);
    var ilkYil=yillar.length?(G[yillar[0]].ad):'';
    h+='<div class="ptk-ist"><span><b>'+topKupa+'</b>Kupa</span><span><b>'+say(1)+'</b>Lig 1.liği'+(ilkYil?'*':'')+'</span><span><b>'+say(2)+' / '+say(3)+'</b>2. / 3.'+(ilkYil?'*':'')+'</span>'
      +'<span><b>'+(enIyi?md(enIyi):'—')+'</b>En iyi sıra'+(ilkYil?'*':'')+'</span><span><b>'+sz.length+'</b>Sezon'+(ilkYil?'*':'')+'</span><span><b>'+top.O+'</b>Maç'+(ilkYil?'*':'')+'</span>'
      +'<span><b>'+top.G+'-'+top.B+'-'+top.M+'</b>G-B-M'+(ilkYil?'*':'')+'</span><span><b>'+top.AG+':'+top.YG+'</b>Gol'+(ilkYil?'*':'')+'</span><span><b>'+(rekor?rekor.P:'—')+'</b>Sezon rekor puan'+(ilkYil?'*':'')+'</span></div>';
    if(ilkYil) h+='<div style="font-size:.6rem;color:var(--mu);margin:.2rem 0 .5rem">* Bu ligdeki sezonlar, '+e(ilkYil)+' sezonundan bu yana ('+e(j.kaynak==='TheSportsDB'?'TheSportsDB':'ESPN')+' arşivi). Kupa sayısı kuruluştan bu yana bütün turnuvaları kapsar.</div>';
    h+='<div class="md-section-head" style="margin-top:.7rem">Sezonlar</div>'
      +sz.slice().reverse().map(function(z){ var sam=z.bitti&&z.s===1&&!z.grup;
        return '<details class="ptk-sz'+(sam?' sam':'')+'"><summary><span class="ptk-sr">'+md(z.s)+'</span><div style="flex:1;min-width:0"><b>'+e(z.ad)+(sam?' · Şampiyon':'')+(z.grup?' · '+e(z.grup):'')+'</b><small>'
          +(z.simdi?(z.bitti?'Tamamlandı':'Devam ediyor · şu anki sıra'):'Tamamlandı')+' · '+z.n+' takım · '+z.O+' maç · '+z.G+'G '+z.B+'B '+z.M+'M</small></div><b class="ptk-p">'+z.P+'<small> P</small></b></summary>'
          +'<div class="ptk-det"><div><small>Gol</small><b>'+z.AG+':'+z.YG+' ('+(z.AG-z.YG>0?'+':'')+(z.AG-z.YG)+')</b></div><div><small>Puan ortalaması</small><b>'+(z.O?(z.P/z.O).toFixed(2):'—')+'</b></div></div></details>';
      }).join('')
      +'<div style="font-size:.58rem;color:var(--mu);margin-top:.6rem;line-height:1.5">Kaynak: Wikidata, Vikipedi'+(j.kaynak==='TheSportsDB'?', TheSportsDB':', ESPN')+'. Eksik ya da hatalı bir bilgi görürsen geri bildirimle bildirebilirsin.</div>';
    return h;
  }catch(err){ gunluk('kupa dolabı', err&&err.message); return null; }
};
(function(){ try{ var st=document.createElement('style'); st.textContent='.sb-kulup{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.6rem}.sb-kulup span{background:var(--s2);border:1px solid var(--br);border-radius:12px;padding:.5rem .65rem;display:flex;flex-direction:column;gap:.15rem;min-width:0}'
  +'.sb-kulup small{font-size:.6rem;color:var(--mu);font-weight:700;text-transform:uppercase;letter-spacing:.04em}.sb-kulup b{font-size:.78rem;overflow:hidden;text-overflow:ellipsis}'
  +'.sb-kupa{flex:1 1 140px;min-width:140px;background:rgba(0,0,0,.18);border:1px solid rgba(251,191,36,.35);border-radius:12px;padding:.45rem .55rem;color:#fff}.sb-kupa summary{list-style:none;display:flex;align-items:center;gap:.5rem;cursor:pointer}'
  +'.sb-kupa summary::-webkit-details-marker{display:none}.sb-kupa-n{font-size:1.15rem;font-weight:900;color:#fbbf24;min-width:1.6em;text-align:center}.sb-kupa b{font-size:.72rem;line-height:1.25}.sb-kupa-sz{font-size:.62rem;opacity:.85;margin-top:.35rem;line-height:1.5}'
  +'.ptk-raf{flex-wrap:wrap}.sb-foto-not{font-size:.55rem;color:var(--mu);text-align:center;margin:-.35rem 0 .5rem;line-height:1.4}.sb-foto-not a{color:inherit}';
  (document.head||document.documentElement).appendChild(st); }catch(e){} })();

/* ---------- yerel ağaca yerleştirme ---------- */
function ligBelgesi(v){
  return {leagueName:v.ad, season:v.sezon, logoUrl:v.logo||null, teams:v.teams, matches:v.matches,
    lgConfig:{winPts:3, drawPts:1}, rankNotes:v.notlar||[], sbGruplar:v.gruplar||null, sbGercek:{slug:v.slug, t:Date.now()}};
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
  var v=L[A.lig]&&L[A.lig].veri, m=v&&v.matches[mid]; if(!m||!m.espn||m.tsdb) return;
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
/* ESPN'de olmayan liglerin kadrosu: veri dosyasındaki Wikidata kadrosu (kulübün güncel oyuncuları, mevki, forma no, fotoğraf). */
var MEVKI_WD=[[/kaleci|goalkeeper/i,'KL'],[/defans|defender|stoper|bek|back/i,'STP'],[/orta|midfield/i,'MOS'],[/forvet|forward|striker|kanat|wing/i,'SF']];
function tsdbKadro(slug, tid){
  var v=L[slug]&&L[slug].veri, t=v&&v.teams[tid]; if(!t||!t.tsdb) return;
  var c=K[slug+tid]||(K[slug+tid]={t:0}); if(c.yukleniyor||(c.t&&Date.now()-c.t<SEZON_TAZE)) return; c.yukleniyor=true;
  veriAl(slug).then(function(j){
    c.t=Date.now(); var l=(j&&j.kadro&&j.kadro[t.tsdb])||[]; if(!l.length||L[slug].veri!==v) return;
    var say={}, kod=function(m){ for(var i=0;i<MEVKI_WD.length;i++) if(MEVKI_WD[i][0].test(m||'')) return mevkiKod(MEVKI_WD[i][1]==='KL'?'G':MEVKI_WD[i][1]==='STP'?'CD':MEVKI_WD[i][1]==='MOS'?'CM':'F', say); return ''; };
    var sira=l.map(function(a){ var o={name:a.ad, position:kod(a.mevki)}; if(a.no) o.number=a.no; if(a.yas) o.age=a.yas; if(a.uyruk) o.nat=trAd(a.uyruk);
      if(a.foto&&a.foto.f){ o.photo=a.foto.f; o.photoCredit=(a.foto.y?a.foto.y+' · ':'')+(a.foto.l||'')+' · Wikimedia Commons'; o.photoSource=a.foto.u||''; } return o; });
    var t2=JSON.parse(JSON.stringify(v.teams[tid])); t2.squad={starting:[], bench:sira}; v.teams[tid]=t2;
    YerelVT.yaz('leagues/'+ligKimlik(slug)+'/teams/'+tid, t2);
  }).then(function(){ c.yukleniyor=false; }, function(){ c.yukleniyor=false; });
}
function kadroIste(tid){
  var slug=A.lig, v=L[slug]&&L[slug].veri, t=v&&v.teams[tid]; if(t&&t.tsdb) return tsdbKadro(slug, tid); if(!t||!t.espn) return;
  var c=K[slug+tid]||(K[slug+tid]={t:0});
  if(c.yukleniyor || (c.t && Date.now()-c.t<SEZON_TAZE)) return;
  c.yukleniyor=true;
  var son=Object.keys(v.matches).map(function(k){ return v.matches[k]; }).filter(function(m){ return m.played&&(m.homeId===tid||m.awayId===tid); })
    .sort(function(x,y){ return (x.date+x.time)<(y.date+y.time)?1:-1; })[0];
  Promise.all([
    getJSON(SITE+slug+'/teams/'+t.espn+'/roster').catch(function(){ return null; }),
    son?getJSON(SITE+'all/summary?event='+son.espn).catch(function(){ return null; }):Promise.resolve(null),
    veriAl(slug)
  ]).then(function(r){
    c.t=Date.now();
    if(L[slug].veri!==v) return;
    var liste=(r[0]&&r[0].athletes)||[], say={}, hepsi={}, sira=[];
    liste.forEach(function(a){
      var o={name:a.displayName||a.fullName||'?', position:mevkiKod(a.position&&a.position.abbreviation, say)};
      if(a.jersey) o.number=+a.jersey||a.jersey;
      if(a.headshot&&a.headshot.href) o.photo=a.headshot.href;
      else { var vf=(VD[slug]&&VD[slug].j&&VD[slug].j.foto||{})[String(a.id)]; if(vf&&vf.f){ o.photo=vf.f; o.photoCredit=(vf.y?vf.y+' · ':'')+(vf.l||'')+' · Wikimedia Commons'; o.photoSource=vf.u||''; } }
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
  if(TSDB_LIG[A.lig]){ veriAl(A.lig, true).then(function(j){ if(j&&j.mac) ligeIsle(j.mac.map(tsdbE)); }).then(function(){ hMesgul=false; zH=setTimeout(hizli, 60000); }); return; }
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

/* ═══ ANA EKRAN (2026-11-18, kullanıcı: "ilk girişte kayıtlı bütün ligler böyle sıralanmalı, ilgili ligin kartına tıklayınca böyle görünmeli
   ve admin ilgili alanda hangi ligin sıralamasını yapabileceğini seçebilmeli" - iki ekran görüntüsü: gün gün lig kartları; lig sayfası).
   · Uygulama açılınca seçili günün bütün maçları lig lig kartlarda: başlıkta bayrak / lig logosu, "Ülke - Lig" ve yıldız (ligi üste sabitle);
     satırda saat (canlıda dakika, bitince MS), ev sahibi, skor ya da "v", deplasman ve yıldız (favori maç → en üstte "Favorilerim").
   · Lig başlığına dokununca o ligin sayfası açılır (puan durumu, fikstür, form, istatistik...). Üstteki geri / logo ana ekrana döndürür;
     telefonun geri tuşu da lig sayfasından ana ekrana döner.
   · Hangi liglerin hangi sırayla görüneceğini admin seçer (Admin › Skorbord kaynağı › Ana ekran ligleri → skorbord/anasayfa/ligler).
     Admin seçmediyse bütün ligler uygulamadaki sırayla. Maçı olmayan ligler altta "Bu gün maçı olmayan ligler" listesinde.
   · Maçlar her ligin kendi skor servisinden (ESPN) ya da veri dosyasından (TheSportsDB ligleri) gelir; canlı maç varken 30 sn'de bir yenilenir. */
var ANA={gun:0, acik:true, kume:{}, yukleniyor:false, z:0, imza:''};
var LIG_BUL={}; LIGLER.forEach(function(l){ LIG_BUL[l[0]]=l; });
var ULKE_KOD={'Türkiye':1,'İngiltere':1,'İspanya':1,'İtalya':1,'Almanya':1,'Fransa':1,'Hollanda':1,'Portekiz':1,'Belçika':1,'İskoçya':1,'Yunanistan':1,'Rusya':1,'Avusturya':1,'İsviçre':1,'Danimarka':1,'Norveç':1,'İsveç':1};
var KOD_AD={ksa:'Suudi Arabistan',jpn:'Japonya',chn:'Çin',ind:'Hindistan',aus:'Avustralya',usa:'ABD',mex:'Meksika',bra:'Brezilya',arg:'Arjantin',col:'Kolombiya',chi:'Şili',uru:'Uruguay',ecu:'Ekvador',per:'Peru',par:'Paraguay',bol:'Bolivya',crc:'Kosta Rika',rsa:'Güney Afrika'};
function ligUlke(slug){ var l=LIG_BUL[slug]; if(!l) return ''; var k=slug.split('.')[0]; if(ULKE_KOD[l[2]]) return l[2]; return KOD_AD[k]||''; }
function ligBaslik(slug){ var l=LIG_BUL[slug], u=ligUlke(slug), ad=LIG_AD[slug]||(l&&l[1])||slug; var kisa=u?ad.replace(new RegExp('^'+u.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+'),''):ad; return u?u+' - '+kisa:ad; }
function ligBayrak(slug){ var k=slug.split('.')[0]; return (ligUlke(slug)&&/^[a-z]{3}$/.test(k))?'https://a.espncdn.com/i/teamlogos/countries/500/'+k+'.png':''; }
function anaLigler(){ var a=null; try{ a=YerelVT.uzak('anasayfa'); }catch(e){} var l=(a&&Array.isArray(a.ligler)&&a.ligler.length)?a.ligler:LIGLER.map(function(x){ return x[0]; }); return l.filter(function(s){ return !!LIG_BUL[s]; }); }
var FAV_AK='sb_fav';
function favOku(){ try{ var f=JSON.parse(localStorage.getItem(FAV_AK)||'{}'); return {lig:f.lig||{}, mac:f.mac||{}}; }catch(e){ return {lig:{}, mac:{}}; } }
function favYaz(f){ try{ localStorage.setItem(FAV_AK, JSON.stringify(f)); }catch(e){} }
function gunTarih(ofs){ var d=gunBas(new Date()); return gunEkle(d, ofs); }
function anaGunAd(ofs){ if(ofs===0) return 'Bugün'; if(ofs===-1) return 'Dün'; if(ofs===1) return 'Yarın'; var d=gunTarih(ofs); return ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'][d.getDay()]+' '+d.getDate(); }
var AMERIKA=/^(usa|mex|bra|arg|col|chi|uru|ecu|per|par|bol|crc)\.|conmebol|concacaf|worldq\.(conmebol|concacaf)/;
function anaLigYukle(slug, ofs){
  var gun=gunTarih(ofs), anah=slug+'|'+ofs, c=ANA.kume[anah]||(ANA.kume[anah]={t:0, l:[], logo:''});
  if(c.p) return c.p;
  if(TSDB_LIG[slug]){
    c.p=veriAl(slug).then(function(j){ c.p=null; c.t=Date.now(); c.l=((j&&j.mac)||[]).map(tsdbE).filter(function(e){ return !isNaN(e.date)&&ayniGun(e.date,gun); }); return c; });
    return c.p;
  }
  var gunler=[ymd(gun)]; if(AMERIKA.test(slug)) gunler.push(ymd(gunEkle(gun,-1)));   // Amerika'nın akşam maçları bizde ertesi günün sabahı
  c.p=Promise.all(gunler.map(function(d){ return getJSON(SITE+slug+'/scoreboard?dates='+d).catch(function(){ return null; }); })).then(function(rs){
    c.p=null; c.t=Date.now(); var gor={}, l=[];
    rs.forEach(function(j){ if(!j) return; var lg=(j.leagues||[])[0]; if(lg&&lg.logos&&lg.logos[0]&&!c.logo) c.logo=lg.logos[0].href;
      (j.events||[]).forEach(function(ev){ var e=esAl(ev,''); if(gor[e.rid]||isNaN(e.date)||!ayniGun(e.date,gun)) return; gor[e.rid]=1; l.push(e); }); });
    c.l=l; return c;
  });
  return c.p;
}
function anaYukle(zorla){
  var ofs=ANA.gun, ligler=anaLigler(), i=0, kosan=0, sonuc=Promise.resolve();
  ANA.yukleniyor=true; anaCiz();
  return new Promise(function(bitti){
    var sira=ligler.filter(function(s){ var c=ANA.kume[s+'|'+ofs]; if(!c||zorla) return true; var canli=c.l.some(function(e){ return e.state==='in'||(e.state==='pre'&&e.date-Date.now()<15*60000&&Date.now()-e.date<3*3600e3); }); return (Date.now()-c.t)>(canli?25000:10*60000); });
    if(!sira.length){ ANA.yukleniyor=false; anaCiz(); bitti(); return; }
    var n=0, ciz=0;
    function sonraki(){
      if(i>=sira.length){ if(!kosan){ ANA.yukleniyor=false; anaCiz(); bitti(); } return; }
      var s=sira[i++]; kosan++;
      anaLigYukle(s, ofs).then(function(){}, function(){}).then(function(){ kosan--; n++; if(ofs===ANA.gun && (n%6===0||n===sira.length)) anaCiz(); sonraki(); });
    }
    for(var k=0;k<8;k++) sonraki();
  });
}
function anaSatir(e, slug, fav){
  var canli=e.state==='in', bitti=e.state==='post', ert=/POSTPONED|CANCEL/.test(e.sname||'');
  var sol=canli?'<b class="sba-dk">'+esc(e.clock?(dk(e.clock)||'')+"'":'Canlı')+'</b>':ert?'<span class="sba-ert">'+(/CANCEL/.test(e.sname)?'İptal':'Ert.')+'</span>':bitti?'<span class="sba-ms">MS</span>':esc(p2(e.date.getHours())+':'+p2(e.date.getMinutes()));
  var orta=(canli||bitti)?'<b class="sba-skor'+(canli?' canli':'')+'">'+esc(e.h.score==null?'-':e.h.score)+' - '+esc(e.a.score==null?'-':e.a.score)+'</b>':'<span class="sba-v">v</span>';
  var hk=bitti&&+e.h.score>+e.a.score, ak=bitti&&+e.a.score>+e.h.score;
  return '<div class="sba-mac" onclick="Gercek.anaMacAc(\''+esc(slug)+'\',\''+esc(e.rid)+'\')"><span class="sba-saat">'+sol+'</span><span class="sba-ev'+(hk?' kaz':'')+'">'+esc(trAd(e.h.name||e.h.full))+'</span>'+orta+'<span class="sba-dep'+(ak?' kaz':'')+'">'+esc(trAd(e.a.name||e.a.full))+'</span>'
    +'<button type="button" class="sba-yil'+(fav.mac[e.rid]?' on':'')+'" aria-label="Favori maç" onclick="event.stopPropagation();Gercek.anaFavMac(\''+esc(e.rid)+'\',\''+esc(slug)+'\')">'+(fav.mac[e.rid]?'★':'☆')+'</button></div>';
}
function anaKart(slug, l, fav, logo){
  var b=ligBayrak(slug), img=b||logo||'';
  return '<div class="sba-kart"><div class="sba-bas" onclick="Gercek.anaLigAc(\''+esc(slug)+'\')">'+(img?'<img class="sba-bay" src="'+esc(img)+'" alt="" onerror="'+(logo&&b?'this.onerror=null;this.src=\''+esc(logo)+'\'':'this.style.visibility=\'hidden\'')+'">':'<span class="sba-bay"></span>')
    +'<span class="sba-ad">'+esc(ligBaslik(slug))+'</span><button type="button" class="sba-yil bas'+(fav.lig[slug]?' on':'')+'" aria-label="Ligi sabitle" onclick="event.stopPropagation();Gercek.anaFavLig(\''+esc(slug)+'\')">'+(fav.lig[slug]?'★':'☆')+'</button></div>'
    +l.map(function(e){ return anaSatir(e, slug, fav); }).join('')+'</div>';
}
function anaCiz(){
  var el=document.getElementById('sbAna'); if(!el||!ANA.acik) return;
  try{ var lo=document.getElementById('loginLoadingOverlay'); if(lo&&lo.style.display!=='none') lo.style.display='none'; }catch(e){}   // lig sayfasının açılış bekleme ekranı ana ekranı örtmesin
  var fav=favOku(), ofs=ANA.gun, ligler=anaLigler();
  var sab=ligler.filter(function(s){ return fav.lig[s]; }), dig=ligler.filter(function(s){ return !fav.lig[s]; }), sira=sab.concat(dig);
  var dolu=[], bos=[], favMac=[];
  sira.forEach(function(s){ var c=ANA.kume[s+'|'+ofs]; if(!c||!c.t){ return; } var l=c.l.slice().sort(function(a,b){ return a.date-b.date; });
    l.forEach(function(e){ if(fav.mac[e.rid]) favMac.push([s,e]); });
    if(l.length) dolu.push(anaKart(s, l, fav, c.logo)); else bos.push(s); });
  var bekleyen=sira.filter(function(s){ var c=ANA.kume[s+'|'+ofs]; return !c||!c.t; }).length;
  var gunler=''; for(var g=-3; g<=4; g++) gunler+='<button type="button" class="sba-gun'+(g===ofs?' on':'')+'" onclick="Gercek.anaGun('+g+')">'+anaGunAd(g)+'</button>';
  var h='<div class="sba-ust"><img src="app-icon-192.png" alt="" class="sba-logo"><b>Skorbord</b><span style="flex:1"></span>'
    +'<button type="button" class="sba-btn" title="Yenile" onclick="Gercek.anaYenile()">⟳</button><button type="button" class="sba-btn" title="Ayarlar" onclick="try{openSettings()}catch(e){}">⚙</button></div>'
    +'<div class="sba-gunler">'+gunler+'</div><div class="sba-ic">';
  if(favMac.length) h+='<div class="sba-kart fav"><div class="sba-bas"><span class="sba-bay yildiz">★</span><span class="sba-ad">Favorilerim</span></div>'+favMac.map(function(x){ return anaSatir(x[1], x[0], fav); }).join('')+'</div>';
  h+=dolu.join('');
  if(!dolu.length&&!bekleyen) h+='<div class="sba-bos">'+esc(anaGunAd(ofs))+' kayıtlı liglerde maç yok.</div>';
  if(bekleyen) h+='<div class="sba-bos">Maçlar yükleniyor… ('+(sira.length-bekleyen)+' / '+sira.length+' lig)</div>';
  if(bos.length) h+='<div class="sba-alt">'+esc(anaGunAd(ofs))+' maçı olmayan ligler</div><div class="sba-kart">'+bos.map(function(s){ var c=ANA.kume[s+'|'+ofs]||{}, b=ligBayrak(s)||c.logo||'';
      return '<div class="sba-bas ince" onclick="Gercek.anaLigAc(\''+esc(s)+'\')">'+(b?'<img class="sba-bay" src="'+esc(b)+'" alt="" onerror="this.style.visibility=\'hidden\'">':'<span class="sba-bay"></span>')+'<span class="sba-ad">'+esc(ligBaslik(s))+'</span><span class="sba-ok">›</span></div>'; }).join('')+'</div>';
  h+='<div style="height:5rem"></div></div>';
  var kay=el.querySelector('.sba-ic'), y=kay?kay.scrollTop:0;
  el.innerHTML=h; var k2=el.querySelector('.sba-ic'); if(k2) k2.scrollTop=y;
}
function anaGoster(){
  var el=document.getElementById('sbAna');
  if(!el){ el=document.createElement('div'); el.id='sbAna'; document.body.appendChild(el); }
  ANA.acik=true; el.style.display='flex'; anaCiz(); anaYukle(); anaDongu(); anaUzakDinle();
  try{ var b=el.querySelector('.sba-gun.on'); if(b&&b.scrollIntoView) b.scrollIntoView({inline:'center',block:'nearest'}); }catch(e){}
}
var _anaDinle=false;
function anaUzakDinle(){ if(_anaDinle) return; _anaDinle=true; var ilk=true;
  try{ firebase.database().ref('anasayfa').on('value', function(){ if(ilk){ ilk=false; return; } if(ANA.acik){ anaCiz(); anaYukle(); } }); }catch(e){} }   // admin sırayı değiştirince
function anaGizle(){ var el=document.getElementById('sbAna'); ANA.acik=false; if(el) el.style.display='none'; clearTimeout(ANA.z); }
function anaDongu(){ clearTimeout(ANA.z); if(!ANA.acik) return; ANA.z=setTimeout(function(){ if(!document.hidden&&ANA.acik&&ANA.gun===0) anaYukle().then(anaDongu); else anaDongu(); }, 30000); }
function anaLigAc(slug){
  anaGizle();
  if(slug!==A.lig) ligSec(slug); else { try{ switchTabById&&switchTabById('standings'); }catch(e){} }
}
function anaMacAc(slug, rid){
  var ac=function(){ try{ showMatchDetail('m'+rid); }catch(e){ gunluk('maç açılamadı', e.message); } };
  if(slug===A.lig && L[slug] && L[slug].veri && L[slug].veri.matches['m'+rid]){ ac(); return; }
  try{ showToast('Maç açılıyor…'); }catch(e){}
  var p=ligSec(slug); if(p&&p.then) p.then(function(){ setTimeout(function(){ if(L[slug]&&L[slug].veri&&L[slug].veri.matches['m'+rid]) ac(); else { anaGizle(); } }, 300); });
}
function anaFavLig(slug){ var f=favOku(); if(f.lig[slug]) delete f.lig[slug]; else f.lig[slug]=1; favYaz(f); anaCiz(); }
function anaFavMac(rid){ var f=favOku(); if(f.mac[rid]) delete f.mac[rid]; else f.mac[rid]=Date.now(); var s=Date.now()-14*864e5; Object.keys(f.mac).forEach(function(k){ if(f.mac[k]<s) delete f.mac[k]; }); favYaz(f); anaCiz(); }
function anaGun(g){ ANA.gun=g; anaCiz(); anaYukle(); }
(function(){ try{ var st=document.createElement('style'); st.textContent=''
  +'#sbAna{position:fixed;inset:0;z-index:1500;display:flex;flex-direction:column;background:var(--bg,#0a0a12);color:var(--tx,#fff);font-family:var(--font-family,"Outfit"),system-ui,sans-serif}'
  +'.sba-ust{display:flex;align-items:center;gap:.55rem;padding:calc(env(safe-area-inset-top,0px) + .6rem) 1rem .55rem;background:var(--s,#12121a);border-bottom:1px solid var(--br)}'
  +'.sba-logo{width:30px;height:30px;border-radius:9px}.sba-ust b{font-size:1.05rem;font-weight:900}.sba-btn{background:none;border:0;color:var(--mu);font-size:1.15rem;min-width:38px;min-height:38px;border-radius:10px;cursor:pointer}'
  +'.sba-gunler{display:flex;gap:.35rem;overflow-x:auto;padding:.55rem .8rem;border-bottom:1px solid var(--br);touch-action:pan-x;scrollbar-width:none}.sba-gunler::-webkit-scrollbar{display:none}'
  +'.sba-gun{flex:0 0 auto;padding:.42rem .8rem;border-radius:999px;border:1.5px solid var(--br);background:var(--s2);color:var(--tx);font:inherit;font-size:.74rem;font-weight:700;cursor:pointer}.sba-gun.on{background:var(--ac);border-color:var(--ac);color:#fff}'
  +'.sba-ic{flex:1;overflow-y:auto;padding:.7rem .6rem;-webkit-overflow-scrolling:touch}'
  +'.sba-kart{background:var(--s,#14141e);border:1px solid var(--br);border-radius:18px;overflow:hidden;margin-bottom:.75rem;box-shadow:0 4px 16px rgba(0,0,0,.18)}'
  +'.sba-bas{display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;background:var(--s3,#2a2a36);cursor:pointer}.sba-bas.ince{background:none;border-bottom:1px solid var(--br)}.sba-bas.ince:last-child{border-bottom:0}'
  +'.sba-bay{width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#fff;border:1px solid rgba(255,255,255,.25);display:inline-flex;align-items:center;justify-content:center}.sba-bay.yildiz{background:#f59e0b;color:#fff;font-size:1rem}'
  +'.sba-ad{flex:1;min-width:0;font-weight:800;font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sba-ok{color:var(--mu);font-size:1.2rem}'
  +'.sba-mac{display:grid;grid-template-columns:3.1rem 1fr auto 1fr 2rem;align-items:center;gap:.45rem;padding:.62rem .6rem .62rem .8rem;border-top:1px solid var(--br);cursor:pointer;font-size:.86rem}'
  +'.sba-saat{font-size:.76rem;color:var(--mu);font-variant-numeric:tabular-nums}.sba-dk{color:#ef4444}.sba-ms{font-weight:700}.sba-ert{color:#f59e0b;font-size:.7rem}'
  +'.sba-ev{text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sba-dep{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sba-ev.kaz,.sba-dep.kaz{font-weight:800}'
  +'.sba-v{color:var(--mu);font-weight:700;text-align:center;min-width:2.6rem}.sba-skor{text-align:center;min-width:2.6rem;font-variant-numeric:tabular-nums}.sba-skor.canli{color:#ef4444}'
  +'.sba-yil{background:none;border:0;color:var(--mu);font-size:1.15rem;cursor:pointer;min-width:30px;min-height:30px}.sba-yil.on{color:#f59e0b}.sba-yil.bas{color:rgba(255,255,255,.8)}.sba-yil.bas.on{color:#f59e0b}'
  +'.sba-bos{text-align:center;color:var(--mu);font-size:.8rem;padding:1.4rem .5rem}.sba-alt{font-size:.66rem;font-weight:800;color:var(--mu);text-transform:uppercase;letter-spacing:.05em;margin:.9rem .3rem .4rem}'
  +'.sb-ana-don{background:none;border:0;color:var(--tx);font-size:1.35rem;min-width:34px;min-height:34px;border-radius:10px;cursor:pointer;margin-right:-.2rem}';
  (document.head||document.documentElement).appendChild(st); }catch(e){} })();
/* Lig sayfasının üst çubuğuna "ana ekran" düğmesi; telefonun geri tuşu da lig sayfasından ana ekrana döndürür */
function anaBagla(){
  try{ var tb=document.querySelector('.topbar'); if(tb&&!document.getElementById('sbAnaDon')){ var b=document.createElement('button'); b.id='sbAnaDon'; b.type='button'; b.className='sb-ana-don'; b.setAttribute('aria-label','Ana ekran'); b.textContent='‹'; b.onclick=anaGoster; tb.insertBefore(b, tb.firstChild); }
    var lg=document.getElementById('ptLogo'); if(lg&&!lg._sb){ lg._sb=1; lg.style.cursor='pointer'; lg.addEventListener('click', anaGoster); } }catch(e){}
  var g=window.__appGeri;
  if(typeof g==='function'&&!g._sb){ window.__appGeri=function(){ if(ANA.acik) return false; var r=g(); if(!r){ anaGoster(); return true; } return r; }; window.__appGeri._sb=1; }
}

function baslat(){
  if(!kimliktenSlug(ligKimlik(A.lig))){ A.lig='tur.1'; ayarYaz(); }
  // (2026-11-17) "Skorbord'a özel ayarlar" admin'den kaldırıldı (kullanıcı isteği); skorbord/ayarlar artık okunmaz. Skorbord'un bütün ayarları
  // admin'in Skorbord kaynağındaki normal panelinden gelir (bkz. yerel-vt.js UZAK KÖK).
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
  // Açılış: ana ekran (bütün liglerin bugünkü maçları)
  anaGoster(); anaBagla(); setTimeout(anaBagla, 1500); setTimeout(anaBagla, 5000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden&&ANA.acik){ anaYukle(); anaDongu(); } });
}

window.Gercek={anaGoster:anaGoster, anaLigAc:anaLigAc, anaMacAc:anaMacAc, anaFavLig:anaFavLig, anaFavMac:function(r){ anaFavMac(r); }, anaGun:anaGun, anaYenile:function(){ anaYukle(true); }, grupSec:grupSec, ayar:A, ligler:LIGLER, ligYukle:ligYukle, ligiAc:ligiAc, ligSec:ligSec, ayarla:ayarla, yenile:yenile, ozetIste:ozetIste, kadroIste:kadroIste, L:L, B:B, hata:''};
baslat();
})();
