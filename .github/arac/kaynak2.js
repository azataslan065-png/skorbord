// Deneme 31: Skorbord uzak ayar yapısı (yalnız tasarım alanlarının varlığı; lig verisi yazdırılmaz)
(async () => {
  const r = await fetch('https://superlig-208e3-default-rtdb.europe-west1.firebasedatabase.app/skorbord.json?shallow=true'); const k = await r.json();
  console.log('kök', Object.keys(k || {}).join(' '));
  const g = async y => (await fetch('https://superlig-208e3-default-rtdb.europe-west1.firebasedatabase.app/skorbord/' + y + '.json')).json();
  console.log('activeDisplayLeague', JSON.stringify(await g('activeDisplayLeague')));
  const L = await (await fetch('https://superlig-208e3-default-rtdb.europe-west1.firebasedatabase.app/skorbord/leagues.json?shallow=true')).json();
  const M = await g('leaguesMeta') || {};
  for (const id of Object.keys(L || {})) {
    const s = await (await fetch('https://superlig-208e3-default-rtdb.europe-west1.firebasedatabase.app/skorbord/leagues/' + id + '.json?shallow=true')).json();
    console.log('== lig', id, 'meta.createdAt', M[id] && M[id].createdAt, 'alanlar:', Object.keys(s || {}).sort().join(','));
    for (const a of ['standingsAlign', 'rankNotes', 'standingsGap', 'statNumberSize', 'cardStyle', 'standingsWideLevel']) if (s && s[a] !== undefined) console.log('   ', a, JSON.stringify(await g('leagues/' + id + '/' + a)).slice(0, 1500));
  }
})();
