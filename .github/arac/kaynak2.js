// Deneme 37: TFF logo klasöründe lig logoları (aday adlar)
(async () => {
  const kok = ['https://www.tff.org/Resources/TFF/Images/0000000015/TFF/TFF-Logolar/Orjinal/', 'https://www.tff.org/Resources/TFF/Images/0000000015/TFF/TFF-Logolar/'];
  const ad = ['nesine-2-lig', 'nesine-3-lig', 'trendyol-1-lig', 'trendyol-super-lig', 'ziraat-turkiye-kupasi', 'turkcell-super-kupa', 'nesine-2-lig-logo', 'nesine-3-lig-logo', 'trendyol-1-lig-logo', 'nesine2lig', 'nesine3lig', 'trendyol1lig', 'nesine-2-lig-page', 'trendyol-1-lig-page', 'trendyol-super-lig-page', 'ziraat-turkiye-kupasi-page'];
  for (const k of kok) for (const a of ad) for (const u of ['.png', '.jpg', '.svg']) {
    try { const r = await fetch(k + a + u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' } }); if (r.status === 200) { const b = Buffer.from(await r.arrayBuffer()); let wh = ''; if (u === '.png') wh = b.readUInt32BE(16) + 'x' + b.readUInt32BE(20); console.log('VAR', k + a + u, b.length, wh, r.headers.get('content-type')); } } catch (e) {}
  }
  console.log('BITTI');
})();
