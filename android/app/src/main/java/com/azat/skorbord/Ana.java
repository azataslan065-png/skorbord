package com.azat.skorbord;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/* Skorbord Android kabuğu (2026-11-16, kullanıcı: "Puan tablosu APK kabuk nasılsa aynısını skorborda uygula; APK site gibi davranıyor,
   iki parmakla ekran büyütülüp küçültülebiliyor, APK yap şunu"). Puan Tablosu kabuğundaki davranışlar buraya taşındı:
   - Yakınlaştırma kilidi: WebView ayarları + her sayfa açılışında görünüm etiketi (user-scalable=no) + iki parmak / çift dokunma engeli.
   - Kenar esnemesi (overscroll) ve kaydırma çubukları kapalı; sayfa motoru "önemli" öncelikte.
   - Dosya seçme, tam ekran video, indirme (DownloadManager + blob/data yaması), paylaşma, titreşim, ekran yönü, window.close.
   - Bağlantı yoksa uygulamanın kendi hata ekranı; boş ekran kalırsa bir kez yeniden yükleme.
   - Güncelleme (2026-11-16, kullanıcı: "güncelleme sisteminin aynısını skorborda getir"): Puan Tablosu'nun sistemi (bkz. Guncelle): tam ekran
     kart, uygulama içinde indirme + ilerleme çubuğu, Android kurulum ekranı. Admin'in Skorbord kaynağındaki "Zorunlu güncelleme" anahtarı
     açıkken kart çıkar ve geçilemez; kapalıyken kart çıkmaz, sitede yeni sayfa sürümü varsa sayfa sessizce siteden açılır (siteYukle).
   - Çıkış: Puan Tablosu'ndaki çıkış penceresi (bkz. Cikis).
   Sayfa APK'nın içindedir; site adresine giden istekler içerideki kopyayla yanıtlanır (bkz. ver). */
