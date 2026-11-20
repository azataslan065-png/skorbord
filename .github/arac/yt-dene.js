// Geçici deneme: yayın + YouTube toplayıcısı (kaydetmez)
const cp = require('child_process'), fs = require('fs');
const out = cp.spawnSync('node', ['.github/arac/veri-topla.js', 'yayin', 'youtube'], { encoding: 'utf8', timeout: 25 * 60e3 });
console.log('ÇIKTI', (out.stdout || '').split('\n').filter(l => /YOUTUBE/.test(l)).join('\n').slice(0, 1500), (out.stderr || '').slice(-600));
const t = JSON.parse(fs.readFileSync('veri/youtube.json', 'utf8')); t.liste.forEach(x => console.log('YT', x.lig, x.ev, '-', x.dep, '|', x.k, x.v, x.surekli ? '7/24' : ''));
