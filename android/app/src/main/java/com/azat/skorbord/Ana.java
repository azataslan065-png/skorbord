package com.azat.skorbord;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/* Skorbord Android kabuğu: sayfayı (index.html) tam ekran bir WebView içinde açar.
   Sayfa APK'nın içindedir; site adresine giden istekler içerideki kopyayla yanıtlanır (bkz. ver),
   böylece adres https kalır (kayıtlı ayarlar, skor servisi çağrıları sorunsuz çalışır) ve site yayında olmasa da uygulama açılır.
   Geri tuşu önce sayfadaki açık pencereyi kapatır; favori takım gol bildirimi telefonun kendi bildirimiyle gösterilir. */
public class Ana extends Activity {
    private static final String EV = "azataslan065-png.github.io", YOL = "/skorbord/";
    private static final String ADRES = "https://" + EV + YOL + "index.html";
    private WebView w;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        w = new WebView(this);
        w.setBackgroundColor(Color.parseColor("#0f161d"));
        setContentView(w);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setUserAgentString(s.getUserAgentString() + " SkorbordApp");
        w.addJavascriptInterface(new Kopru(), "SkorbordApp");
        w.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (EV.equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith(YOL)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return ver(r); }
        });
        w.loadUrl(ADRES);
    }

    /* Site adresindeki dosyalar için APK'daki kopyayı verir; içeride olmayan dosya ağdan istenir. */
    private WebResourceResponse ver(WebResourceRequest r) {
        try {
            Uri u = r.getUrl();
            if (!"GET".equalsIgnoreCase(r.getMethod()) || !EV.equals(u.getHost())) return null;
            String p = u.getPath();
            if (p == null || !p.startsWith(YOL)) return null;
            if (p.startsWith(YOL + "__espn/")) return espn(u, p.substring((YOL + "__espn/").length()));
            String ad = p.substring(YOL.length());
            if (ad.isEmpty()) ad = "index.html";
            if (ad.contains("..") || ad.startsWith("/")) return null;
            String tur = ad.endsWith(".html") ? "text/html" : ad.endsWith(".js") ? "text/javascript" : ad.endsWith(".png") ? "image/png"
                : ad.endsWith(".ttf") ? "font/ttf" : ad.endsWith(".json") ? "application/json"
                : ad.endsWith(".webmanifest") ? "application/manifest+json" : null;
            if (tur == null) return null;
            InputStream in = getAssets().open(ad);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-store");
            return new WebResourceResponse(tur, (tur.startsWith("image/") || tur.startsWith("font/")) ? null : "utf-8", 200, "OK", h, in);
        } catch (Exception e) { return null; }
    }

    /* SKOR SERVİSİ YEDEK YOLU: sayfa skor servisine tarayıcı isteğiyle ulaşamazsa aynı adresi "__espn/" önekiyle ister (bkz. sayfada getJSON);
       istek burada uygulamanın kendi bağlantısıyla yapılır ve yanıt sayfaya kendi adresinden verilir. Yalnızca skor servisine gider. */
    private WebResourceResponse espn(Uri u, String yol) {
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-store");
        try {
            String q = u.getEncodedQuery();
            HttpURLConnection c = (HttpURLConnection) new URL("https://site.api.espn.com/" + yol + (q != null ? "?" + q : "")).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(25000);
            c.setRequestProperty("Accept", "application/json");
            int kod = c.getResponseCode();
            InputStream in = kod >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in == null) in = new ByteArrayInputStream(new byte[0]);
            if (kod < 200 || kod > 599 || (kod >= 300 && kod < 400)) kod = 502;
            return new WebResourceResponse("application/json", "utf-8", kod, kod < 400 ? "OK" : "Hata", h, in);
        } catch (Exception e) {
            byte[] b = String.valueOf(e).getBytes(java.nio.charset.StandardCharsets.UTF_8);
            return new WebResourceResponse("text/plain", "utf-8", 502, "Baglanti hatasi", h, new ByteArrayInputStream(b));
        }
    }

    @Override public void onBackPressed() {
        if (w == null) { super.onBackPressed(); return; }
        w.evaluateJavascript("(function(){try{return !!(window.__appGeri&&window.__appGeri())}catch(e){return false}})()", new ValueCallback<String>() {
            @Override public void onReceiveValue(String v) { if (!"true".equals(v)) finish(); }
        });
    }

    @Override protected void onResume() { super.onResume(); if (w != null) w.onResume(); }
    @Override protected void onPause() { if (w != null) w.onPause(); super.onPause(); }
    @Override protected void onDestroy() { if (w != null) { w.destroy(); w = null; } super.onDestroy(); }

    private boolean izinVar() {
        if (Build.VERSION.SDK_INT >= 33) return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        return ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).areNotificationsEnabled();
    }
    private void izinBildir(boolean ok) {
        if (w != null) w.evaluateJavascript("try{window.__appIzin&&window.__appIzin(" + ok + ")}catch(e){}", null);
    }
    @Override public void onRequestPermissionsResult(int kod, String[] izinler, int[] sonuc) {
        super.onRequestPermissionsResult(kod, izinler, sonuc);
        izinBildir(sonuc.length > 0 && sonuc[0] == PackageManager.PERMISSION_GRANTED);
    }

    private final class Kopru {
        @JavascriptInterface public String izin() { return izinVar() ? "granted" : "default"; }
        @JavascriptInterface public void izinIste() {
            runOnUiThread(new Runnable() { @Override public void run() {
                if (Build.VERSION.SDK_INT >= 33 && !izinVar()) requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, 1);
                else izinBildir(izinVar());
            } });
        }
        @JavascriptInterface public void bildir(final String baslik, final String metin, final String etiket) {
            runOnUiThread(new Runnable() { @Override public void run() {
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
            } });
        }
    }
}
