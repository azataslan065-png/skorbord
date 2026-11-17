#!/usr/bin/env python3
"""Kullanım: python3 kaynak/bag-kes.py   (depo kökünden; kur.py sonunda kendiliğinden de çalışır)
Skorbord'un futbol-ligi (SAHA / Admin / Puan Tablosu) altyapısıyla kalan bütün bağlarını keser (2026-11-16, kullanıcı: "skorbord ile
olan bütün bağlarını kopar; uygulamalar farklı, sadece tasarımı aynı"). Tekrar çalıştırılabilir: zaten kesilmişse dokunmaz.
  · Firebase kimlik SDK'sının yüklenmesi (gstatic / jsdelivr) ve App Check (reCAPTCHA) kapatılır.
  · futbol-ligi Firebase proje yapılandırması sahte, yerel değerlerle değiştirilir (yerel-vt.js zaten ağa bağlanmıyordu).
  · futbol-ligi Supabase deposu (yükleme) adresleri ve anahtarları silinir.
  · Maç istatistiğine ESPN'in verdiği ek satırlar (engellenen şut, top kapma, uzaklaştırma, pas isabeti) eklenir.
Tek bilinçli bağ: Skorbord'un kendi ayarları (skorbord/ayarlar), Admin > Yönetim > Skorbord'dan yönetilir ve yalnızca OKUNUR (gercek.js)."""
import re
def isle(yol, islemler):
    s = open(yol, encoding='utf-8').read(); s0 = s
    for ad, f in islemler: s = f(s)
    if s != s0: open(yol, 'w', encoding='utf-8').write(s); print('güncellendi:', yol)
    else: print('değişiklik yok:', yol)
def degis(a, b):
    def f(s):
        if b in s: return s
        assert a in s, ('bulunamadı', a[:80]); return s.replace(a, b)
    return f
def rx(pat, rep, zaten=None):
    def f(s):
        if zaten and zaten in s: return s
        s2, n = re.subn(pat, rep, s, count=1); assert n == 1 or (zaten and zaten in s2), ('kalıp yok', pat[:60]); return s2
    return f
isle('index.html', [
  ('kimlik sdk', degis("""  window._authOrtamUygun=httpMi;
  if(httpMi){
    document.write('<scr'+'ipt src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js" crossorigin="anonymous" onerror="window._fbAuthLoadFailed=true"><\\/scr'+'ipt>');
  }""", """  window._authOrtamUygun=false;   /* Skorbord: futbol-ligi kimlik altyapısı yüklenmez (bkz. kaynak/bag-kes.py) */""")),
  ('app check', rx(r"window\.APP_CHECK_SITE_KEY='[^']*';", "window.APP_CHECK_SITE_KEY='';   /* Skorbord: App Check yok */", "window.APP_CHECK_SITE_KEY='';")),
  ('firebase yapılandırması', rx(r'const FB=\{apiKey:"[^"]*"[^}]*\};', 'const FB={apiKey:"skorbord-yerel",authDomain:"",databaseURL:"",projectId:"skorbord-yerel",storageBucket:"",messagingSenderId:"",appId:"skorbord-yerel"};', 'projectId:"skorbord-yerel"')),
  ('supabase', rx(r"const SUPABASE_URL='[^']*';\nconst SUPABASE_ANON_KEY='[^']*';", "const SUPABASE_URL='';   /* Skorbord: futbol-ligi deposuna yükleme yok */\nconst SUPABASE_ANON_KEY='';", "const SUPABASE_URL='';")),
  ('ek istatistik', rx(r"(    \$\{bar\('[^']*Korner',ss\.home\.korner\|\|0,ss\.away\.korner\|\|0\)\})", """    ${varMi('engellenen')?bar(' Engellenen Şut',ss.home.engellenen||0,ss.away.engellenen||0):''}
    ${varMi('topKapma')?bar(' Top Kapma',ss.home.topKapma||0,ss.away.topKapma||0):''}
    ${varMi('uzaklastirma')?bar(' Uzaklaştırma',ss.home.uzaklastirma||0,ss.away.uzaklastirma||0):''}
    ${varMi('pasIsabet')?bar(' Pas İsabeti %',ss.home.pasIsabet||0,ss.away.pasIsabet||0,true):''}
\\1""", "varMi('engellenen')")),
])
isle('ortak/ortak.js', [
  ('supabase', rx(r"var URLK = 'https://[a-z0-9]+\.supabase\.co', ANAHTAR = '[^']*'", "var URLK = '', ANAHTAR = ''   /* Skorbord: yükleme deposu yok */", "var URLK = '', ANAHTAR = ''")),
])

