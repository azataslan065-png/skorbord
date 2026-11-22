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
SB_BUILD = '2026-11-22-B'
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

# Kupa dolabı ve oyuncu fotoğrafı kaynağı (bkz. gercek.js KUPA DOLABI, veri dosyası).
isle('index.html', [
  ('kupa dolabı', lambda s: s if 'window.__sbKupaHtml' in s else s.replace("function ptKupaDolabiHtml(tid){", "function ptKupaDolabiHtml(tid){\n  if(window.__sbKupaHtml){ var _sbK=window.__sbKupaHtml(tid); if(_sbK!=null) return _sbK; }   /* Skorbord: veri dosyasından (gercek.js) */", 1)),
  ('foto kaynağı', lambda s: s if 'sb-foto-not' in s else s.replace("""      ${p.photo?`<img src="${p.photo}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid ${c};margin:0 auto .6rem"/>`:""", """      ${p.photo&&p.photoCredit?`<img src="${p.photo}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid ${c};margin:0 auto .6rem"/><div class="sb-foto-not">Fotoğraf: ${p.photoSource?`<a href="${escAttr(p.photoSource)}" target="_blank" rel="noopener">`:''}${escHtml(p.photoCredit)}${p.photoSource?'</a>':''}</div>`:p.photo?`<img src="${p.photo}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid ${c};margin:0 auto .6rem"/>`:""", 1)),
])

# Kupalar (Ziraat Türkiye Kupası, Turkcell Süper Kupa) eleme usulü: puan durumu ve fikstürdeki puan durumu özeti gösterilmez (bkz. gercek.js sbKupa).
isle('index.html', [
  ('kupa puan durumu', degis("""  const teams=(window.__sbGrupTakim?window.__sbGrupTakim(D.teams||{}):(D.teams||{})),matches=getEffectiveMatches();
""", """  const teams=(window.__sbGrupTakim?window.__sbGrupTakim(D.teams||{}):(D.teams||{})),matches=getEffectiveMatches();
  if(D&&D.sbKupa&&el){ el.innerHTML='<div style="text-align:center;color:var(--mu);padding:2.5rem 1.2rem;font-size:.84rem;line-height:1.6"><div style="font-weight:900;color:var(--tx);font-size:1rem;margin-bottom:.35rem">Eleme usulü turnuva</div>Bu turnuvada puan durumu yok; maçlar tur tur Fikstür ve Sonuçlar sekmelerinde.</div>'; return; }
""")),
  ('kupa özet kartı', degis("""function renderStandingsPreviewCard(highlightTeamIds,fullList,liveOverrideMatch){
""", """function renderStandingsPreviewCard(highlightTeamIds,fullList,liveOverrideMatch){
  if(D&&D.sbKupa)return '';
""")),
])

