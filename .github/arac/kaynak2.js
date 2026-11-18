// Deneme 35: Commons dosya araması (güncel sponsorlu lig logoları)
const al = async u => { try{ const r = await fetch(u, { headers: { 'User-Agent': 'SkorbordBot/1.0 (github.com/skorbord)' }, signal: AbortSignal.timeout(30000) }); return await r.json(); }catch(e){ return null; } };
(async () => {
  for (const q of ['Trendyol 1. Lig logo', 'Nesine 2. Lig logo', 'Nesine 3. Lig logo', 'Turkcell Süper Kupa logo', 'TFF 2. Lig logo', 'TFF 3. Lig logo', 'UEFA Euro 2028 logo', 'FIFA World Cup 2026 logo', 'Copa America logo', 'Belgian Pro League logo', 'J1 League logo', 'A-League Men logo', 'Liga FPD logo', 'Bolivia División Profesional logo', 'Turkish Super Cup logo']) {
    for (const site of ['commons.wikimedia.org', 'tr.wikipedia.org', 'en.wikipedia.org']) {
      const j = await al('https://' + site + '/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=6&srsearch=' + encodeURIComponent(q));
      console.log('ARA', site.split('.')[0], q, '→', ((j && j.query && j.query.search) || []).map(x => x.title).join(' | '));
    }
  }
})();