# ── AD DEĞİŞİKLİĞİ (2026-11-16, kullanıcı: "Skorbord uygulamasında ne kadar 'puan tablosu' yazısı varsa 'skorbord' olarak değiştir")
#    Uygulama adı olan "Puan Tablosu" → "Skorbord" (Türkçe ekler: 'nun→'un, 'nda→'da, 'na→'a, 'ndaki→'daki, -nu→'u ...).
#    Sıralama tablosu anlamındaki küçük harfli "puan tablosu…" → "puan durumu…" (ekler aynı kalır: tablosunda→durumunda).
def _ek(m):
    e = m.group(1) or ''
    e = e.lstrip("'")
    if e[:1] in ('n', 'y'): e = e[1:]
    return m.group(0)[:0] + ('SKORBORD' if m.group(0).isupper() else 'Skorbord') + ("'" + e if e else '')
def adDegis(s):
    s = re.sub(r"(?:Puan Tablosu|PUAN TABLOSU)((?:'?(?:nun|nu|ndaki|ndan|nda|na|yla))?)(?![a-zçğıöşü])", _ek, s)
    s = re.sub(r"\b([Pp])uan tablosu", lambda m: m.group(1) + 'uan durumu', s)
    return s
for _y in ('index.html', 'ortak/ortak.js', 'gercek.js', 'yerel-vt.js'):
    isle(_y, [('ad', adDegis)])

# APK geri tuşu: Skorbord köprüsü "SkorbordApp" adındadır; geri tuşunu uygulama yönetir, sayfa geçmiş tamponu kurmaz.
isle('index.html', [('geri tuşu', lambda s: s.replace("if(window.SahaApp)return;   // (2026-11-07) APK", "if(window.SkorbordApp)return;   // (2026-11-07) APK"))])

# ── SKORBORD SÜRÜMÜ (2026-11-16, kullanıcı: "güncelleme sisteminin aynısını skorborda getir"). Skorbord'un kendi sürüm damgası; her teslimde
#    bir harf ilerletilir (gün değişince A). surum.json sayfanın yanında durur: ortak.js'deki güncelleme sistemi açılışta, 10 dk'da bir ve uygulamaya
#    dönüşte buna bakar; admin Skorbord kaynağındaki "Zorunlu güncelleme" anahtarı skorbord/globalConfig/minSurum'a yazar.
SB_BUILD = '2026-11-18-A'
isle('index.html', [('sürüm', rx(r"window\.APP_BUILD='[^']*';", "window.APP_BUILD='" + SB_BUILD + "';", "window.APP_BUILD='" + SB_BUILD + "';"))])
open('surum.json', 'w', encoding='utf-8').write('{\n "index": "' + SB_BUILD + '"\n}\n'); print('surum.json:', SB_BUILD)

# Gruplu turnuvalar: puan durumu seçili grubun takımlarıyla hesaplanır, üstte grup seçici (bkz. gercek.js GRUPLAR).
isle('index.html', [
  ('grup takımları', degis("""function renderStandings(){
  const el=document.getElementById('pg-standings');
  const teams=D.teams||{},matches=getEffectiveMatches();""", """function renderStandings(){
  const el=document.getElementById('pg-standings');
  const teams=(window.__sbGrupTakim?window.__sbGrupTakim(D.teams||{}):(D.teams||{})),matches=getEffectiveMatches();""")),
  ('grup seçici', degis("""  let html=sponsorBannerHtml('standings')+nextMatchCountdownHtml()+onThisDayHtml();

  // Live card""", """  let html=sponsorBannerHtml('standings')+nextMatchCountdownHtml()+onThisDayHtml()+(window.__sbGrupSecici?window.__sbGrupSecici():'');

  // Live card""")),
])