# Açık olan HER menünün (maç ayrıntısı, sıralamalar, takvim...) üstüne "Video / Canlı Yayın" listesi çiziliyordu: canlı maç kartı arka planı
# dinleyicisi, menü açık mı diye bakıyor ama açık menünün video listesi olup olmadığına bakmıyordu. Skorbord'da uzak kök her bildirimde
# dinleyicileri yeniden çalıştırdığı için maç ayrıntısı birkaç saniyede bir video listesine dönüyordu. Artık yalnız video listesi açıksa çizilir.
isle('index.html', [
  ('video listesi yalnız kendi menüsünde', degis("""try{ if(typeof renderVideoScreenList==='function'&&document.getElementById('sheetWrap')&&document.getElementById('sheetWrap').classList.contains('open')) renderVideoScreenList(); }""",
    """try{ if(typeof renderVideoScreenList==='function'&&document.getElementById('sheetWrap')&&document.getElementById('sheetWrap').classList.contains('open')&&document.getElementById('videoScreenList')&&(!window.PTSheetNav||!PTSheetNav.currentKey||PTSheetNav.currentKey()==='videoList')) renderVideoScreenList(); }""")),
])
# Aynı sorun sohbette: sohbet hesapları dinleyicisi sohbet kapalıyken de sohbet ekranını çiziyor, açık menünün (sıralamalar, maç...) yerine geçiyordu.
isle('index.html', [
  ('sohbet yalnız açıkken', degis("""      try{ if(typeof renderChatScreenSafe==='function')renderChatScreenSafe(); }catch(e){self.__ds&&self.__ds(17724,e)}""",
    """      try{ if(typeof renderChatScreenSafe==='function'&&typeof _chatOpen!=='undefined'&&_chatOpen)renderChatScreenSafe(); }catch(e){self.__ds&&self.__ds(17724,e)}""")),
])
# Kök sebep tek yerde: sohbet ekranını çizen iki ortak yardımcı, sohbet KAPALIYKEN de çiziyordu (ortak sohbet dinleyicisi, lig senkronu...).
# Sohbet ekranı çizilince açık menü gizlenip sohbet öne geçiyordu. Sohbet kapalıyken çizim atlanır; açılınca zaten baştan çizilir.
isle('index.html', [
  ('sohbet kapalıyken çizilmez 1', degis("""function scheduleChatRenderSafely(){
  clearTimeout(_chatRenderSafeTimer);
  _chatRenderSafeTimer=setTimeout(()=>{
""", """function scheduleChatRenderSafely(){
  clearTimeout(_chatRenderSafeTimer);
  _chatRenderSafeTimer=setTimeout(()=>{
    if(typeof _chatOpen!=='undefined'&&!_chatOpen)return;   // sohbet kapalı: açık menünün yerine sohbet çizilmesin
""")),
  ('sohbet kapalıyken çizilmez 2', degis("""function renderChatScreenSafe(){
""", """function renderChatScreenSafe(){
  if(typeof _chatOpen!=='undefined'&&!_chatOpen)return;   // sohbet kapalı: açık menünün yerine sohbet çizilmesin
""")),
])

# YouTube canlı maçları TV listesine (bkz. gercek.js YOUTUBE CANLI MAÇLARI): ortak TV listesi her senkronda D.videoLinks'e yazılırken
# Skorbord'un bulduğu / admin'in girdiği YouTube yayınları da eklenir.
isle('index.html', [
  ('youtube tv listesi', degis("""function ptOrtakTvUygula(){
  try{ if(window._ptOrtakTv) D.videoLinks = window._ptOrtakTv; }catch(e){self.__ds&&self.__ds(6478,e)}
}""", """function ptOrtakTvUygula(){
  try{ if(window._ptOrtakTv) D.videoLinks = window._ptOrtakTv; }catch(e){self.__ds&&self.__ds(6478,e)}
  try{ if(window.__sbYoutubeListe){ var _yt=window.__sbYoutubeListe(); D.videoLinks=((D.videoLinks)||[]).filter(function(x){ return !(x&&x.sbYoutube); }).concat(_yt); } }catch(e){self.__ds&&self.__ds(6479,e)}
}""")),
])

