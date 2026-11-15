#!/bin/bash
# Uygulamanın (Android WebView) gönderdiği başlıklarla ESPN yanıt veriyor mu? Sonuç "teshis" dalına yazılır.
set +e
U="https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=$(date -u +%Y%m%d)&limit=1000"
UA="Mozilla/5.0 (Linux; Android 16; SM-S928B Build/BP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36 SkorbordApp"
O="Origin: https://azataslan065-png.github.io"; R="Referer: https://azataslan065-png.github.io/"
mkdir -p out; cd out
d(){ n=$1; shift; curl -sS -m 30 --compressed -o /dev/null -D h.txt -w "$n http=%{http_code} gz=%{size_download} " "$@" "$U" >> ozet.txt 2>&1; grep -i "^access-control-allow-origin" h.txt | tr -d '\r' >> ozet.txt; echo >> ozet.txt; }
d duz
d origin -H "$O" -H "$R"
d webview -A "$UA" -H "$O" -H "$R" -H "X-Requested-With: com.azat.skorbord" -H "Sec-Fetch-Site: cross-site" -H "Sec-Fetch-Mode: cors" -H "Sec-Fetch-Dest: empty" -H "Accept: */*" -H "Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
d nocache -A "$UA" -H "$O" -H "$R" -H "X-Requested-With: com.azat.skorbord" -H "Cache-Control: no-cache" -H "Pragma: no-cache"
d http11 --http1.1 -A "$UA" -H "$O"
cat ozet.txt
