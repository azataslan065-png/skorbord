// Geçici deneme: yeni toplayıcıyı (TFF + yayın) çalıştırır, sonucu yazdırır (kaydetmez).
const cp = require('child_process'), fs = require('fs');
const out = cp.spawnSync('node', ['.github/arac/veri-topla.js', 'tff', 'yayin'], { encoding: 'utf8', timeout: 25 * 60e3 });
console.log('ÇIKTI', (out.stdout || '').slice(-2500), (out.stderr || '').slice(-1500));
const tff = JSON.parse(fs.readFileSync('veri/tff-tur.2.json', 'utf8'));
tff.mac.filter(m => m.h === 15).forEach(m => console.log('HAFTA15', m.ev, '-', m.dep, '|', m.hk ? m.hk.referee + ' / ' + m.hk.assistRef1 + ' / ' + m.hk.assistRef2 + ' / ' + m.hk.fourthRef : 'HAKEM YOK'));
const t1 = JSON.parse(fs.readFileSync('veri/tff-tur.1.json', 'utf8')); const sim = Date.now();
t1.mac.filter(m => m.z && Math.abs(Date.parse(m.z) - sim) < 4 * 864e5).forEach(m => console.log('SÜPERLİG', m.z, m.ev, '-', m.dep, '|', m.hk ? m.hk.referee + (m.hk.varRef ? ' VAR ' + m.hk.varRef : '') : 'HAKEM YOK'));
const y = JSON.parse(fs.readFileSync('veri/yayin.json', 'utf8'));
y.liste.filter(x => /ĞDIR|IĞDIR|Iğdır|Igdır|MARDİN|KAYSERİ|KARAGÜMRÜK|BATMAN|BURSASPOR|EROKSPOR/i.test(x.ad)).forEach(x => console.log('YAYIN', x.g, x.s, x.k, '|', x.ad.slice(0, 90)));
