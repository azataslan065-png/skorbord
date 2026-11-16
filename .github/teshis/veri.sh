#!/bin/bash
# Lig sezonu verisi için ESPN uçlarını dener ve gerçek yanıtları "teshis" dalına kaydeder.
set +e
S=https://site.api.espn.com/apis/site/v2/sports/soccer; V=https://site.api.espn.com/apis/v2/sports/soccer
mkdir -p out; cd out
al(){ curl -sS -m 60 --compressed -o "$1.json" -w "$1 http=%{http_code} gz=%{size_download} ham=" "$2" >> ozet.txt 2>&1; echo "$(stat -c%s "$1.json" 2>/dev/null) $(head -c 90 "$1.json" | tr '\n' ' ')" >> ozet.txt; }
m(){ jq -c '{mac:(.events|length), ilk:(.events[0].date), son:(.events[-1].date), takvim:(.leagues[0].calendar|length), sezon:(.leagues[0].season|{year,startDate,endDate,slug:.type.slug}?)}' "$1.json" >> ozet.txt 2>&1; }
al yil "$S/tur.1/scoreboard?dates=2026&limit=1000"; m yil
al ay "$S/tur.1/scoreboard?dates=202611&limit=1000"; m ay
al aralik "$S/tur.1/scoreboard?dates=20260801-20270601&limit=1000"; m aralik
al aralik2 "$S/tur.1/scoreboard?dates=20261101-20261130"; m aralik2
al aralikweb "https://site.web.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=20261101-20261130&limit=500"; m aralikweb
al varsayilan "$S/tur.1/scoreboard"; m varsayilan
jq -c '.leagues[0]|{calendarType,calendarIsWhitelist,calendarStartDate,calendarEndDate,takvim:(.calendar[0:3]),n:(.calendar|length)}' varsayilan.json >> ozet.txt 2>&1
al takimlar "$S/tur.1/teams"
jq -c '{n:(.sports[0].leagues[0].teams|length), ilk:(.sports[0].leagues[0].teams[0].team|{id,displayName,shortDisplayName,abbreviation,color,alternateColor,logo:.logos[0].href})}' takimlar.json >> ozet.txt 2>&1
al tablo "$V/tur.1/standings"
TID=$(jq -r '.sports[0].leagues[0].teams[0].team.id' takimlar.json)
al fx "$S/tur.1/teams/$TID/schedule"; al fx2 "$S/tur.1/teams/$TID/schedule?fixture=true"
for f in fx fx2; do jq -c '{mac:(.events|length), ilk:.events[0].date, son:.events[-1].date, hafta:(.events[0]|{week:(.week//null),seasonType:(.seasonType//null),note:(.competitions[0].notes//null)})}' $f.json >> ozet.txt 2>&1; done
al kadro "$S/tur.1/teams/$TID/roster"
jq -c '{anahtar:keys, n:(.athletes|length), ilk:(.athletes[0]|{id,displayName,jersey,pos:.position.abbreviation,age,flag:.flag.href?,head:.headshot.href?, st:(.statistics|keys?)})}' kadro.json >> ozet.txt 2>&1
al cekirdek "https://sports.core.api.espn.com/v2/sports/soccer/leagues/tur.1/events?dates=2026&limit=1000"
jq -c '{count,n:(.items|length)}' cekirdek.json >> ozet.txt 2>&1
al istat "$S/tur.1/statistics"
jq -c '{anahtar:keys, s:[.stats[]?|{name,n:(.leaders|length)}]}' istat.json >> ozet.txt 2>&1
# canlı ya da son bitmiş Süper Lig maçının özeti (olay, kadro, anlatım, yayıncı/hakem)
ID=$(jq -r '[.events[]|select(.status.type.state!="pre")][-1].id' varsayilan.json); [ "$ID" = "null" ] && ID=$(jq -r '[.events[]|select(.competitions[0].status.type.state=="post")][-1].id' fx.json)
al ozet "$S/tur.1/summary?event=$ID"
jq -c '{id:"'$ID'", anahtar:keys, yorum:(.commentary|length), yorumIlk:(.commentary[0:2]), gameInfo:.gameInfo, yayin:.broadcasts, format:.format}' ozet.json | cut -c1-1500 >> ozet.txt 2>&1
jq -c 'del(.news,.videos,.article,.odds,.pickcenter)' ozet.json > o.json && mv o.json ozet.json
al cekirdek-oyun "https://sports.core.api.espn.com/v2/sports/soccer/leagues/tur.1/events/$ID/competitions/$ID/plays?limit=400"
jq -c '{count, n:(.items|length), ilk:(.items[0]|{type:.type.text,clock:.clock.displayValue,text,x:(.fieldPositionX//null),y:(.fieldPositionY//null),k:keys})}' cekirdek-oyun.json | cut -c1-700 >> ozet.txt 2>&1
rm -f aralik*.json yil.json ay.json cekirdek.json
[ "$(jq '.events|length' ay.json 2>/dev/null)" ] ; cat ozet.txt
