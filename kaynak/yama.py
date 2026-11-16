
# Alt şerit: bugünün bütün maçları (gerçek veri modülü verirse) - üç yerde aynı satır
_eski="const weekMatches=(week!=null?Object.values((D.matches)||{}).filter(m=>Number(m.week)===week):[]).sort((a,b)=>(a.homeId>b.homeId?1:-1));"
_yeni="const weekMatches=(window.__sbSerit&&window.__sbSerit.on())?window.__sbSerit.matches():(week!=null?Object.values((D.matches)||{}).filter(m=>Number(m.week)===week):[]).sort((a,b)=>(a.homeId>b.homeId?1:-1));"
rep(_eski,_yeni,3)
_t="const teams=(typeof D!=='undefined'&&D.teams)||{};"
_n=s.count(_t); assert _n>=2,_n
s=s.replace(_t,"const teams=Object.assign({},(typeof D!=='undefined'&&D.teams)||{},(window.__sbSerit&&window.__sbSerit.on())?window.__sbSerit.teams():null);")
# Uygulama adı
s=re.sub(r'<title>[^<]*</title>','<title>Skorbord</title>',s,count=1)