# Kadro sekmesindeki ısı / şut haritası sayfaları (2026-11-18, kullanıcı: "kadro sekmesinde ısı haritası hiçbir maç için desteklenmiyor ...
# duruma göre yer kaplamasın"). Bu veriler yalnız SAHA'nın oyun içinde ürettiği konum kayıtlarından gelir; gerçek maç kaynaklarında yok.
# Skorbord'da: ısı verisi yoksa ısı sayfası hiç eklenmez; şut / gol konumu da yoksa kaydırmalı sayfa kurulmaz, kadro tek başına kalır.
isle('index.html', [
  ('ısı haritası yalnız veri varsa', degis("""function ptKayVar(m){ return !!(m&&(m.played||m.sahaMode||ptIsiVar(m))); }""",
    """function ptSutVarSb(m){ try{ if(!m) return false; if(m.sahaSutlar) return true; return (Array.isArray(m.events)?m.events:Object.values(m.events||{})).some(function(e){ return e&&e.type==='goal'&&e.k; }); }catch(e){ return false; } }
function ptKayVar(m){ return !!(m&&(ptIsiVar(m)||ptSutVarSb(m))); }   /* Skorbord: yalnız gerçekten harita verisi olan maçta */""")),
  ('ısı sayfası yoksa atla', rx(r"""  if\(!ptIsiVar\(m\)\) return '</div><div class="isi-say"><div class="isi-kart"[\s\S]*?Kaydır: ⟷ Kadro / Isı / Şut haritası</span></div>';""",
    lambda m: """  if(!ptIsiVar(m)) return '</div>'+ptSutSayfa(m,h,a)+'</div><div class="isi-nokta"><i class="on"></i><i></i><span>Kaydır: ⟷ Kadro / Şut haritası</span></div>';""",
    "Kaydır: ⟷ Kadro / Şut haritası")),
])
# Kadrosu hiç gelmeyen maçta (kaynak kadro vermiyor) boş saha çizilmez; kısa bir not yeterli.
_KBOS = """if(!homeData.count&&!awayData.count) return '<div style="padding:1.6rem 1rem;text-align:center;color:var(--mu);font-size:.8rem;line-height:1.6"><b style="color:var(--tx);font-size:.9rem">Kadro bilgisi yok</b><br>'+(m&&m.played?'Bu maçın ilk 11\\'leri kaynakta yayımlanmadı.':'İlk 11\\'ler maçtan önce açıklanınca burada görünür.')+'</div>';"""
isle('index.html', [
  ('boş kadro dik', degis("""    const awayData=renderHalfPitch(a,'bottom',true,liveEvents,'away');
""", """    const awayData=renderHalfPitch(a,'bottom',true,liveEvents,'away');
    """ + _KBOS + """
""")),
  ('boş kadro yatay', degis("""    const awayData=renderHalfPitch(a,'right',false,liveEvents2,'away');
""", """    const awayData=renderHalfPitch(a,'right',false,liveEvents2,'away');
    """ + _KBOS + """
""")),
])