# ── SAHA ADI YOK (2026-11-17, kullanıcı: "Skorbord uygulamasında SAHA uygulama ismini taşıyan bir şey olmasın, Skorbord sahadan bağımsız").
#    Puan Tablosu kopyasından gelen SAHA'ya ait parçalar: veri kaynağı seçici (SAHA / SAHA dışı), SAHA kariyeri, SAHA oyuncu kartı, SAHA logosu,
#    teşhis menüsündeki SAHA modülleri ve metinlerdeki "SAHA" adı. Seçiciler kapatılır, metinler SAHA'sız yazılır, logo Skorbord simgesi olur.
#    ("Orta Saha", "İç Saha" futbol terimidir; uygulama adı değildir, kalır.)
def sahaYok(s):
    D = [
      ("function ptVeriKaynagi(){\n  try{ return localStorage.getItem('pt_veriKaynagi') || ''; }catch(e){ return ''; }\n}",
       "function ptVeriKaynagi(){ return 'klasik'; }   /* Skorbord: SAHA veri kaynağı yok */"),
      ("function ptKaynakEkraniAc(degistirmeMi){", "function ptKaynakEkraniAc(degistirmeMi){ if(true) return;   /* Skorbord: veri kaynağı seçimi yok */"),
      ("    var k=document.getElementById('ptLoginKaynak'); if(!k)return;", "    var k=document.getElementById('ptLoginKaynak'); if(!k)return; try{ k.parentNode.style.display='none'; }catch(_){} return;   /* Skorbord: seçici yok */"),
      ('    <!-- VERİ KAYNAĞI (MADDE 1): kullanıcı seçimini her zaman buradan değiştirebilir. -->\n    <button onclick="ptKaynakEkraniAc(true)" style="',
       '    <!-- VERİ KAYNAĞI (MADDE 1): kullanıcı seçimini her zaman buradan değiştirebilir. -->\n    <button onclick="ptKaynakEkraniAc(true)" style="display:none!important;'),
      ('window.ptSahaKariyerAc=function(ad){', 'window.ptSahaKariyerAc=function(ad){ if(true) return;   /* Skorbord: SAHA kariyeri yok */'),
      (' title="SAHA kariyeri"', ''),
      (':root{--saha-logo:url("saha-icon-192.png")}', ':root{--saha-logo:url("app-icon-192.png")}'),
      ("firebase.database().ref('sahaGorunum/logo').on(", "false&&firebase.database().ref('sahaGorunum/logo').on("),
      (">SAHA cezaları<", ">Cezalar<"),
      ("Kadroyu ve dizilişi takımın kullanıcısı SAHA uygulamasından belirler; maça kadar değişebilir.", "Kadro ve diziliş maçtan önce açıklanır; maça kadar değişebilir."),
      (" golün konum bilgisi yok (SAHA dışında girilmiş) · ", " golün konum bilgisi yok · "),
      ("Isı haritası yalnızca SAHA oyununda oynanıp bitirilen lig maçlarında oluşur. Bu maç SAHA dışında girilmiş ya da bu özellikten önce oynanmış.", "Bu maç için ısı haritası verisi yok."),
      (" golün şut yeri kaydı yok (SAHA dışında girilmiş ya da şut kaydından önce oynanmış).", " golün şut yeri kaydı yok."),
      (" Seçtiğin diziliş takımına kaydedilir (SAHA ve fikstür)", " Seçtiğin diziliş takımına kaydedilir"),
      ("<i class=\"saha-logo-i\"></i> SAHA bilgileri yükleniyor…", "Oyuncu bilgileri yükleniyor…"),
      ("'<div class=\"pso-bas\"><i class=\"saha-logo-i\"></i> SAHA <span>'", "'<div class=\"pso-bas\"><span>'"),
      ("<small>Son '+son.length+' SAHA maçı · puan</small>", "<small>Son '+son.length+' maç · puan</small>"),
      ("Puan grafiği için en az 2 SAHA maçı gerekiyor.", "Puan grafiği için en az 2 maç gerekiyor."),
      ("'SAHA tabelası güncellenmiyor'", "'Skor tabelası güncellenmiyor'"),
      ("Bu kullanıcının SAHA hesabı yok.", "Bu kullanıcının kariyer bilgisi yok."),
      ("<i class=\"saha-logo-i\"></i> SAHA kariyeri", "Kariyer"),
      ("+tur+' · SAHA</div>'", "+tur+'</div>'"),
      ("[['klasik',' SAHA dışı'],['saha','<i class=\"saha-logo-i\"></i> SAHA']]", "[]"),
      ("? ' SAHA kaynağında henüz sezon yok - tüm sezonlar gösteriliyor'\n      : ' SAHA dışı kaynakta henüz sezon yok - tüm sezonlar gösteriliyor'", "? ' Bu kaynakta henüz sezon yok - tüm sezonlar gösteriliyor'\n      : ' Bu kaynakta henüz sezon yok - tüm sezonlar gösteriliyor'"),
      ("${ptVeriKaynagi()==='saha'?'SAHA uygulaması üzerinden':ptVeriKaynagi()==='klasik'?'SAHA olmadan':'Seçilmedi'}", "Varsayılan"),
    ]
    for a, b in D:
        if a in s and b not in s: s = s.replace(a, b)   # tekrar çalıştırmada ikinci kez eklenmesin
    # seçim ekranı kartları (SAHA ile / SAHA olmadan)
    s = re.sub(r"\['saha',\s+'<i class=\"saha-logo-i buyuk\"></i>', 'SAHA uygulaması üzerinden devam et',\s+'Yalnızca SAHA uygulamasında[^']*',\s+say\.saha\],\s+\['klasik', '[^']*', 'SAHA uygulaması olmadan devam et',\s+'SAHA verileri gizlenir;[^']*',\s+say\.klasik\]", "", s)
    # teşhis menüsü: SAHA oyun modülleri
    s = re.sub(r'\{"id": "saha_[a-z_]+", "label": "[^"]*", "desc": "[^"]*", "fns": \[[^\]]*\]\},\s*', '', s)
    return s