public class Ana extends Activity {
    private static final String EV = "azataslan065-png.github.io", YOL = "/skorbord/";
    private static final String ADRES = "https://" + EV + YOL + "index.html";
    private static final int DOSYA = 7;
    private final Handler h = new Handler(Looper.getMainLooper());
    private FrameLayout kok;
    private WebView w;
    private View tamEkran;
    private WebChromeClient.CustomViewCallback tamEkranGeri;
    private ValueCallback<Uri[]> dosyaGeri;
    private int bosDeneme;
    private boolean siteden;   // sitede yeni sayfa sürümü var, zorunluluk kapalı: sayfa APK'daki kopya yerine siteden açılır

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        kok = new FrameLayout(this);
        w = new WebView(this);
        w.setBackgroundColor(Color.parseColor("#0f161d"));
        kok.addView(w, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(kok);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);                        // telefonun yazı boyutu sayfa düzenini bozmasın
        s.setSupportZoom(false);                   // yakınlaştırma kapalı (iki parmak / çift dokunma)
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUserAgentString(s.getUserAgentString() + " SkorbordApp/" + BuildConfig.VERSION_CODE);
        w.setOverScrollMode(View.OVER_SCROLL_NEVER);
        w.setVerticalScrollBarEnabled(false);
        w.setHorizontalScrollBarEnabled(false);
        if (Build.VERSION.SDK_INT >= 26) w.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        Kopru k = new Kopru();
        w.addJavascriptInterface(k, "SkorbordApp");
        w.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return disari(r.getUrl()); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return ver(r); }
            @Override public void onPageStarted(WebView v, String u, android.graphics.Bitmap f) { v.evaluateJavascript(KILIT, null); }
            @Override public void onPageFinished(WebView v, String u) {
                v.evaluateJavascript(KILIT, null);
                v.evaluateJavascript(YAMA, null);
                if (u != null && u.startsWith("http")) bosDenetle(12000);
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) v.loadDataWithBaseURL(ADRES, HATA, "text/html", "utf-8", null);
            }
        });
        w.setWebChromeClient(new WebChromeClient() {
            @Override public void onShowCustomView(View v, CustomViewCallback g) {
                if (tamEkran != null) { g.onCustomViewHidden(); return; }
                tamEkran = v; tamEkranGeri = g;
                kok.addView(v, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                kok.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);
            }
            @Override public void onHideCustomView() { tamEkranKapat(); }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> g, FileChooserParams p) {
                if (dosyaGeri != null) dosyaGeri.onReceiveValue(null);
                dosyaGeri = g;
                Intent i = p.createIntent();
                if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try { startActivityForResult(Intent.createChooser(i, "Dosya seç"), DOSYA); }
                catch (ActivityNotFoundException e) { dosyaGeri = null; return false; }
                return true;
            }
        });
        w.setDownloadListener((url, ua, cd, tip, boy) -> {
            if (url.startsWith("blob:") || url.startsWith("data:")) return;   // bunları sayfadaki yama yakalar
            try {
                DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                String ad = URLUtil.guessFileName(url, cd, tip);
                r.setMimeType(tip); r.addRequestHeader("User-Agent", ua);
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, ad);
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
                Toast.makeText(this, "İndiriliyor: " + ad, Toast.LENGTH_SHORT).show();
            } catch (Exception e) { ac(Uri.parse(url)); }
        });
        w.loadUrl(ADRES);
        Guncelle.acilis(this);
    }

    /* Site adresindeki dosyalar için APK'daki kopyayı verir; içeride olmayan dosya ağdan istenir. */
    private WebResourceResponse ver(WebResourceRequest r) {
        try {
            Uri u = r.getUrl();
            if (!"GET".equalsIgnoreCase(r.getMethod()) || !EV.equals(u.getHost())) return null;
            String p = u.getPath();
            if (p == null || !p.startsWith(YOL)) return null;
            if (p.startsWith(YOL + "__espn/")) return espn(u, "https://site.api.espn.com/" + p.substring((YOL + "__espn/").length()));
            if (p.startsWith(YOL + "__fm/")) return espn(u, "https://www.fotmob.com/api/data/" + p.substring((YOL + "__fm/").length()));   // canlı maç ayrıntısı (baskı, şut haritası)
            String ad = p.substring(YOL.length());
            if (ad.isEmpty()) ad = "index.html";
            if (ad.contains("..") || ad.startsWith("/") || ad.startsWith("surum.json")) return null;
            if (siteden && (ad.endsWith(".html") || ad.endsWith(".js"))) return null;   // sessiz güncelleme: sayfa siteden
            String tur = ad.endsWith(".html") ? "text/html" : ad.endsWith(".js") ? "text/javascript" : ad.endsWith(".png") ? "image/png"
                : ad.endsWith(".ttf") ? "font/ttf" : ad.endsWith(".json") ? "application/json"
                : ad.endsWith(".webmanifest") ? "application/manifest+json" : null;
            if (tur == null) return null;
            InputStream in = getAssets().open(ad);
            Map<String, String> hd = new HashMap<>();
            hd.put("Cache-Control", "no-store");
            return new WebResourceResponse(tur, (tur.startsWith("image/") || tur.startsWith("font/")) ? null : "utf-8", 200, "OK", hd, in);
        } catch (Exception e) { return null; }
    }

    /* SKOR SERVİSİ YEDEK YOLU: sayfa skor servisine tarayıcı isteğiyle ulaşamazsa aynı adresi "__espn/" önekiyle ister;
       istek burada uygulamanın kendi bağlantısıyla yapılır. Yalnızca skor servisine (ESPN) ve maç ayrıntısına (FotMob, "__fm/") gider. */
    private WebResourceResponse espn(Uri u, String yol) {
        Map<String, String> hd = new HashMap<>();
        hd.put("Cache-Control", "no-store");
        try {
            String q = u.getEncodedQuery();
            HttpURLConnection c = (HttpURLConnection) new URL(yol + (q != null ? "?" + q : "")).openConnection();
            c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36");
            c.setConnectTimeout(15000);
            c.setReadTimeout(25000);
            c.setRequestProperty("Accept", "application/json");
            int kod = c.getResponseCode();
            InputStream in = kod >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in == null) in = new ByteArrayInputStream(new byte[0]);
            if (kod < 200 || kod > 599 || (kod >= 300 && kod < 400)) kod = 502;
            return new WebResourceResponse("application/json", "utf-8", kod, kod < 400 ? "OK" : "Hata", hd, in);
        } catch (Exception e) {
            byte[] b = String.valueOf(e).getBytes(java.nio.charset.StandardCharsets.UTF_8);
            return new WebResourceResponse("text/plain", "utf-8", 502, "Baglanti hatasi", hd, new ByteArrayInputStream(b));
        }
    }

    // true: uygulama dışında açılır. Skorbord'un kendi adresi içeride kalır, diğer her bağlantı telefonun tarayıcısında/uygulamasında açılır.
    private boolean disari(Uri u) {
        String sema = u.getScheme() == null ? "" : u.getScheme();
        if (("https".equals(sema) || "http".equals(sema)) && EV.equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith(YOL)) return false;
        ac(u); return true;
    }
    private void ac(Uri u) {
        try {
            Intent i = "intent".equals(u.getScheme()) ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME) : new Intent(Intent.ACTION_VIEW, u);
            i.addCategory(Intent.CATEGORY_BROWSABLE); i.setComponent(null); startActivity(i);
        } catch (Exception e) { Toast.makeText(this, "Bağlantı açılamadı", Toast.LENGTH_SHORT).show(); }
    }

    // Sayfa yüklendiği halde ekranda hiçbir şey yoksa bir kez yeniden yüklenir.
    private Runnable bekleyenDenetim;
    private void bosDenetle(long ms) {
        if (bekleyenDenetim != null) h.removeCallbacks(bekleyenDenetim);
        h.postDelayed(bekleyenDenetim = () -> { bekleyenDenetim = null;
            if (w == null) return;
            w.evaluateJavascript("(function(){try{var b=document.body;if(!b)return 'govde-yok';var n=0;document.querySelectorAll('body *').forEach(function(e){var r=e.getBoundingClientRect();if(r.width>40&&r.height>20&&getComputedStyle(e).visibility!=='hidden'&&+getComputedStyle(e).opacity>0.05&&r.bottom>0&&r.top<innerHeight)n++});return n+''}catch(e){return 'hata'}})()", r -> {
                String x = r == null ? "" : r.replace("\"", "");
                if (("0".equals(x) || x.startsWith("govde")) && bosDeneme++ < 1 && w != null) w.reload();
            });
        }, ms);
    }

    private void tamEkranKapat() {
        if (tamEkran == null) return;
        kok.removeView(tamEkran); tamEkran = null;
        if (tamEkranGeri != null) tamEkranGeri.onCustomViewHidden();
        tamEkranGeri = null;
        kok.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }

    @Override protected void onActivityResult(int kod, int sonuc, Intent veri) {
        super.onActivityResult(kod, sonuc, veri);
        if (kod != DOSYA || dosyaGeri == null) return;
        dosyaGeri.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(sonuc, veri));
        dosyaGeri = null;
    }

    @Override public void onBackPressed() {
        if (Guncelle.geri(this)) return;
        if (Cikis.acik()) { Cikis.kapat(); return; }
        if (tamEkran != null) { tamEkranKapat(); return; }
        if (w == null) { super.onBackPressed(); return; }
        w.evaluateJavascript("(function(){try{return !!(window.__appGeri&&window.__appGeri())}catch(e){return false}})()", new ValueCallback<String>() {
            @Override public void onReceiveValue(String v) { if (!"true".equals(v)) Cikis.goster(Ana.this); }
        });
    }

    @Override protected void onResume() { super.onResume(); if (w != null) w.onResume(); Guncelle.donus(this); }
    @Override protected void onPause() { if (w != null) w.onPause(); super.onPause(); }
    @Override protected void onDestroy() { Guncelle.sifirla(this); if (w != null) { w.destroy(); w = null; } super.onDestroy(); }

    private boolean izinVar() {
        if (Build.VERSION.SDK_INT >= 33) return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        return ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).areNotificationsEnabled();
    }
    private void izinBildir(boolean ok) {
        if (w != null) w.evaluateJavascript("try{window.__appIzin&&window.__appIzin(" + ok + ")}catch(e){}", null);
    }
    @Override public void onRequestPermissionsResult(int kod, String[] izinler, int[] sonuc) {
        super.onRequestPermissionsResult(kod, izinler, sonuc);
        if (kod == 1) izinBildir(sonuc.length > 0 && sonuc[0] == PackageManager.PERMISSION_GRANTED);
    }

    private final class Kopru {
        @JavascriptInterface public int surumKod() { return BuildConfig.VERSION_CODE; }
        @JavascriptInterface public String surumAd() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public int kabuk() { return 3; }   // 3: sayfa APK'ya gömülü, güncellemeyi uygulama yapar (bkz. ortak.js apkGomulu)
        @JavascriptInterface public void guncellemeDenetle() { h.post(() -> Guncelle.denetle(Ana.this, true)); }
        @JavascriptInterface public void guncellemeAyar(final boolean acik) { h.post(() -> Guncelle.ayar(Ana.this, acik)); }
        @JavascriptInterface public void siteYukle() { h.post(() -> { if (siteden || w == null) return; siteden = true; w.clearCache(false); w.reload(); }); }
        @JavascriptInterface public String izin() { return izinVar() ? "granted" : "default"; }
        @JavascriptInterface public void izinIste() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33 && !izinVar()) requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, 1);
                else izinBildir(izinVar());
            });
        }
        @JavascriptInterface public void bildir(final String baslik, final String metin, final String etiket) {
            runOnUiThread(() -> {
                try {
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    Notification.Builder nb;
                    if (Build.VERSION.SDK_INT >= 26) {
                        nm.createNotificationChannel(new NotificationChannel("gol", "Gol bildirimleri", NotificationManager.IMPORTANCE_HIGH));
                        nb = new Notification.Builder(Ana.this, "gol");
                    } else nb = new Notification.Builder(Ana.this);
                    Intent i = new Intent(Ana.this, Ana.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    PendingIntent pi = PendingIntent.getActivity(Ana.this, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                    nb.setSmallIcon(R.drawable.ic_bildirim).setContentTitle(baslik).setContentText(metin).setAutoCancel(true).setContentIntent(pi);
                    nm.notify(etiket == null ? 0 : etiket.hashCode(), nb.build());
                } catch (Exception e) { }
            });
        }
        @JavascriptInterface public void cik() { h.post(Ana.this::finish); }
        @JavascriptInterface public void kaydet(String ad, String tip, String b64) {
            h.post(() -> {
                try {
                    byte[] veri = Base64.decode(b64, Base64.DEFAULT);
                    String a = (ad == null || ad.isEmpty()) ? "dosya" : ad.replaceAll("[\\\\/:*?\"<>|]", "_");
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, a);
                        cv.put(MediaStore.MediaColumns.MIME_TYPE, (tip == null || tip.isEmpty()) ? "application/octet-stream" : tip);
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                        Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(veri); }
                    } else {
                        java.io.File f = new java.io.File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), a);
                        try (java.io.FileOutputStream o = new java.io.FileOutputStream(f)) { o.write(veri); }
                    }
                    Toast.makeText(Ana.this, "İndirilenler klasörüne kaydedildi: " + a, Toast.LENGTH_LONG).show();
                } catch (Exception e) { Toast.makeText(Ana.this, "Kaydedilemedi: " + e.getMessage(), Toast.LENGTH_LONG).show(); }
            });
        }
        @JavascriptInterface public void paylas(String baslik, String metin, String url) {
            h.post(() -> {
                Intent i = new Intent(Intent.ACTION_SEND); i.setType("text/plain");
                String m = ((metin == null ? "" : metin) + (url == null || url.isEmpty() ? "" : "\n" + url)).trim();
                i.putExtra(Intent.EXTRA_TEXT, m); if (baslik != null) i.putExtra(Intent.EXTRA_SUBJECT, baslik);
                try { startActivity(Intent.createChooser(i, "Paylaş")); } catch (Exception e) { }
            });
        }
        @JavascriptInterface public void yon(String y) {
            h.post(() -> setRequestedOrientation(y == null ? ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                : y.startsWith("landscape") ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                : y.startsWith("portrait") ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }
        @JavascriptInterface public void titresim(int ms) {
            android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v != null) v.vibrate(Math.max(1, Math.min(2000, ms)));
        }
    }

    // Yakınlaştırma kilidi: görünüm etiketi + iki parmak / çift dokunma engeli (sayfa içi yatay kaydırmalar etkilenmez).
    private static final String KILIT = "(function(){try{var m=document.querySelector('meta[name=viewport]');var c='width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover';"
        + "if(!m&&document.head){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m)}if(m&&m.content!==c)m.content=c;"
        + "if(window.__sbKilit)return;window.__sbKilit=1;"
        + "document.addEventListener('touchmove',function(e){if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false,capture:true});"
        + "['gesturestart','gesturechange'].forEach(function(t){document.addEventListener(t,function(e){e.preventDefault()},{passive:false})});"
        + "var s=document.createElement('style');s.textContent='html,body{touch-action:pan-x pan-y;-webkit-text-size-adjust:100%}';(document.head||document.documentElement).appendChild(s);"
        + "}catch(e){}})();";

    // Sayfaya eklenen küçük yama: blob/data indirmeleri, paylaşma, ekran yönü kilidi, titreşim, kapatma.
    private static final String YAMA = "(function(){if(window.__sbApp)return;window.__sbApp=1;var A=window.SkorbordApp;"
        + "function kaydet(h,ad){return fetch(h).then(function(r){return r.blob()}).then(function(b){return new Promise(function(ok){var f=new FileReader();f.onload=function(){A.kaydet(ad||'dosya',b.type||'',String(f.result).split(',')[1]||'');ok()};f.readAsDataURL(b)})})}"
        + "function ind(a){var h=a.href||'';if(a.hasAttribute('download')&&/^(blob|data):/.test(h)){kaydet(h,a.getAttribute('download'));return true}return false}"
        + "var oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(ind(this))return;return oc.apply(this,arguments)};"
        + "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[download]');if(a&&ind(a)){e.preventDefault();e.stopPropagation()}},true);"
        + "navigator.share=function(d){d=d||{};A.paylas(d.title||'',d.text||'',d.url||'');return Promise.resolve()};"
        + "navigator.canShare=function(d){return !(d&&d.files&&d.files.length)};"
        + "try{if(screen.orientation){screen.orientation.lock=function(y){A.yon(String(y||''));return Promise.resolve()};screen.orientation.unlock=function(){A.yon('')}}}catch(e){}"
        + "window.close=function(){try{A.cik()}catch(e){}};"
        + "navigator.vibrate=function(p){var m=Array.isArray(p)?p.reduce(function(s,x,i){return i%2?s:s+x},0):+p||0;if(m>0)A.titresim(m);return true};"
        + "})();";

    private static final String HATA = "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1,user-scalable=no'>"
        + "<body style='margin:0;background:#0f161d;color:#e8f2ec;font:16px system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:0 24px;box-sizing:border-box'>"
        + "<div style='font-size:20px;font-weight:700;margin-bottom:8px'>Bağlantı yok</div><div style='color:#8fa89a;margin-bottom:20px'>İnternet bağlantını kontrol edip tekrar dene.</div>"
        + "<button onclick=\"location.replace('" + ADRES + "')\" style='min-height:48px;padding:0 28px;border:0;border-radius:12px;background:#2e9a52;color:#fff;font:600 16px system-ui'>Tekrar dene</button></body>";
}
