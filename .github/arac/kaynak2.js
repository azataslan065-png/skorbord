const al = async (u) => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json,text/html' } }); const t = await r.text(); let j = null; try{ j = JSON.parse(t); }catch(e){} return { s: r.status, j, t }; }catch(e){ return { s: 'HATA ' + e.message, t: '' }; } };
(async () => {
  const u1 = await al('https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=MEN_ASSOCIATION&language=EN&page=1&pagesize=60&seasonYear=2027');
  console.log('UEFA_ULKE', u1.s, JSON.stringify(u1.j && u1.j.data && u1.j.data.members && u1.j.data.members[9]).slice(0, 1500), 'adet', u1.j && u1.j.data && u1.j.data.members.length);
  const u2 = await al('https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=MEN_CLUB&language=EN&page=1&pagesize=500&seasonYear=2027');
  console.log('UEFA_KULUP', u2.s, JSON.stringify(u2.j && u2.j.data && u2.j.data.members && u2.j.data.members[30]).slice(0, 1500), 'adet', u2.j && u2.j.data && u2.j.data.members.length);
  const h = await al('https://inside.fifa.com/fifa-world-ranking/men'); const ids = [...new Set((h.t.match(/id1\d{4}/g) || []))].sort(); console.log('FIFA_IDS', ids.slice(-8).join(','), ids.length);
  const son = ids[ids.length - 1]; const f = await al('https://inside.fifa.com/api/ranking-overview?locale=en&dateId=' + son); const r = (f.j && f.j.rankings) || [];
  console.log('FIFA', son, f.s, r.length, JSON.stringify(r[21]).slice(0, 900)); console.log('FIFA_UST', JSON.stringify(Object.keys(f.j || {})));
})();