isle('index.html', [('saha adı', sahaYok)])
def sahaYok2(s):
    s = re.sub(r"\[\['klasik','[^']*SAHA dışı'\],\['saha','<i class=\"saha-logo-i\"></i> SAHA'\]\]", "[]", s)
    s = s.replace("(k==='saha'?'SAHA':'SAHA dışı') + ' tarafına geçiliyor…'", "'Veri kaynağı' + ' değişiyor…'")
    s = re.sub(r"\? '([^']*) SAHA kaynağında henüz sezon yok - tüm sezonlar gösteriliyor'\n      : '([^']*) SAHA dışı kaynakta henüz sezon yok - tüm sezonlar gösteriliyor'",
               r"? '\1 Bu kaynakta henüz sezon yok - tüm sezonlar gösteriliyor'\n      : '\2 Bu kaynakta henüz sezon yok - tüm sezonlar gösteriliyor'", s)
    s = s.replace('<div class="pt-sk bos">SAHA kariyeri yükleniyor…</div>', '<div class="pt-sk bos">Kariyer yükleniyor…</div>')
    return s
isle('index.html', [('saha adı 2', sahaYok2)])
# Uygulama köprüsü de Skorbord adını taşır (SahaApp → SkorbordApp; bkz. android Ana.java).
def kopruAdi(s): return re.sub(r'\bSahaApp\b', 'SkorbordApp', s)
isle('index.html', [('köprü adı', kopruAdi)])
isle('ortak/ortak.js', [('köprü adı', kopruAdi)])

# ── "SAHA" KELİMESİ HİÇ YOK (2026-11-17, kullanıcı: "tekrar gözden geçir; SAHA ismini taşıyan herhangi bir ifade olmasın" - ekranda "Kadro & Saha").
#    Yalnızca kullanıcıya görünen metinler değişir; kod adları (saha-ikon, SahaIkon, sahaVeri...) olduğu gibi kalır.
#    Futbol terimleri karşılıklarıyla: ceza sahası → ceza alanı, orta saha → orta alan, yarı saha → yarı alan, iç saha → ev, sahaya çıktı → oyuna girdi.
SAHA_METIN = [
  ("Kadro & Saha", "Kadro & Diziliş"),
  ("Saha ortasındaki", "Orta alandaki"),
  ("Top ve oyuncu konumları, Saha uygulamasındaki canlı maçtan birebir ve anlık olarak aktarılır.", "Top ve oyuncu konumları canlı maçtan anlık olarak aktarılır."),
  ("'Sahaya dönüldüğünde'", "'Oyun yeniden başlarken'"),
  ("Henüz sahada oynanmış/oynanmakta olan maç yok", "Henüz oynanmış ya da oynanmakta olan maç yok"),
  ("kenardan sahaya adım attı", "kenardan oyuna girdi"),
  ("sahaya çıktı", "oyuna girdi"),
  ("sahayı terk etti", "oyundan çıktı"),
  ("(sahada gösterilemiyor)", "(dizilişte gösterilemiyor)"),
  ("taze güç istedi: ${ad} sahada", "taze güç istedi: ${ad} oyunda"),
  ("top oyundayken sahada en çok bulunduğu", "top oyundayken en çok bulunduğu"),
  ("cumle=hn+' sahasında '+an+' karşısında '", "cumle=hn+' evinde '+an+' karşısında '"),
  ("'Kenardan hamle: '+tk+' sahaya '+ad+' isimli oyuncuyu sürd", "'Kenardan hamle: '+tk+' oyuna '+ad+' isimli oyuncuyu sürd"),
  ("İç saha puanı", "Ev puanı"), ("<small>İç saha</small>", "<small>Ev</small>"), ("(iç saha)", "(ev)"), ("İç sahada", "Evinde"), ("İç Saha", "Ev"),
]
def sahaKelime(s):
    for a, b in SAHA_METIN: s = s.replace(a, b)
    # ceza / yarı sahası → alanı (ekler aynı: sahasında → alanında, sahasına → alanına, sahasının → alanının)
    s = re.sub(r"\b([Cc]eza|[Yy]arı) sahas", r"\1 alan", s)
    s = re.sub(r"\b([Yy]arı|[Oo]rta) saha(da|ya|yı)?\b", lambda m: m.group(1) + ' alan' + {'da':'da','ya':'a','yı':'ı'}.get(m.group(2) or '', ''), s)
    s = re.sub(r"\bOrta Saha\b", "Orta Alan", s)
    return s
for _y in ('index.html', 'gercek.js', 'ortak/ortak.js'):
    isle(_y, [('saha kelimesi', sahaKelime)])
