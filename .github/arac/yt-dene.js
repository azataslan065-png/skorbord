// Geçici deneme: yeni yayın + YouTube toplayıcısını çalıştırır, sonucu yazdırır (kaydetmez).
const cp = require('child_process'), fs = require('fs');
const out = cp.spawnSync('node', ['.github/arac/veri-topla.js', 'yayin', 'youtube'], { encoding: 'utf8', timeout: 25 * 60e3 });
console.log('ÇIKTI', (out.stdout || '').split('\n').filter(l => /YAYIN|EPG|TRT|YOUTUBE/.test(l)).join('\n').slice(0, 3000), (out.stderr || '').slice(-800));
const y = JSON.parse(fs.readFileSync('veri/yayin.json', 'utf8')); const say = {}; y.liste.forEach(x => { say[x.k] = (say[x.k] || 0) + 1; }); console.log('KANALLAR', JSON.stringify(say));
y.liste.filter(x => /Nassr|Ahli|Hilal|Ittihad|Türkiye|Turkey/i.test(x.ad) && x.g >= '2026-11-20').slice(0, 30).forEach(x => console.log('SATIR', x.g, x.s, x.k, '|', x.ad.slice(0, 90)));
const t = JSON.parse(fs.readFileSync('veri/youtube.json', 'utf8')); console.log('YT', t.liste.length, JSON.stringify(t.liste).slice(0, 800));
