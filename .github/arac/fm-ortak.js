/* FotMob maç ayrıntısını kısa biçime çevirir. Uygulama (gercek.js'te aynı işlev) ve toplayıcı (fm-canli.js) aynı biçimi kullanır.
   Çıktı: {id, ev, dep, dk, iy, bitti, bas, skor:[ev,dep], mom:[[dk,değer]], sut:[[x,y,tür,ev(1/0),dk,oyuncu,xG,durum]], olay:[[dk,tür,ev(1/0),oyuncu,ikinci]],
   uz:[[devre,dakika]] (hakemin verdiği uzatma), diz:{ev:[[no,ad,x,y,kart]],dep:[...],fev,fdep} (sahadaki oyuncular), ist:{ad:[ev,dep]}}
   Şut koordinatı: x 0-105 (şutu atan takımın hücum yönü 105'e), y 0-68. Dizilişte x 0-1 kendi kalesinden, y 0-1. Baskı: + ev sahibi, − deplasman. */
function fmKisa(md){
  var g=md.general||{}, h=md.header||{}, c=md.content||{}, st=h.status||{}, hid=(g.homeTeam||{}).id, lt=st.liveTime||{};
  var o={id:+g.matchId, ev:(g.homeTeam||{}).name||'', dep:(g.awayTeam||{}).name||'', bas:!!g.started, bitti:!!g.finished,
    dk:String(lt.short||'').replace(/[^0-9+]/g,''), iy:/^HT$/i.test(String(lt.short||'').replace(/[^A-Za-z]/g,'')), t:Date.now()};
  var sk=/(\d+)\s*-\s*(\d+)/.exec(st.scoreStr||''); if(sk) o.skor=[+sk[1],+sk[2]];
  var mom=(((c.momentum||{}).main||{}).data)||[]; o.mom=mom.filter(function(d){ return d&&d.value!=null; }).map(function(d){ return [d.minute, Math.round(d.value)]; });
  o.sut=(((c.shotmap||{}).shots)||[]).map(function(s){ return [Math.round(s.x*10)/10, Math.round(s.y*10)/10, s.isOwnGoal?'kk':(s.isBlocked?'Blocked':(s.eventType||'')), s.teamId===hid?1:0, (s.min||0)+(s.minAdded||0), s.playerName||'', s.expectedGoals!=null?Math.round(s.expectedGoals*100)/100:null, s.situation||'']; });
  var evs=(((c.matchFacts||{}).events)||{}).events||[];
  o.olay=evs.filter(function(e){ return /^(Goal|Card|Substitution)$/.test(e.type); }).map(function(e){
    var tur=e.type==='Goal'?(e.ownGoal?'kk':'gol'):e.type==='Card'?(/red/i.test(e.card||'')?'kirmizi':'sari'):'degisiklik';
    var oy=(e.player&&e.player.name)||e.fullName||'', iki='';
    if(e.type==='Substitution'&&e.swap&&e.swap.length){ oy=(e.swap[0]||{}).name||oy; iki=(e.swap[1]||{}).name||''; }
    return [(e.time||0)+(e.overloadTime||0), tur, e.isHome?1:0, oy, iki]; });
  o.yari=evs.filter(function(e){ return e.type==='Half'; }).map(function(e){ return [e.time||0, e.halfStrShort||'']; });
  o.uz=evs.filter(function(e){ return e.type==='AddedTime'; }).map(function(e){ var n=+e.minutesAddedInput||parseInt(String(e.minutesAddedStr||'').replace(/[^0-9]/g,''),10)||0; return [e.time>45?2:1, n]; });
  // sahadaki oyuncular: ilk 11; değişikliklerde giren oyuncu çıkanın yerini alır, kırmızı kart gören sahadan çıkar
  try{
    var L=c.lineup||{}, diz={}, tk=[['ev',L.homeTeam,true],['dep',L.awayTeam,false]];
    tk.forEach(function(x){ var T=x[1]; if(!T||!T.starters||!T.starters.length) return;
      var yedek={}; (T.subs||[]).forEach(function(p){ yedek[String(p.id)]=p; });
      var cur=T.starters.map(function(p){ var l=p.horizontalLayout||{}; return {id:String(p.id), no:p.shirtNumber||'', ad:p.lastName||p.name||'', x:l.x, y:l.y, k:''}; });
      evs.filter(function(e){ return e.isHome===x[2]; }).sort(function(a,b){ return (a.time||0)-(b.time||0); }).forEach(function(e){
        if(e.type==='Substitution'&&e.swap&&e.swap.length>1){ var gir=String(e.swap[0].id), cik=String(e.swap[1].id), p=yedek[gir]||{};
          cur.forEach(function(q){ if(q.id===cik){ q.id=gir; q.no=p.shirtNumber||''; q.ad=p.lastName||p.name||e.swap[0].name||''; q.k=''; } }); }
        if(e.type==='Card'&&e.player){ var pid=String(e.player.id); cur.forEach(function(q){ if(q.id===pid) q.k=/red/i.test(e.card||'')?'k':(q.k||'s'); }); }
      });
      diz[x[0]]=cur.filter(function(q){ return q.k!=='k'&&q.x!=null; }).map(function(q){ return [q.no, q.ad, Math.round(q.x*1000)/1000, Math.round(q.y*1000)/1000, q.k]; });
      diz['f'+x[0]]=T.formation||''; });
    if(diz.ev||diz.dep) o.diz=diz;
  }catch(e){}
  var ist={}, ad={BallPossesion:'top',expected_goals:'xg',total_shots:'sut',ShotsOnTarget:'isabet',corners:'korner',fouls:'faul',Offsides:'ofsayt'};
  try{ (((c.stats||{}).Periods||{}).All||{}).stats.forEach(function(grp){ (grp.stats||[]).forEach(function(s){ var k=ad[s.key]; if(k&&s.stats&&s.stats.length===2&&!ist[k]) ist[k]=s.stats; }); }); }catch(e){}
  o.ist=ist;
  return o;
}
/* FotMob gün listesi -> canlı / yeni bitmiş maçların skor ve durumu (skor şeridi ve listeler için; ESPN'den hızlı) */
function fmDurum(j, simdi){
  var out=[]; ((j&&j.leagues)||[]).forEach(function(l){ (l.matches||[]).forEach(function(m){ var s=m.status||{}; if(!s.started||s.cancelled) return;
    var z=Date.parse(s.utcTime||''); if(s.finished&&simdi-z>4*3600e3) return;
    var lt=s.liveTime||{}, sk=/(\d+)\s*-\s*(\d+)/.exec(s.scoreStr||'');
    out.push({ev:(m.home||{}).name||'', dep:(m.away||{}).name||'', z:s.utcTime, skor:sk?[+sk[1],+sk[2]]:null, dk:String(lt.short||'').replace(/[^0-9+]/g,''), iy:/^HT$/i.test(String(lt.short||'').replace(/[^A-Za-z]/g,'')), bitti:!!s.finished, uz:lt.addedTime||0}); }); });
  return out;
}
if(typeof module!=='undefined') module.exports={fmKisa:fmKisa, fmDurum:fmDurum};