# Puan durumu öğe yerleşimi (2026-11-18-J, kullanıcı: "logo, sıralama, ok vb. ögeleri elle düzenledim fakat farklı lige veya maça geçince
# bozuluyor, çıkıp tekrar girince düzeliyor"). KÖK SEBEP: adaptStandingsColumnScale uzun takım adı taşınca sıra+ok+logo kümesini (ve
# gerekirse istatistik sütunlarını) küçültüyor, ölçeği ise HİÇ geri büyütmüyordu (yalnız küçülen bir mandal; bir önceki ligin ölçeğinden
# devam ediyordu). Uzun adlı bir lig / grup açılınca küme daralıyor, sonra açılan her ligde öyle kalıyordu: ok "▲:" diye kırpılıyor,
# logo ve sıra admin'in ayarladığı yerden kayıyordu; ölçek yalnız sayfa yeniden açılınca 1'den hesaplanıyordu (o yüzden "çıkıp girince
# düzeliyor"). ŞİMDİ: lig, grup veya ev/deplasman/hafta görünümü değişince ölçek 1'den yeniden hesaplanır — her tablo, uygulama yeni
# açılmış gibi kendi adlarına göre ölçülür. Aynı tablo içindeki tekrar çizimlerde eski davranış (titreme olmasın diye) korunur.
# Ok alanı da artık içeriğini kırpmaz.
isle('index.html', [
  ('puan durumu ölçek tablo başına', degis("""    const rows=el.querySelectorAll('.st-row');
    let maxOverflow=0;
""", """    /* Skorbord: tablo (lig / grup / görünüm) değişince ölçek 1'den yeniden hesaplanır (bkz. bag-kes) */
    var _stAnah=(typeof _curLeagueId!=='undefined'?_curLeagueId:'')+'|'+(function(){ try{ return window.__sbGrupTakim?Object.keys(window.__sbGrupTakim(D.teams||{})).sort().join(','):''; }catch(e){ return ''; } })()+'|'+(typeof _stVenueFilter!=='undefined'?_stVenueFilter:'')+'|'+(typeof _stWeekFilter!=='undefined'?_stWeekFilter:'');
    if(window._stOlcekAnah!==_stAnah){ window._stOlcekAnah=_stAnah; applyStandingsColumnScale(1,1); }
    const rows=el.querySelectorAll('.st-row');
    let maxOverflow=0;
""")),
  ('ok kırpılmaz', degis(".rank-arrow-wrap{font-size:max(9px,.62rem);display:inline-block;flex:0 0 calc(22px * var(--st-col-scale,1));width:calc(22px * var(--st-col-scale,1));overflow:hidden;",
    ".rank-arrow-wrap{font-size:max(9px,.62rem);display:inline-block;flex:0 0 calc(22px * var(--st-col-scale,1));width:calc(22px * var(--st-col-scale,1));overflow:visible;letter-spacing:-.3px;")),
])
# Bölge notlarında "sondan" sıralar (gercek.js BOLGE_SABIT): görünen tablonun / grubun takım sayısına göre çözülür.
isle('index.html', [
  ('bölge sondan 1', degis("  const rankNotes=D.rankNotes||[];\n", "  const rankNotes=(window.__sbBolge?window.__sbBolge(D.rankNotes||[]):D.rankNotes)||[];\n")),
  ('bölge sondan 2', degis("  var notes=(D.rankNotes||[]).filter(function(n){return n&&n.from&&n.to;});", "  var notes=((window.__sbBolge?window.__sbBolge(D.rankNotes||[],totalTeams):D.rankNotes)||[]).filter(function(n){return n&&n.from&&n.to;});")),
])
# Üst çubuktaki lig adı (2026-11-18-J, kullanıcı: "lig ekranına girince lig ismi tam gösterilmiyor, Trendyol Süper Lig yazısı ekrana
# sığmıyor"). Skorbord'un üst çubuğunda altı düğme var; ad tek satırda 9 px'e kadar küçültülüp yine sığmazsa "…" ile kesiliyordu.
# ŞİMDİ: tek satırda en çok 11 px'e kadar küçülür; yine sığmazsa iki satıra bölünür (iki satırda gerekirse 9 px'e kadar), kesilmez.
isle('index.html', [
  ('lig adı iki satır', degis("""        while(ligNameEl.scrollWidth>kutu+1&&px>9&&adim<24){px-=0.5;adim++;ligNameEl.style.fontSize=px+'px';}
        if(ligNameEl.scrollWidth>kutu+1)ligNameEl.style.textOverflow='ellipsis';""", """        ligNameEl.style.whiteSpace='';ligNameEl.style.display='';ligNameEl.style.webkitLineClamp='';ligNameEl.style.webkitBoxOrient='';ligNameEl.style.lineHeight='';ligNameEl.style.textOverflow='';
        while(ligNameEl.scrollWidth>kutu+1&&px>11&&adim<24){px-=0.5;adim++;ligNameEl.style.fontSize=px+'px';}
        if(ligNameEl.scrollWidth>kutu+1){   /* Skorbord: sığmayan ad iki satıra bölünür (kesilmez) */
          ligNameEl.style.whiteSpace='normal';ligNameEl.style.display='-webkit-box';ligNameEl.style.webkitBoxOrient='vertical';ligNameEl.style.webkitLineClamp='2';ligNameEl.style.lineHeight='1.08';ligNameEl.style.overflowWrap='anywhere';
          px=Math.max(px,12);ligNameEl.style.fontSize=px+'px';
          while((ligNameEl.scrollHeight>Math.ceil(px*1.08*2)+2||ligNameEl.scrollWidth>kutu+1)&&px>9&&adim<48){px-=0.5;adim++;ligNameEl.style.fontSize=px+'px';}
        }
        if(ligNameEl.scrollWidth>kutu+1)ligNameEl.style.textOverflow='ellipsis';""")),
])
# Lig logosu (veri/lig-logo/*.png) temizlenmez (2026-11-18-K): bu logolar zaten saydam ve beyaz rozet üstünde durur; kenara değen siyahı
# silen işlem Trendyol Süper Lig logosunun siyah yazısını da siliyor, yalnız kırmızı "S" kalıyordu.
isle('index.html', [
  ('lig logosu işlenmez', degis("""function _processLogoImg(imgEl){
  try{
    const src=imgEl.src;
    if(!src)return;
""", """function _processLogoImg(imgEl){
  try{
    const src=imgEl.src;
    if(!src)return;
    if(src.indexOf('/veri/lig-logo/')!==-1){ imgEl.style.visibility=''; return; }   /* Skorbord: hazır lig logosu olduğu gibi */
""")),
])
# BASKETBOL / VOLEYBOL PUAN DURUMU (2026-11-18-L). D.sbSpor ve D.sbSirala ligin belgesinden gelir (gercek.js ligBelgesi).
#  · Basketbol: beraberlik yok. "yuzde" ligleri (NBA, EuroLeague, ACB…) galibiyet yüzdesine göre sıralanır, P = galibiyet; FIBA usulü
#    ligler (BSL, TBL, KBSL, Yunanistan…) galibiyet 2, mağlubiyet 1 puan. B sütunu yerine galibiyet yüzdesi (%) gösterilir.
#  · Voleybol: 3-0 / 3-1 galibiyet 3, mağlubiyet 0; 3-2 galibiyet 2, mağlubiyet 1. Eşitlikte galibiyet sayısı, sonra set averajı
#    (alınan / verilen). A / Y sütunları set; beraberlik sütunu boş.
isle('index.html', [
  ('çok spor puan', degis("""    if(hg>ag){if(filter!=='away'){h.G++;h.P+=WIN_PTS;}if(filter!=='home')a.M++;}
    else if(ag>hg){if(filter!=='home'){a.G++;a.P+=WIN_PTS;}if(filter!=='away')h.M++;}""", """    const _vb=D.sbSpor==='voleybol', _az=Math.min(hg,ag), _wp=_vb?(_az<=1?3:2):WIN_PTS, _kp=_vb?(_az<=1?0:1):Number(cfg.lossPts||0);   /* Skorbord: basketbol / voleybol */
    if(hg>ag){if(filter!=='away'){h.G++;h.P+=_wp;}if(filter!=='home'){a.M++;a.P+=_kp;}}
    else if(ag>hg){if(filter!=='home'){a.G++;a.P+=_wp;}if(filter!=='away'){h.M++;h.P+=_kp;}}""")),
  ('çok spor sıralama', degis("""  arr.sort((a,b)=>{
    if(b.P!==a.P)return b.P-a.P;""", """  arr.sort((a,b)=>{
    if(D.sbSirala==='yuzde'){ const pa=a.O?a.G/a.O:-1, pb=b.O?b.G/b.O:-1; if(pb!==pa)return pb-pa; if(b.G!==a.G)return b.G-a.G; }   /* Skorbord: basketbol */
    if(D.sbSirala==='galibiyet'&&b.G!==a.G)return b.G-a.G;   /* Skorbord: TVF / FIVB / CEV voleybol — önce galibiyet sayısı */
    if(b.P!==a.P)return b.P-a.P;
    if(D.sbSpor==='voleybol'){ if(b.G!==a.G)return b.G-a.G; const ra=a.YG?a.AG/a.YG:a.AG*100, rb=b.YG?b.AG/b.YG:b.AG*100; if(rb!==ra)return rb-ra; }""")),
  ('çok spor B başlık', rx(r"""\$\{stAlignStyle\('b'\)\}">B</span>""", lambda m: """${stAlignStyle('b')}">${D.sbSpor==='basketbol'?'%':D.sbSpor==='voleybol'?'':'B'}</span>""", "D.sbSpor==='voleybol'?'':'B'}</span>")),
  ('çok spor B hücre', degis("""${stAlignStyle('b',pos)}">${t.B}</div>""", """${stAlignStyle('b',pos)}">${D.sbSpor==='basketbol'?(t.O?Math.round(t.G/t.O*100):0):D.sbSpor==='voleybol'?'':t.B}</div>""")),
])
# BASKETBOL / VOLEYBOL MAÇ DETAYI (2026-11-18-N): canlı durum (çeyrek / set), skor altında çeyrek / set skorları, futbol sekmesi
# "Maç Akışı" gizlenir; Detay / Kadro / Anlatım / İstatistik gercek.js'teki window.__sbSporMd ile çizilir (bkz. orada).
isle('index.html', [
  ('spor durum', degis("  else statusLabel='MS';\n", "  else statusLabel='MS';\n  try{ if(window.__sbDurum){ const _sd=window.__sbDurum(m); if(_sd) statusLabel=_sd; } }catch(e){}   /* Skorbord: basketbol / voleybol */\n")),
  ('spor skor altı', degis("""          ${m.htHomeGoals!=null?`<div class="md-ht">(İY ${m.htHomeGoals}-${m.htAwayGoals})</div>`:''}""",
    """          ${m.htHomeGoals!=null?`<div class="md-ht">(İY ${m.htHomeGoals}-${m.htAwayGoals})</div>`:''}
          ${window.__sbSkorAlt?window.__sbSkorAlt(m):''}""")),
  ('spor sekme', degis("""      <button class="md-tab ${_mdTab==='karne'?'active':''}" onclick="switchMdTab('karne')">Maç Akışı</button>""",
    """      ${(D.sbSpor&&D.sbSpor!=='futbol')?'':`<button class="md-tab ${_mdTab==='karne'?'active':''}" onclick="switchMdTab('karne')">Maç Akışı</button>`}""")),
  ('spor gövde', degis("  if(_mdTab==='onrapor')body=renderMdOnRapor(id,m,h,a);\n", """  const _sbB=(D.sbSpor&&D.sbSpor!=='futbol'&&window.__sbSporMd)?window.__sbSporMd(_mdTab,id,m,h,a):null;   /* Skorbord: basketbol / voleybol */
  if(_sbB!=null)body=_sbB;
  else if(_mdTab==='onrapor')body=renderMdOnRapor(id,m,h,a);
""")),
])
# Alt şerit her koşulda (2026-11-18-N): maç ve duyuru yoksa da açık kalır, "bugün maç yok" yazar (bkz. gercek.js CANLI ALT ŞERİT).
isle('index.html', [
  ('şerit boşken not', degis("""  if(!weekMatches.length && !anns.length){
    ticker.classList.remove('on');""", """  if(!weekMatches.length && !anns.length && window.__sbSeritNot){ anns.push(window.__sbSeritNot()); }   /* Skorbord: şerit hep açık */
  if(!weekMatches.length && !anns.length){
    ticker.classList.remove('on');""")),
])
# Takım detayı (2026-11-19): basketbol / voleybolda futbol dizilişi ve gol haritası sekmeleri gösterilmez; kadro "Oyuncular" sekmesinde.
# Hazır temizlenmiş takım logoları (veri/takim-logo, bkz. veri-topla.js TAKIM LOGOLARI) tarayıcıda yeniden işlenmez.
isle('index.html', [
  ('spor takım sekmeleri', rx(r"""(      )(<button class="td-tab\$\{_tdTab==='squad'\?' active':''\}" onclick="switchTdTab\('squad'\)">[^<]*</button>)""", lambda m: m.group(1) + "${(D.sbSpor&&D.sbSpor!=='futbol')?'':`" + m.group(2) + "`}", "?'':`<button class=\"td-tab${_tdTab==='squad'")),
  ('spor gol haritası', rx(r"""(      )(<button class="td-tab\$\{_tdTab==='golh'\?' active':''\}" onclick="switchTdTab\('golh'\)">[^<]*</button>)""", lambda m: m.group(1) + "${(D.sbSpor&&D.sbSpor!=='futbol')?'':`" + m.group(2) + "`}", "?'':`<button class=\"td-tab${_tdTab==='golh'")),
  ('takım logosu işlenmez', degis("""    if(src.indexOf('/veri/lig-logo/')!==-1){ imgEl.style.visibility=''; return; }""",
    """    if(src.indexOf('/veri/lig-logo/')!==-1||src.indexOf('/veri/takim-logo/')!==-1){ imgEl.style.visibility=''; return; }""")),
])

