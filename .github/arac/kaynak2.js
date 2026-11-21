// Deneme 56: ekip toplayıcısının Kim Anlatıyor (DuckDuckGo) yolu - yalnız ekip adımı çalışır, sonuç yazdırılır (kaydedilmez)
(async () => {
  if (process.env.PARCA !== '0') return;
  const { execSync } = require('child_process'), fs = require('fs');
  try { console.log(execSync('node .github/arac/veri-topla.js ekip', { encoding: 'utf8', timeout: 20 * 60e3 }).split('\n').filter(l => /EKİP|HATA/.test(l)).join('\n').slice(0, 3000)); } catch (e) { console.log('HATA', e.message.slice(0, 500)); }
  const j = JSON.parse(fs.readFileSync('veri/ekip.json', 'utf8'));
  j.liste.forEach(x => console.log('EKIP', x.lig, x.ev, '-', x.dep, '| spiker:', x.spiker || '-', '| yorumcu:', (x.yorumcu || []).join(', ') || '-', '| kanal:', x.kanal || '-', x.kim ? '| KimAnlatıyor' : '', '|', (x.kaynak || [])[0] || ''));
})();
