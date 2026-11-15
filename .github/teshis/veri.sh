#!/bin/bash
# ESPN skor servisinin gerçek yanıtlarını kaydeder (başlıklar, boyut, yapı); sonuçlar "teshis" dalına yazılır.
set +e
S=https://site.api.espn.com/apis/site/v2/sports; V=https://site.api.espn.com/apis/v2/sports
O="Origin: https://azataslan065-png.github.io"
D1=$(date -u -d 'yesterday' +%Y%m%d); D2=$(date -u +%Y%m%d)
mkdir -p out; cd out
al(){ # ad url
  curl -sS -m 40 --compressed -D "$1.bas" -o "$1.json" -H "$O" -w "$1 http=%{http_code} indirilen=%{size_download} sure=%{time_total}\n" "$2" >> ozet.txt 2>&1
  grep -iE "^(HTTP|access-control|cache-control|age:|content-type|content-encoding|x-cache|via)" "$1.bas" | tr -d '\r' | sed "s/^/   /" >> ozet.txt
  echo "   ham_boyut=$(stat -c%s "$1.json" 2>/dev/null)" >> ozet.txt
}
al all1 "$S/soccer/all/scoreboard?dates=$D1&limit=1000"
al all2 "$S/soccer/all/scoreboard?dates=$D2&limit=1000"
al allbos "$S/soccer/all/scoreboard"
al eng "$S/soccer/eng.1/scoreboard?dates=$D1-$D2&limit=300"
al tur "$S/soccer/tur.1/scoreboard?dates=20261101-20261116&limit=300"
al nba "$S/basketball/nba/scoreboard?dates=$D1-$D2&limit=300"
al tablo "$V/soccer/eng.1/standings"
al nbatablo "$V/basketball/nba/standings"
echo "--- on kontrol (preflight)" >> ozet.txt
curl -sS -m 20 -X OPTIONS -D - -o /dev/null -H "$O" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: cache-control,pragma" "$S/soccer/all/scoreboard" 2>&1 | tr -d '\r' | grep -iE "^(HTTP|access-control)" >> ozet.txt
echo "--- origin'siz" >> ozet.txt
curl -sS -m 20 -D - -o /dev/null "$S/soccer/eng.1/scoreboard" 2>&1 | tr -d '\r' | grep -iE "^(HTTP|access-control)" >> ozet.txt
for f in all1 all2 allbos eng tur nba; do
  echo "--- $f yapi" >> ozet.txt
  jq -c '{anahtarlar:keys, lig:(.leagues|length), mac:(.events|length), lig0:(.leagues[0]|{id,uid,name,slug,abbreviation}), durumlar:([.events[]?.status.type.name]|group_by(.)|map({(.[0]):length})|add)}' $f.json >> ozet.txt 2>&1
done
# örnekler: canlı ya da bitmiş, olay ayrıntısı olan bir maç
B=all1; [ "$(jq '.events|length' all2.json 2>/dev/null)" -gt "$(jq '.events|length' all1.json 2>/dev/null)" ] 2>/dev/null && B=all2
jq '[.events[]|select(.status.type.state!="pre")|select((.competitions[0].details|length)>0)][0]' $B.json > ornek-mac.json
jq '[.events[]|select(.status.type.state=="pre")][0]' $B.json > ornek-baslamamis.json
jq '[.events[]|select(.status.type.state=="in")][0]' $B.json > ornek-canli.json
jq '.leagues[0:3]|map(del(.calendar))' $B.json > ornek-ligler.json
ID=$(jq -r '.id' ornek-mac.json); LID=$(jq -r '.uid' ornek-mac.json | sed -E 's/.*l:([0-9]+).*/\1/')
SL=$(jq -r --arg l "$LID" '.leagues[]|select(.id==$l)|.slug' $B.json | head -1); TID=$(jq -r '.competitions[0].competitors[0].team.id' ornek-mac.json)
echo "--- ornek mac id=$ID lig=$SL takim=$TID" >> ozet.txt
al ozet-lig "$S/soccer/$SL/summary?event=$ID"
al ozet-all "$S/soccer/all/summary?event=$ID"
al fikstur "$S/soccer/$SL/teams/$TID/schedule"
al fikstur2 "$S/soccer/$SL/teams/$TID/schedule?fixture=true"
al fikstur-all "$S/soccer/all/teams/$TID/schedule"
jq -c '{anahtarlar:keys, olay:(.keyEvents|length), olayTip:([.keyEvents[]?.type.type]|unique), kadro:(.rosters|length), ist:([.boxscore.teams[0].statistics[]?.name])}' ozet-lig.json >> ozet.txt 2>&1
jq '{keyEvents:(.keyEvents[0:6]), rosters:[.rosters[]?|{homeAway,formation,team:(.team|{id,displayName}),roster:(.roster[0:3])}], boxscore:{teams:[.boxscore.teams[]?|{team:(.team|{id,displayName}),statistics:(.statistics[0:4])}]}}' ozet-lig.json > ornek-ozet.json 2>> ozet.txt
jq -c '{anahtarlar:keys, mac:(.events|length), ilk:(.events[0]|{id,date,st:.competitions[0].status.type.state,sk:[.competitions[0].competitors[]|{ha:.homeAway,id:.team.id,ad:.team.shortDisplayName,score}]})}' fikstur.json >> ozet.txt 2>&1
jq -c '{mac:(.events|length), ilk:(.events[0]|{id,date,st:.competitions[0].status.type.state})}' fikstur2.json >> ozet.txt 2>&1
jq -c '{anahtarlar:keys, cocuk:(.children|length), giris:(.children[0].standings.entries|length), ilk:(.children[0].standings.entries[0]|{team:(.team|{id,displayName,shortDisplayName,logo:.logos[0].href}),stats:[.stats[]|{name,displayValue}]})}' tablo.json >> ozet.txt 2>&1
jq -c '{cocuk:(.children|length), ad:[.children[]?.name], ilk:(.children[0].standings.entries[0]|{team:.team.displayName,stats:[.stats[]|.name]})}' nbatablo.json >> ozet.txt 2>&1
jq '.events[0]' nba.json > ornek-nba.json
# tazelik: aynı adres 3 kez, 2 sn arayla
echo "--- tazelik" >> ozet.txt
for i in 1 2 3; do curl -sS -m 20 --compressed -D - -o /dev/null -H "$O" "$S/soccer/eng.1/scoreboard" 2>&1 | tr -d '\r' | grep -iE "^(age|cache-control|date|x-cache)" | tr '\n' ' ' >> ozet.txt; echo >> ozet.txt; sleep 2; done
rm -f all1.json all2.json allbos.json eng.json tur.json nba.json tablo.json nbatablo.json ozet-lig.json ozet-all.json fikstur.json fikstur2.json fikstur-all.json *.bas
cat ozet.txt
