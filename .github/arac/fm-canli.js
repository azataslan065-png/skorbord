// CANLI MAÇ AYRINTISI (FotMob): bugünkü (ve dünkü) Türkiye + büyük lig maçlarının baskı grafiği, şut haritası ve olayları.
// Web sürümü FotMob'a doğrudan ulaşamaz (tarayıcı izni yok), bu dosyayı okur; APK kendi bağlantısıyla FotMob'dan anlık alır.
// Çıktı: out/fm.json  {t, maclar:[kısa biçim + lig, z]}
const fs=require('fs'), path=require('path'), {fmKisa,fmDurum}=require('./fm-ortak.js');
const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const LIG=new Set([71,165,9906,8970,  47,48,87,140,55,86,54,146,53,110,57,61,64,40,  42,73,10216,10611,  50,77,44,45,  9907,9947,10195]);   // TR + büyük ligler + UEFA + milli
const CIKTI=process.argv[2]||'out/fm.json', ESKI=(()=>{ try{ return JSON.parse(fs.readFileSync(CIKTI,'utf8')); }catch(e){ return {maclar:[]}; } })();
const al=u=>fetch('https://www.fotmob.com/api/data/'+u,{headers:{'User-Agent':UA,Accept:'application/json'}}).then(r=>r.ok?r.json():null).catch(()=>null);
const gun=d=>new Date(d).toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}).replace(/-/g,'');
(async()=>{
  const now=Date.now(), liste=[];
  let durum=[];
  for(const d of [gun(now), gun(now-86400e3)]){ const j=await al('matches?date='+d+'&timezone=Europe/Istanbul'); durum=durum.concat(fmDurum(j, now)); ((j&&j.leagues)||[]).forEach(l=>{ if(LIG.has(l.primaryId)||l.ccode==='TUR') (l.matches||[]).forEach(m=>liste.push({m, lig:l.name})); }); }
  const eski={}; (ESKI.maclar||[]).forEach(x=>eski[x.id]=x);
  const out=[];
  for(const {m,lig} of liste){
    const s=m.status||{}, z=Date.parse(s.utcTime||''), bitti=!!s.finished, bas=!!s.started;
    if(!bas) continue; if(bitti && now-z>6*3600e3 && !eski[m.id]) continue;
    const e=eski[m.id];
    if(bitti && e && e.bitti){ out.push(e); continue; }   // bitmiş ve son hali alınmış
    const md=await al('matchDetails?matchId='+m.id); if(!md){ if(e) out.push(e); continue; }
    const k=fmKisa(md); k.lig=lig; k.z=s.utcTime; out.push(k);
  }
  fs.mkdirSync(path.dirname(CIKTI),{recursive:true});
  const kisa=x=>JSON.stringify(x.map(m=>Object.assign({},m,{t:0})));
  if(kisa(out)!==kisa(ESKI.maclar||[]) || JSON.stringify(durum)!==JSON.stringify(ESKI.durum||[])){ fs.writeFileSync(CIKTI, JSON.stringify({t:now, maclar:out, durum:durum})); console.log('güncellendi', out.length, 'maç', out.filter(x=>!x.bitti).length, 'canlı'); }
  else console.log('değişiklik yok', out.length);
})();
