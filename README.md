# Skorbord

Gerçek liglerden canlı skor, puan durumu, fikstür ve maç detayı. Arayüz, Puan Tablosu uygulamasının (futbol-ligi/test/index.html)
tasarımını ve özelliklerini kullanır; ama ayrı bir uygulamadır: SAHA / Admin / Puan Tablosu veritabanına bağlanmaz.

- `index.html` — uygulama. `kaynak/kur.py` ile Puan Tablosu test sayfasından üretilir (elle düzenlenmez).
- `yerel-vt.js` — arayüzün beklediği veritabanını cihaz belleğinde karşılayan yerel katman (ağa hiçbir şey yazılmaz).
- `gercek.js` — gerçek veri modülü: ESPN açık skor servisinden lig, takım, maç, kadro ve maç özeti alır.
- `ortak/` — arayüzün ortak betiği ve ikon yazı tipi (futbol-ligi/test/ortak'tan kopya).
- `android/` — APK kabuğu; `.github/workflows/apk.yml` her yüklemede APK'yı derleyip "apk" sürümüne koyar.
- `canli-skor.html` — ilk, sade sürüm (yedek olarak duruyor).

Puan Tablosu güncellenince: `python3 kaynak/kur.py <futbol-ligi/test/index.html>` çalıştırılır, `ortak/` kopyaları tazelenir.
