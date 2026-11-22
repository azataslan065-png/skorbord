#!/bin/bash
set +e; mkdir -p out; cd out
UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
t(){ echo "== $1"; curl -s -m 20 -D h.txt -o "$2" -A "$UA" "${@:3}" "$1"; head -1 h.txt; grep -i "access-control-allow-origin" h.txt; wc -c < "$2"; head -c 300 "$2"; echo; }
t "https://api.sofascore.app/api/v1/sport/basketball/events/live" ss-bsk.json
t "https://api.sofascore.app/api/v1/sport/volleyball/events/live" ss-vlb.json
t "https://api.sofascore.com/api/v1/sport/basketball/events/live" ss2.json -H "Origin: https://www.sofascore.com" -H "Referer: https://www.sofascore.com/"
t "https://prod-public-api.livescore.com/v1/api/app/live/basketball/3?MD=1" ls-bsk.json
t "https://d.flashscore.com/x/feed/f_3_0_3_tr_1" fs-bsk.txt -H "x-fsign: SW9D1eZo" -H "Referer: https://www.flashscore.com/"
t "https://d.flashscore.com/x/feed/f_12_0_3_tr_1" fs-vlb.txt -H "x-fsign: SW9D1eZo" -H "Referer: https://www.flashscore.com/"
t "https://global.flashscore.ninja/2/x/feed/f_3_0_3_tr_1" fs2.txt -H "x-fsign: SW9D1eZo"
rm -f h.txt
