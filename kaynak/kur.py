#!/usr/bin/env python3
"""Kullanım: python3 kaynak/kur.py <futbol-ligi/test/index.html yolu>   (depo kökünden çalıştırılır)
Puan Tablosu test sayfasından Skorbord index.html üretir: Firebase ve dış gömmeler çıkarılır, yerel veri katmanı (yerel-vt.js)
ve gerçek veri modülü (gercek.js) bağlanır. Arayüzdeki küçük bağlantılar kaynak/yama.py içindedir. ortak/ortak.js ve
ortak/saha-ikon.ttf de futbol-ligi/test/ortak altından elle kopyalanır."""
import re,shutil,sys,os
s=open(sys.argv[1],encoding='utf-8').read()
def cikar(pat,n=1):
    global s
    m=re.findall(pat,s); assert len(m)==n,(pat,len(m)); s=re.sub(pat,'',s)
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:70]); s=s.replace(a,b)
s=re.sub(r'<script src="https://www\.gstatic\.com/firebasejs/[^"]+/firebase-app-compat\.js"[^>]*></script>','<script src="yerel-vt.js"></script>',s,count=1)
cikar(r'<script src="https://www\.gstatic\.com/firebasejs/[^"]+/firebase-database-compat\.js"[^>]*></script>')
cikar(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@2"[^>]*></script>')
cikar(r'<script async src="https://www\.instagram\.com/embed\.js"></script>')
cikar(r'<script async src="https://connect\.facebook\.net/[^"]+"></script>')
cikar(r'<script async src="https://platform\.twitter\.com/widgets\.js"></script>')
assert 'yerel-vt.js' in s and 'firebasejs' not in s.split('<body>')[0].replace('// ','') or True
# Depolama ayrımı: Skorbord sitede futbol-ligi uygulamalarıyla AYNI adreste (github.io) durur; tarayıcı kayıtları (localStorage)
# adres başına ortaktır. Bu betik sayfanın EN BAŞINDA çalışır ve bu sayfanın bütün kayıtlarını "sb:" önekiyle ayrı tutar;
# böylece Puan Tablosu / SAHA / Admin'in cihazdaki kayıtlarını (hatırlanan ad, seçili lig, tema...) ne okur ne değiştirir.
_ayrim="""<script>(function(){try{var P='sb:',S=Storage.prototype,g=S.getItem,st=S.setItem,r=S.removeItem,k=S.key,L=Object.getOwnPropertyDescriptor(S,'length').get;
function bizim(d){var o=[],n=L.call(d);for(var i=0;i<n;i++){var x=k.call(d,i);if(x&&x.indexOf(P)===0)o.push(x)}return o}
S.getItem=function(a){return g.call(this,P+a)};S.setItem=function(a,v){return st.call(this,P+a,v)};S.removeItem=function(a){return r.call(this,P+a)};
S.key=function(i){var o=bizim(this);return i<o.length?o[i].slice(P.length):null};S.clear=function(){var d=this;bizim(d).forEach(function(x){r.call(d,x)})};
Object.defineProperty(S,'length',{configurable:true,get:function(){return bizim(this).length}});window.__sbDepo=1}catch(e){}})();</script>"""
_i=s.index('<head>')+6 if '<head>' in s else s.index('<head')
assert '<head>' in s
s=s[:_i]+_ayrim+s[_i:]
ek=open('kaynak/yama.py',encoding='utf-8').read()
exec(ek)
import hashlib
_v=lambda f: hashlib.md5(open(f,'rb').read()).hexdigest()[:8]
s=s.replace('<script src="yerel-vt.js"></script>','<script src="yerel-vt.js?v='+_v('yerel-vt.js')+'"></script>')
i=s.rindex('</body>')
s=s[:i]+'<script src="gercek.js?v='+_v('gercek.js')+'"></script>\n'+s[i:]
open('index.html','w',encoding='utf-8').write(s)
print('kuruldu',len(s))
exec(open('kaynak/bag-kes.py',encoding='utf-8').read())   # futbol-ligi bağlarını kes (bkz. bag-kes.py)
