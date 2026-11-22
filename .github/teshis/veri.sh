#!/bin/bash
set +e; mkdir -p out; cd out
UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
D=$(TZ=Europe/Istanbul date +%Y%m%d); curl -s -A "$UA" "https://www.fotmob.com/api/data/matches?date=$D&timezone=Europe/Istanbul" > fm-liste.json
for ad in Konya Kasımpaşa Twente; do ID=$(jq -r --arg a "$ad" '[.leagues[].matches[]|select(.home.name|test($a;"i"))][0].id' fm-liste.json); curl -s -A "$UA" "https://www.fotmob.com/api/data/matchDetails?matchId=$ID" > md-$ad.json; echo "$ad $ID $(wc -c < md-$ad.json)"; done
S=https://site.api.espn.com/apis/site/v2/sports/soccer
curl -s "$S/tur.1/scoreboard" > espn-tur1.json; jq -c '.events[]|{n:.shortName,st:.status.type.name,cl:.status.displayClock,d:.status.type.shortDetail}' espn-tur1.json
ID=$(jq -r '[.events[]|select(.name|test("Konya";"i"))][0].id' espn-tur1.json); curl -s "$S/all/summary?event=$ID" | jq -c 'del(.news,.videos,.article,.odds,.pickcenter,.standings)' > espn-konya.json
jq -c '.leagues[]|select(.primaryId==71)|.matches[]|{h:.home.name,s:.status}' fm-liste.json | head -c 1500
