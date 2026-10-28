# Baut die öffentliche Webversion aus der App: python3 -I build_web.py <app.html> <shim.html.part> <ziel/index.html>
import sys
app=open(sys.argv[1],encoding='utf-8').read(); shim=open(sys.argv[2],encoding='utf-8').read()
head='<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="robots" content="noindex,nofollow">\n<meta name="theme-color" content="#0028ff">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
cut=app.index('<main id="app"'); top=app[:cut]; body=app[cut:]
out=head+top+'</head>\n<body>\n'+shim+body+'\n</body>\n</html>\n'
out=out.replace("Diese Seite braucht den Claude-Speicher. Öffne sie in der Claude-App oder auf claude.ai.","Die Hefte lassen sich gerade nicht laden.")
out=out.replace("Der Speicher ist in dieser Ansicht nicht verfügbar. Öffne die Seite in der Claude-App, angemeldet mit deinem Konto.","Speicher nicht verfügbar. Bitte den privaten Modus ausschalten.")
open(sys.argv[3],'w',encoding='utf-8').write(out); print("Webversion gebaut:", len(out), "Zeichen")
