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
isle('index.html', [('geri tuşu', degis("if(window.SahaApp)return;   // (2026-11-07) APK", "if(window.SahaApp||window.SkorbordApp)return;   // (2026-11-07) APK"))])

# ── SKORBORD SÜRÜMÜ (2026-11-16, kullanıcı: "güncelleme sisteminin aynısını skorborda getir"). Skorbord'un kendi sürüm damgası; her teslimde
#    bir harf ilerletilir (gün değişince A). surum.json sayfanın yanında durur: ortak.js'deki güncelleme sistemi açılışta, 10 dk'da bir ve uygulamaya
#    dönüşte buna bakar; admin Skorbord kaynağındaki "Zorunlu güncelleme" anahtarı skorbord/globalConfig/minSurum'a yazar.
SB_BUILD = '2026-11-17-A'
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
