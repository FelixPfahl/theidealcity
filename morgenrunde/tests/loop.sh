#!/bin/bash
# Durchgang = 7 jsdom-Szenarien + Chromium-Durchlauf (hell und dunkel). Stoppt nach 10 fehlerfreien am Stück.
cd "$(dirname "$0")"
clean=0; i=0; : > loop_log.txt
while [ $clean -lt 10 ] && [ $i -lt 30 ]; do
  i=$((i+1)); seed=$((100+i))
  j=$(node run.js 1 $seed 2>&1 | head -5)
  b=$(python3 -I browser.py $seed 2>&1 | tail -1)
  if echo "$j" | grep -q "^OK" && echo "$b" | grep -q '"ok": true'; then clean=$((clean+1)); st=OK; else clean=0; st=FEHLER; fi
  echo "Durchgang $i (Seed $seed): $st | jsdom: $(echo "$j" | head -1) | browser: $b" >> loop_log.txt
  echo "Durchgang $i: $st (am Stück: $clean)"
  if [ "$st" = FEHLER ]; then echo "$j"; echo "$b"; break; fi
done
