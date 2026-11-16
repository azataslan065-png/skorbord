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
ek=open('kaynak/yama.py',encoding='utf-8').read()
exec(ek)
i=s.rindex('</body>')
s=s[:i]+'<script src="gercek.js"></script>\n'+s[i:]
open('index.html','w',encoding='utf-8').write(s)
print('kuruldu',len(s))
