#!/bin/bash
# ESPN skor servisinin gerçek yanıtlarını olduğu gibi kaydeder; sonuçlar "teshis" dalına yazılır (sayfa bu verilerle sınanır).
set +e
S=https://site.api.espn.com/apis/site/v2/sports; V=https://site.api.espn.com/apis/v2/sports
D1=$(date -u -d 'yesterday' +%Y%m%d); D2=$(date -u +%Y%m%d); D3=$(date -u -d 'tomorrow' +%Y%m%d)
mkdir -p out; cd out
al(){ curl -sS -m 40 --compressed -o "$1.json" -w "$1 http=%{http_code} gz=%{size_download}\n" "$2" >> ozet.txt 2>&1; }
al all-$D1 "$S/soccer/all/scoreboard?dates=$D1&limit=1000"
al all-$D2 "$S/soccer/all/scoreboard?dates=$D2&limit=1000"
al all-$D3 "$S/soccer/all/scoreboard?dates=$D3&limit=1000"
al ligler "https://site.api.espn.com/apis/site/v2/leagues/dropdown?sport=soccer&limit=1000"
jq -c '[.leagues[]|{id,name,slug,abbreviation,shortName,st:(.season.type.hasStandings//null)}]' ligler.json > l.json && mv l.json ligler.json
ID=$(jq -r '[.events[]|select(.status.type.state!="pre")|select((.competitions[0].details|length)>2)][0].id' all-$D2.json); TID=$(jq -r --arg i "$ID" '.events[]|select(.id==$i)|.competitions[0].competitors[0].team.id' all-$D2.json)
al ozet "$S/soccer/all/summary?event=$ID"
jq -c 'del(.news,.videos,.article,.commentary,.odds,.pickcenter,.broadcasts)' ozet.json > o.json && mv o.json ozet.json
al fikstur "$S/soccer/all/teams/$TID/schedule"
al fikstur2 "$S/soccer/all/teams/$TID/schedule?fixture=true"
al tablo "$V/soccer/eng.1/standings"
al tur "$S/soccer/tur.1/scoreboard"
al nba "$S/basketball/nba/scoreboard?dates=$D1"
al nbaozet "$S/basketball/nba/summary?event=$(jq -r '.events[0].id' nba.json)"
jq -c '{boxscore:{teams:.boxscore.teams}, header:(.header|del(.links))}' nbaozet.json > o.json && mv o.json nbaozet.json
al nbatablo "$V/basketball/nba/standings"
al nbafikstur "$S/basketball/nba/teams/$(jq -r '.events[0].competitions[0].competitors[0].team.id' nba.json)/schedule"
echo "ID=$ID TID=$TID D1=$D1 D2=$D2 D3=$D3" >> ozet.txt
cat ozet.txt
