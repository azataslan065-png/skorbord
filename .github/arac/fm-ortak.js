/* FotMob maç ayrıntısını kısa biçime çevirir. Hem uygulama (gercek.js'te aynı işlev) hem toplayıcı (fm-canli.js) aynı biçimi kullanır.
   Çıktı: {id, ev, dep, dk, bitti, bas, mom:[[dk,değer]], sut:[[x,y,tür,ev(1/0),dk,oyuncu,xG]], olay:[[dk,tür,ev(1/0),oyuncu,ikinci]], ist:{ad:[ev,dep]}}
   Şut koordinatı: x 0-105 (şutu atan takımın hücum yönü 105'e), y 0-68. Baskı: + ev sahibi, − deplasman (FotMob "momentum"). */
function fmKisa(md){
  var g=md.general||{}, h=md.header||{}, c=md.content||{}, st=h.status||{}, hid=(g.homeTeam||{}).id;
  var o={id:+g.matchId, ev:(g.homeTeam||{}).name||'', dep:(g.awayTeam||{}).name||'', bas:!!g.started, bitti:!!g.finished,
    dk:((st.liveTime||{}).short||'').replace(/[^0-9+]/g,''), t:Date.now()};
  var mom=(((c.momentum||{}).main||{}).data)||[]; o.mom=mom.filter(function(d){ return d&&d.value!=null; }).map(function(d){ return [d.minute, Math.round(d.value)]; });
  o.sut=(((c.shotmap||{}).shots)||[]).map(function(s){ return [Math.round(s.x*10)/10, Math.round(s.y*10)/10, s.isOwnGoal?'kk':(s.eventType||''), s.teamId===hid?1:0, (s.min||0)+(s.minAdded||0), s.playerName||'', s.expectedGoals!=null?Math.round(s.expectedGoals*100)/100:null, s.situation||'']; });
  o.olay=((((c.matchFacts||{}).events)||{}).events||[]).filter(function(e){ return /^(Goal|Card|Substitution)$/.test(e.type); }).map(function(e){
    var tur=e.type==='Goal'?(e.ownGoal?'kk':'gol'):e.type==='Card'?(/red/i.test(e.card||'')?'kirmizi':'sari'):'degisiklik';
    var oy=(e.player&&e.player.name)||e.fullName||'', iki='';
    if(e.type==='Substitution'&&e.swap&&e.swap.length){ oy=(e.swap[0]||{}).name||oy; iki=(e.swap[1]||{}).name||''; }
    return [(e.time||0)+(e.overloadTime||0), tur, e.isHome?1:0, oy, iki]; });
  var ist={}, ad={BallPossesion:'top',expected_goals:'xg',total_shots:'sut',ShotsOnTarget:'isabet',corners:'korner',fouls:'faul',Offsides:'ofsayt'};
  try{ (((c.stats||{}).Periods||{}).All||{}).stats.forEach(function(grp){ (grp.stats||[]).forEach(function(s){ var k=ad[s.key]; if(k&&s.stats&&s.stats.length===2&&!ist[k]) ist[k]=s.stats; }); }); }catch(e){}
  o.ist=ist;
  return o;
}
if(typeof module!=='undefined') module.exports={fmKisa:fmKisa};
