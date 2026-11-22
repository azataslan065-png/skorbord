#!/bin/bash
R=https://raw.githubusercontent.com/azataslan065-png/skorbord/canli-fm/fm.json
for i in 1 2 3 4 5 6; do
  A=$(curl -s "$R" | jq -r .t); B=$(curl -s "$R?t=$RANDOM$i" | jq -r .t); H=$(curl -sI "$R?t=$RANDOM" | grep -i "x-cache:\|cache-control" | tr -d '\r' | tr '\n' ' ')
  echo "$(date -u +%T) sorgusuz=$A sorgulu=$B $H"; sleep 40
done
