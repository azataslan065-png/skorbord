#!/bin/bash
# Geçici: bitmiş bir Premier Lig ve bir Süper Lig maçının ESPN özetini "teshis" dalına kaydeder (sınama için)
set +e; mkdir -p out; cd out
S=https://site.api.espn.com/apis/site/v2/sports/soccer
for lg in eng.1 esp.1; do
  ID=$(curl -s "$S/$lg/scoreboard?dates=$(date -u -d '2 days ago' +%Y%m%d)" | jq -r '[.events[]|select(.status.type.completed)][0].id'); [ "$ID" = "null" ] && ID=$(curl -s "$S/$lg/scoreboard?dates=$(date -u -d '7 days ago' +%Y%m%d)" | jq -r '[.events[]|select(.status.type.completed)][0].id')
  curl -s "$S/all/summary?event=$ID" | jq -c 'del(.news,.videos,.article,.odds,.pickcenter,.broadcasts,.standings)' > ozet-$lg.json
  echo "$lg $ID yorum $(jq '.commentary|length' ozet-$lg.json) türler $(jq -c '[.commentary[]?.play.type.type]|group_by(.)|map({(.[0]//"-"):length})|add' ozet-$lg.json)"
done
