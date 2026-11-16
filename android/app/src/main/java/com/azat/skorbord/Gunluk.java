package com.azat.skorbord;

import android.util.Log;

/* Güncelleme sisteminin olay kaydı (Puan Tablosu'ndaki Teshis'in yerine; Skorbord'da teşhis veritabanı yok, kayıt cihaz günlüğüne yazılır). */
final class Gunluk {
    static void olay(String tur, String a, String b) { Log.i("Skorbord", tur + ": " + a + " · " + b); }
    static void yaz(String tur, String a, String b) { Log.w("Skorbord", tur + ": " + a + " · " + b); }
}