# ── BASKIMETRE VE CANLI GÖRSEL ANLATIM (2026-11-21, kullanıcı: "Baskımetre niye yok, ekle; sistem puan tablosundaki gibi çalışsın, canlı görsel
#    anlatımı da ekle"). İkisi de "yalnız SAHA maçı" koşuluna bağlıydı; Skorbord'da gerçek maçlar için de çizilir (veri: gercek.js akisIsle).
isle('index.html', [
  ('baskımetre gerçek maçta', degis("""function renderBaskimetre(m){
  if(!ptSahaGoster())return '';   // SAHA'ya özgü: bkz. ptSahaGoster""", """function renderBaskimetre(m){
  if(!ptSahaGoster()&&!window.Gercek)return '';   // SAHA'ya özgü: bkz. ptSahaGoster (Skorbord: gerçek maçlarda da, bkz. gercek.js akisIsle)""")),
  ('görsel anlatım gerçek maçta', degis("""function renderSahaPitch(m,h,a){
  try{
    if(!ptSahaGoster())return '';   // SAHA'ya özgü""", """function renderSahaPitch(m,h,a){
  try{
    if(window.__sbGorsel){ var _sbg=window.__sbGorsel(m,h,a); if(_sbg!=null) return _sbg; }   // Skorbord: gerçek maçın görsel anlatımı (gercek.js)
    if(!ptSahaGoster())return '';   // SAHA'ya özgü""")),
])

