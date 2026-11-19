// Deneme 53: Supabase depolama — kova içeriği (klasör bazında toplam boyut; dosya adları yazdırılmaz) ve erişim durumu
(async () => {
  if (process.env.PARCA !== '0') return;
  const U = 'https://oasyhelzshbehnpyrssw.supabase.co', K = 'sb_publishable_DxSYVhhxvfVw_yAA7xkS6A_s1Usv41C';
  const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
  const liste = async (onek) => { const r = await fetch(U + '/storage/v1/object/list/videos', { method: 'POST', headers: h, body: JSON.stringify({ prefix: onek, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }) }); return { s: r.status, j: await r.json().catch(() => null) }; };
  const kok = await liste(''); console.log('KÖK', kok.s, Array.isArray(kok.j) ? kok.j.length : JSON.stringify(kok.j).slice(0, 200));
  const top = {}; let tum = [];
  async function gez(onek, d){ if (d > 3) return; const r = await liste(onek); if (!Array.isArray(r.j)) return;
    for (const x of r.j) { if (x.id == null) await gez(onek + x.name + '/', d + 1); else { const b = (x.metadata && x.metadata.size) || 0; const k = onek.split('/')[0] || '(kök)'; top[k] = top[k] || { n: 0, b: 0 }; top[k].n++; top[k].b += b; tum.push({ k, b, t: (x.metadata && x.metadata.mimetype) || '', c: (x.metadata && x.metadata.cacheControl) || '', z: x.created_at }); } } }
  await gez('', 0);
  Object.entries(top).sort((a, b) => b[1].b - a[1].b).forEach(([k, v]) => console.log('KLASÖR', k.replace(/[^a-zA-Z_-]/g, '#').slice(0, 20), v.n, 'dosya', (v.b / 1048576).toFixed(1), 'MB'));
  tum.sort((a, b) => b.b - a.b); tum.slice(0, 15).forEach(x => console.log('BÜYÜK', x.k.replace(/[^a-zA-Z_-]/g, '#').slice(0, 20), (x.b / 1048576).toFixed(1), 'MB', x.t, x.c, (x.z || '').slice(0, 10)));
  const tur = {}; tum.forEach(x => { tur[x.t] = (tur[x.t] || 0) + x.b; }); console.log('TÜR', JSON.stringify(Object.fromEntries(Object.entries(tur).map(([k, v]) => [k, (v / 1048576).toFixed(1) + 'MB']))));
  const ccs = {}; tum.forEach(x => { ccs[x.c] = (ccs[x.c] || 0) + 1; }); console.log('CACHE', JSON.stringify(ccs));
  if (tum[0]) { const r = await fetch(U + '/storage/v1/object/public/videos/' + 'x-yok.mp4', { method: 'HEAD' }); console.log('ERİŞİM', r.status); }
})();
