// Deneme 49: TVF Sultanlar Ligi fikstür sekmesi (sitenin kendi Livewire çağrısı)
const de = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
(async () => {
  if (process.env.PARCA !== '0') return;
  const r = await fetch('https://tvf.org.tr/lig/sultanlar-ligi', { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36' } });
  const ck = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  const t = await r.text(); const sn = de(/wire:snapshot="([^"]+)"/.exec(t)[1]); const tok = /data-csrf="([^"]+)"/.exec(t)[1];
  const j0 = JSON.parse(sn); console.log('ÖNCE leagueFixture', JSON.stringify(j0.data.leagueFixture).slice(0, 300), 'currentWeek', JSON.stringify(j0.data.currentWeek));
  const body = { _token: tok, components: [{ snapshot: sn, updates: {}, calls: [{ path: '', method: 'setActiveTab', params: ['fikstur'] }] }] };
  const u = await fetch('https://tvf.org.tr/livewire/update', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Livewire': '', 'X-CSRF-TOKEN': tok, 'Cookie': ck, 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36', 'Referer': 'https://tvf.org.tr/lig/sultanlar-ligi' }, body: JSON.stringify(body) });
  const x = await u.text(); console.log('UPDATE', u.status, x.length);
  try{ const k = JSON.parse(x); const s2 = JSON.parse(k.components[0].snapshot); const f = JSON.stringify(s2.data.leagueFixture); console.log('FIKSTUR', f.length, f.slice(0, 3000)); console.log('HTML', (k.components[0].effects.html || '').replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').replace(/(\|\s*)+/g, '|').slice(0, 2500)); }catch(e){ console.log('HAM', x.slice(0, 800)); }
})();
