#!/bin/bash
A=https://api.github.com/repos/azataslan065-png/skorbord/contents/fm.json?ref=canli-fm
for i in 1 2 3 4; do
  curl -s -D h.txt -o b.json -H 'Accept: application/vnd.github.raw+json' -H 'Origin: https://azataslan065-png.github.io' "$A"; E=$(grep -i '^etag' h.txt | cut -d' ' -f2 | tr -d '\r')
  echo "$(date -u +%T) $(head -1 h.txt|tr -d '\r') t=$(jq -r .t b.json) kalan=$(grep -i x-ratelimit-remaining h.txt|tr -d '\r') $(grep -i access-control-allow-origin h.txt|tr -d '\r')"
  curl -s -o /dev/null -w "  etag tekrar: %{http_code}\n" -H 'Accept: application/vnd.github.raw+json' -H "If-None-Match: $E" "$A"; sleep 35
done
