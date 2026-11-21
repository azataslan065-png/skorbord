// Deneme 58: kimAnlatiyorBul gerçek maçlarla (bugün oynanan Süper Lig maçları) - toplayıcı işlevleri doğrudan çağrılır, dosya yazılmaz
(async () => {
  if (process.env.PARCA !== '0') return;
  const fs = require('fs'), path = require('path'), Module = require('module');
  process.argv = [process.argv[0], 'x', 'yok-lig'];   // ana akış hiçbir lig işlemez
  const dosya = path.join(__dirname, 'veri-topla.js'), m = new Module(dosya, module); m.filename = dosya; m.paths = Module._nodeModulePaths(__dirname);
  m._compile(fs.readFileSync(dosya, 'utf8') + '\n;module.exports = { kimAnlatiyorBul };', dosya);
  await new Promise(r => setTimeout(r, 3000));
  for (const [ev, dep, z] of [['Galatasaray', 'Samsunspor', '2026-11-21T13:00:00Z'], ['Kocaelispor', 'Fenerbahçe', '2026-11-21T16:00:00Z'], ['Amed SFK', 'Rizespor', '2026-11-21T13:00:00Z'], ['Gençlerbirliği', 'Gaziantep FK', '2026-11-21T10:30:00Z']]) {
    const r = await m.exports.kimAnlatiyorBul({ ev, dep, z: Date.parse(z) });
    console.log('KA', ev, '-', dep, '| spiker:', r.spiker || '-', '| yorumcu:', r.yorumcu.join(', ') || '-', '| kanal:', r.kanal || '-', '|', r.kaynak[0] || '', '| haber özeti', r.metin.length);
  }
})();
