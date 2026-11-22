#!/bin/bash
set +e; mkdir -p out; cd out
UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
S=https://site.api.espn.com/apis/site/v2/sports/soccer
ID=$(curl -s "$S/tur.1/scoreboard" | jq -r '[.events[]|select(.name|test("Konya";"i"))][0].id'); echo "ESPN $ID"
curl -s "$S/all/summary?event=$ID" | jq -c '{n:(.commentary|length), tur:([.commentary[]?.play.type.type]|group_by(.)|map({(.[0]//"-"):length})|add), ke:(.keyEvents|length)}'
h(){ echo "== $1"; curl -s -D hdr.txt -o "$2" -A "$UA" -H 'Origin: https://www.sofascore.com' -H 'Referer: https://www.sofascore.com/' "$1"; head -1 hdr.txt; grep -i "access-control-allow-origin" hdr.txt; head -c 400 "$2"; echo; }
h "https://api.sofascore.com/api/v1/sport/football/events/live" live.json
SID=$(jq -r '[.events[]?|select(.homeTeam.name|test("Konya";"i"))][0].id' live.json); echo "SOFA $SID"
h "https://api.sofascore.com/api/v1/event/$SID/graph" graph.json
h "https://api.sofascore.com/api/v1/event/$SID/shotmap" shot.json
h "https://api.sofascore.com/api/v1/event/$SID/incidents" inc.json
h "https://api.sofascore.com/api/v1/event/$SID/statistics" stat.json
echo "== origin yok"; curl -s -D h2.txt -o /dev/null -A "$UA" "https://api.sofascore.com/api/v1/event/$SID/graph"; head -1 h2.txt; grep -i access-control h2.txt
echo "== origin baska"; curl -s -D h3.txt -o /dev/null -A "$UA" -H 'Origin: https://azataslan065-png.github.io' "https://api.sofascore.com/api/v1/event/$SID/graph"; head -1 h3.txt; grep -i access-control h3.txt
echo "== www.sofascore.com/api"; curl -s -D h4.txt -o g4.json -A "$UA" "https://www.sofascore.com/api/v1/event/$SID/graph"; head -1 h4.txt; grep -i access-control h4.txt; head -c 200 g4.json; echo
D=$(date -u +%Y%m%d); echo "== fotmob"; curl -s -D h5.txt -o fm.json -A "$UA" "https://www.fotmob.com/api/data/matches?date=$D"; head -1 h5.txt; grep -i access-control h5.txt; head -c 200 fm.json; echo
rm -f hdr.txt h*.txt
