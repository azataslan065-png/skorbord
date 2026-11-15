#!/bin/bash
# ESPN skor servisinin gerçek yanıtlarını kaydeder (başlıklar, boyut, yapı); sonuçlar "teshis" dalına yazılır.
set +e
S=https://site.api.espn.com/apis/site/v2/sports; V=https://site.api.espn.com/apis/v2/sports
O="Origin: https://azataslan065-png.github.io"
D0=$(date -u -d '2 days ago' +%Y%m%d); D1=$(date -u -d 'yesterday' +%Y%m%d); D2=$(date -u +%Y%m%d); D3=$(date -u -d 'tomorrow' +%Y%m%d); D4=$(date -u -d '2 days' +%Y%m%d)
mkdir -p out; cd out
al(){ curl -sS -m 40 --compressed -o "$1.json" -H "$O" -w "$1 http=%{http_code} gz=%{size_download} ham=" "$2" >> ozet.txt 2>&1; echo "$(stat -c%s "$1.json" 2>/dev/null) $(head -c 150 "$1.json" | tr '\n' ' ' | cut -c1-110)" >> ozet.txt; }
echo "--- 400 sebebi" >> ozet.txt
al e1 "$S/soccer/eng.1/scoreboard?dates=$D1"
al e2 "$S/soccer/eng.1/scoreboard?dates=$D1-$D2"
al e3 "$S/soccer/eng.1/scoreboard?dates=$D1&limit=300"
al e4 "$S/soccer/eng.1/scoreboard?limit=300"
al e5 "$S/soccer/eng.1/scoreboard?dates=20261101-20261116"
al e6 "$S/soccer/eng.1/scoreboard"
al t6 "$S/soccer/tur.1/scoreboard"
al n1 "$S/basketball/nba/scoreboard?dates=$D1"
al n2 "$S/basketball/nba/scoreboard"
echo "--- all, gunler" >> ozet.txt
al a0 "$S/soccer/all/scoreboard?dates=$D0&limit=1000"
al a2 "$S/soccer/all/scoreboard?dates=$D2&limit=1000"
al a3 "$S/soccer/all/scoreboard?dates=$D3&limit=1000"
al a4 "$S/soccer/all/scoreboard?dates=$D4&limit=1000"
al a23 "$S/soccer/all/scoreboard?dates=$D2-$D3&limit=1000"
al atr "$S/soccer/all/scoreboard?dates=$D2&limit=1000&lang=tr&region=tr"
for f in a0 a2 a3 a4 a23 atr; do jq -c '{mac:(.events|length)}' $f.json >> ozet.txt 2>&1; done
echo "--- lig listesi adaylari" >> ozet.txt
al l1 "https://site.api.espn.com/apis/site/v2/leagues/dropdown?sport=soccer&limit=1000"
al l2 "https://sports.core.api.espn.com/v2/sports/soccer/leagues?limit=1000"
al l3 "https://site.web.api.espn.com/apis/site/v2/leagues/dropdown?sport=soccer&limit=1000&lang=en&region=us"
al l4 "$S/soccer/all/leagues"
al l5 "https://site.api.espn.com/apis/site/v2/sports/soccer"
al l6 "https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=soccer&lang=en&region=us"
for f in l1 l3; do jq -c '{anahtar:keys, n:(.leagues|length), ilk:(.leagues[0:2])}' $f.json 2>&1 | cut -c1-900 >> ozet.txt; done
jq -c '{anahtar:keys, n:(.items|length), ilk:.items[0]}' l2.json 2>&1 | cut -c1-400 >> ozet.txt
jq -c '{anahtar:keys}' l5.json 2>&1 | cut -c1-300 >> ozet.txt
jq -c '{anahtar:keys, sp:[.sports[]?|{n:.name,lig:(.leagues|length),ilk:(.leagues[0]|del(.events))}]}' l6.json 2>&1 | cut -c1-900 >> ozet.txt
jq -c '[.leagues[]?|{id,name,slug,abbreviation,midsizeName,shortName}]' l1.json > ligler.json 2>/dev/null; [ -s ligler.json ] || jq -c '[.leagues[]?|{id,name,slug,abbreviation,midsizeName,shortName}]' l3.json > ligler.json
echo "--- lig no / altGameNote (bugun)" >> ozet.txt
jq -r '[.events[]|{l:(.uid|capture("l:(?<l>[0-9]+)").l), n:(.competitions[0].altGameNote//""), g:(.season.slug//"")}]|group_by(.l)|map("\(.[0].l)\t\(length)\t\(.[0].n)\t\(.[0].g)")|.[]' a2.json >> ozet.txt 2>&1
echo "--- ornek mac alanlari" >> ozet.txt
jq -c '[.events[]|select(.status.type.state=="in")][0]|{id,uid,status,links:[.links[]?.href][0:2],comp:(.competitions[0]|{c:[.competitors[]|{ha:.homeAway,sc:.score,so:(.shootoutScore//null),w:(.winner//null),t:.team.shortDisplayName}],det:[.details[]?|{t:.type.text,c:.clock.displayValue,tm:.team.id,sp:.scoringPlay,rc:.redCard,yc:.yellowCard,pk:.penaltyKick,og:.ownGoal,a:[.athletesInvolved[]?.displayName]}]})}' a2.json >> ozet.txt 2>&1
jq -c '[.events[]|select(.status.type.name=="STATUS_FINAL_PEN")][0]|{status:.status.type,c:[.competitions[0].competitors[]|{sc:.score,so:(.shootoutScore//null),w:.winner}]}' a2.json >> ozet.txt 2>&1
ID=$(jq -r '[.events[]|select(.status.type.state!="pre")|select((.competitions[0].details|length)>2)][0].id' a2.json); TID=$(jq -r --arg i "$ID" '.events[]|select(.id==$i)|.competitions[0].competitors[0].team.id' a2.json)
echo "--- ozet id=$ID takim=$TID" >> ozet.txt
al oz "$S/soccer/all/summary?event=$ID"
jq -c '{anahtarlar:keys, olay:(.keyEvents|length), olayTip:([.keyEvents[]?.type|"\(.type)|\(.text)"]|unique), kadro:(.rosters|length), kadroN:[.rosters[]?|(.roster|length)], ist:([.boxscore.teams[0].statistics[]?|"\(.name)=\(.label)=\(.displayValue)"]), lig:(.header.league|{id,name,slug,abbreviation}), sezon:.header.season}' oz.json >> ozet.txt 2>&1
jq '{keyEvents:[.keyEvents[]?|select(.type.type|test("sub|card|goal"))][0:5], rosters:[.rosters[]?|{homeAway,formation,team:(.team|{id,displayName}),roster:(.roster[0:2]+.roster[11:13])}], boxscoreTeam:(.boxscore.teams[0]|{team:(.team|{id,displayName}),homeAway}), header:(.header|del(.links,.competitions))}' oz.json > ornek-ozet.json 2>> ozet.txt
al fx "$S/soccer/all/teams/$TID/schedule"
al fx2 "$S/soccer/all/teams/$TID/schedule?fixture=true"
for f in fx fx2; do jq -c '{anahtarlar:keys, mac:(.events|length), durum:([.events[]?.competitions[0].status.type.state]|group_by(.)|map({(.[0]):length})|add), ilk:(.events[0]|{id,date,lig:(.league|{name,slug}?),sk:[.competitions[0].competitors[]|{ha:.homeAway,id:.team.id,ad:.team.shortDisplayName,score}]}), son:(.events[-1]|{date,st:.competitions[0].status.type.state})}' $f.json 2>&1 | cut -c1-900 >> ozet.txt; done
jq '.events[0]' n2.json > ornek-nba.json
jq -c '.leagues[0]|{id,name,slug,abbreviation}' e6.json t6.json n2.json >> ozet.txt 2>&1
rm -f e?.json t6.json n?.json a*.json l?.json oz.json fx*.json
cat ozet.txt
