#!/bin/bash
# TEST → KÖK (2026-11-22). Skorbord'da yeni geliştirmeler önce test/ klasörüne (azataslan065-png.github.io/skorbord/test/, "Skorbord Test"
# APK'sı) gider; kullanıcı "köke at" deyince test/ kökteki kararlı sürüme aynen kopyalanır. Dosyalar iki yerde de aynıdır: fark adresten
# anlaşılır (gercek.js SB_TEST, index.html başı sbt:). manifest.json kopyalanmaz (test adında "Skorbord Test" yazar).
set -e; cd "$(dirname "$0")/.."
for f in index.html gercek.js yerel-vt.js surum.json app-icon-192.png app-icon-512.png ortak/ortak.js ortak/saha-ikon.ttf; do cp "test/$f" "$f"; done
echo "köke alındı: $(cat surum.json | tr -d '\n ')"
