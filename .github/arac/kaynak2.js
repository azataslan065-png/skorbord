const al = async (u, h) => { try{ const r = await fetch(u, { headers: Object.assign({ 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, h || {}) }); const t = await r.text(); let j = null; try{ j = JSON.parse(t); }catch(e){} return { s: r.status, j, t: t.slice(0, 300) }; }catch(e){ return { s: 'HATA ' + e.message }; } };
(async () => {
  for(const sl of ['tur.cup', 'tur.super_cup', 'tur.supercup', 'tur.turkish_cup', 'tur.kupa']){ const r = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + sl + '/scoreboard'); const l = r.j && r.j.leagues && r.j.leagues[0]; console.log('ESPN', sl, r.s, l ? (l.name + ' sezon ' + (l.season && l.season.year)) : r.t.slice(0, 80)); }
  const a = await al('https://www.thesportsdb.com/api/v1/json/123/all_leagues.php'); const L = (a.j && a.j.leagues) || [];
  console.log('TSDB tüm lig', L.length, L.filter(x => /turk|türk/i.test(x.strLeague + ' ' + (x.strLeagueAlternate || ''))).map(x => x.idLeague + ':' + x.strLeague).join(' | '));
  for(const id of ['4677', '4678', '5492', '4837']){ const r = await al('https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=' + id); const l = r.j && r.j.leagues && r.j.leagues[0]; console.log('TSDB lig', id, l ? l.strLeague + ' ' + l.strCountry + ' ' + l.strCurrentSeason : r.t.slice(0, 60)); await new Promise(z => setTimeout(z, 2200)); }
  // FIFA sıralaması
  let f = await al('https://inside.fifa.com/api/ranking-overview?locale=en&dateId=&rankingType=football'); console.log('FIFA1', f.s, f.t.slice(0, 200));
  f = await al('https://api.fifa.com/api/v3/fifarankings/rankings/rankingsbyschedule?rankingScheduleId=&language=en'); console.log('FIFA2', f.s, f.t.slice(0, 200));
  f = await al('https://inside.fifa.com/api/ranking-overview?locale=en'); console.log('FIFA3', f.s, f.t.slice(0, 300));
  // UEFA katsayıları
  let u = await al('https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=MEN_ASSOCIATION&language=EN&page=1&pagesize=60&seasonYear=2027'); console.log('UEFA ülke', u.s, u.t.slice(0, 300));
  u = await al('https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=MEN_CLUB&language=EN&page=1&pagesize=10&seasonYear=2027'); console.log('UEFA kulüp', u.s, u.t.slice(0, 300));
  // Hakemler: ESPN özetinde görevliler
  for(const sl of ['tur.1', 'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'uefa.champions', 'ned.1', 'por.1', 'bra.1', 'usa.1']){
    const sb = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + sl + '/scoreboard?dates=20261101-20261117'); let e = ((sb.j && sb.j.events) || []).filter(x => x.status && x.status.type && x.status.type.completed);
    if(!e.length){ const s2 = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + sl + '/scoreboard?dates=20261108'); e = ((s2.j && s2.j.events) || []).filter(x => x.status && x.status.type && x.status.type.completed); }
    const ev = e[e.length - 1]; if(!ev){ console.log('HAKEM', sl, 'maç yok'); continue; }
    const s = await al('https://site.api.espn.com/apis/site/v2/sports/soccer/' + sl + '/summary?event=' + ev.id); const o = ((s.j || {}).gameInfo || {}).officials || [];
    console.log('HAKEM', sl, o.length, JSON.stringify(o.map(x => (x.position && (x.position.displayName || x.position.name)) + '=' + (x.fullName || x.displayName))).slice(0, 300), 'yayın', JSON.stringify(((s.j || {}).broadcasts || []).slice(0, 2)).slice(0, 150));
  }
})();
