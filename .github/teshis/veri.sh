#!/bin/bash
set +e; mkdir -p out; cd out
UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
D=$(date -u +%Y%m%d); curl -s -A "$UA" "https://www.fotmob.com/api/data/matches?date=$D" > fm.json
FID=$(jq -r '[.leagues[].matches[]|select(.home.name|test("Konya";"i"))][0].id' fm.json); echo "FOTMOB $FID"
for u in "https://www.fotmob.com/api/data/matchDetails?matchId=$FID" "https://www.fotmob.com/api/matchDetails?matchId=$FID"; do
  echo "== $u"; curl -s -D h.txt -o md.json -A "$UA" "$u"; head -1 h.txt; grep -i "access-control" h.txt; wc -c md.json; head -c 200 md.json; echo
  jq -c '{mom:(.content.momentum.main.data|length), momOrn:(.content.momentum.main.data[0:3]), shots:(.content.shotmap.shots|length), shotOrn:(.content.shotmap.shots[0]|{x,y,eventType,teamId,min,playerName}), tick:(.content.liveticker|keys?)}' md.json 2>&1 | head -c 700; echo
  [ -s md.json ] && cp md.json md-$(echo $u|grep -c data).json
done
echo "== sayfa"; curl -s -A "$UA" -o pg.html -D h.txt "https://www.fotmob.com/match/$FID"; head -1 h.txt; wc -c pg.html; grep -o '"momentum":{"main":{"data":\[[^]]\{0,200\}' pg.html | head -1
rm -f h.txt