# ── GERÇEK BASKI VERİSİ (2026-11-22): FotMob'un dakika dakika baskı değeri varsa Baskımetre onu çizer (gercek.js __sbMom); lig yenilemesi maçı
#    yeniden kursa bile kaybolmaz.
isle('index.html', [
  ('baskımetre FotMob', degis("""  if(!ptSahaGoster()&&!window.Gercek)return '';   // SAHA'ya özgü: bkz. ptSahaGoster (Skorbord: gerçek maçlarda da, bkz. gercek.js akisIsle)""",
    """  if(!ptSahaGoster()&&!window.Gercek)return '';   // SAHA'ya özgü: bkz. ptSahaGoster (Skorbord: gerçek maçlarda da, bkz. gercek.js akisIsle)
  if(window.__sbMom){ var _sbm=window.__sbMom(m); if(_sbm) m=Object.assign({},m,{momentum:_sbm}); }   // Skorbord: FotMob gerçek baskı verisi""")),
])

# ── DEVRE ARASI VE FOTMOB BASKIMETRESİ (2026-11-22): canlı dakika rozeti devre arasında "İY" (ESPN saati "45'+4'" bırakıyordu → "49 Dk");
#    FotMob baskı verisi varsa Baskımetre kendi çizimiyle (gercek.js __sbBaski).
isle('index.html', [
  ('devre arası rozeti', degis("""function ptCanliSaat(m){
  try{
    var tb = m && m.tabela;""", """function ptCanliSaat(m){
  try{
    if(m && m.isLive && m.isHalftime) return 'İY';   // Skorbord: devre arası
    var tb = m && m.tabela;""")),
  ('baskımetre FotMob çizimi', degis("""  if(window.__sbMom){ var _sbm=window.__sbMom(m); if(_sbm) m=Object.assign({},m,{momentum:_sbm}); }   // Skorbord: FotMob gerçek baskı verisi""",
    """  if(window.__sbBaski){ var _sbb=window.__sbBaski(m); if(_sbb!=null) return _sbb; }   // Skorbord: FotMob baskı grafiği (kendi ölçeğinde, devre çizgili)
  if(window.__sbMom){ var _sbm=window.__sbMom(m); if(_sbm) m=Object.assign({},m,{momentum:_sbm}); }   // Skorbord: FotMob gerçek baskı verisi""")),
])
