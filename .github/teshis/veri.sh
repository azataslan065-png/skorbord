#!/bin/bash
# Gerçek ESPN yanıtlarını olduğu gibi "teshis" dalına kaydeder (uygulama bunlarla tarayıcıda sınanır).
set +e
mkdir -p out
python3 - <<'PY'
import urllib.request,urllib.parse,re,json,gzip,datetime,os
S='https://site.api.espn.com/apis/site/v2/sports/soccer/'; V='https://site.api.espn.com/apis/v2/sports/soccer/'
def ad(u):
    x=urllib.parse.urlsplit(u); k=x.path+'?'+x.query
    k=re.sub(r'^/apis/','',k); k=re.sub(r'[^A-Za-z0-9.]+','_',k); return re.sub(r'_+$','',k)+'.json'
def al(u):
    try:
        r=urllib.request.Request(u,headers={'Accept-Encoding':'gzip','User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(r,timeout=60) as f:
            b=f.read()
            if f.headers.get('Content-Encoding')=='gzip': b=gzip.decompress(b)
        open('out/'+ad(u),'wb').write(b); print('OK',len(b),u); return json.loads(b)
    except Exception as e:
        print('HATA',e,u); return None
now=datetime.datetime.utcnow()
for d in (-1,0,1,2):
    al(S+'all/scoreboard?dates='+(now+datetime.timedelta(days=d)).strftime('%Y%m%d')+'&limit=1000')
for lg in ('tur.1','eng.1','uefa.champions'):
    t=al(S+lg+'/teams?limit=200'); al(S+lg+'/scoreboard'); al(S+lg+'/scoreboard?dates=2026&limit=1000'); al(S+lg+'/scoreboard?dates=2027&limit=1000'); al(V+lg+'/standings'); al(S+lg+'/statistics')
    if lg=='tur.1' and t:
        for x in t['sports'][0]['leagues'][0]['teams']: al(S+lg+'/teams/'+x['team']['id']+'/roster')
y=json.load(open('out/'+ad(S+'tur.1/scoreboard?dates=2026&limit=1000')))
son=[e for e in y['events'] if e['status']['type']['state']=='post' and e.get('season',{}).get('year')==2026]
son.sort(key=lambda e:e['date'])
for e in son[-9:]:
    al(S+'all/summary?event='+e['id'])
print('son maçlar',[e['id'] for e in son[-9:]])
PY
ls -la out | head -80
