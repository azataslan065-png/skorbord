// Deneme 48: TVF Livewire anlık görüntülerindeki alanlar (Sultanlar Ligi sayfası ve fikstür sayfası)
const al = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/124 Mobile Safari/537.36' } }); return r.text(); };
const de = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
(async () => {
  if (process.env.PARCA !== '0') return;
  for (const u of ['https://tvf.org.tr/lig/sultanlar-ligi', 'https://tvf.org.tr/lig-fikstur/sultanlar-ligi']) {
    const t = await al(u); const sn = [...t.matchAll(/wire:snapshot="([^"]+)"/g)].map(m => de(m[1]));
    console.log('=====', u, 'snapshot', sn.length);
    sn.forEach((s, i) => { try{ const j = JSON.parse(s); console.log('  S' + i, j.memo && j.memo.name, 'alanlar:', Object.keys(j.data || {}).join(','), '| boyut', s.length); const d = JSON.stringify(j.data); const k = d.search(/EVSAHIBI|TAKIM1|HomeTeam|MACTARIHI|Tarih/i); if (k >= 0) console.log('     MAÇ', d.slice(Math.max(0, k - 300), k + 900)); }catch(e){ console.log('  S' + i, 'json değil', s.slice(0, 200)); } });
    const w = [...new Set(t.match(/wire:(click|change|model)[a-z.]*="[^"]{0,80}"/g) || [])].slice(0, 20); console.log('  WIRE', w.join(' '));
  }
})();
