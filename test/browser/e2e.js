const { chromium } = require(process.argv[2]);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CH });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));

  await page.goto('http://localhost:8765/perler.html');
  await page.evaluate(() => navigator.serviceWorker.ready);
  console.log('SW controlling after reload:', await page.reload().then(() => page.evaluate(() => !!navigator.serviceWorker.controller)));

  // real file upload
  await page.setInputFiles('#file', 'test/sample.png');
  await page.waitForFunction(() => !document.getElementById('save').disabled);
  const header = await page.evaluate(() => document.getElementById('out').width + 'x' + document.getElementById('out').height);
  console.log('chart canvas:', header);

  // slider changes re-render
  await page.fill('#colors', '3'); await page.dispatchEvent('#colors', 'input');
  await page.waitForFunction(() => document.getElementById('cOut').value === '3');
  console.log('colors output:', await page.textContent('#cOut'));

  // save PNG
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  console.log('download:', dl.suggestedFilename());

  // iPhone-style save: share sheet with a PNG file when available
  const shared = await page.evaluate(async () => {
    let got = null;
    navigator.canShare = d => !!(d && d.files);
    navigator.share = async d => { got = d.files[0].name + ':' + d.files[0].type; };
    document.getElementById('save').click();
    for (let i = 0; i < 50 && !got; i++) await new Promise(r => setTimeout(r, 100));
    return got;
  });
  console.log('share:', shared);

  // canvas too big / out of memory: toBlob gives null -> message, no crash
  const nullBlob = await page.evaluate(async () => {
    let msg = null; window.alert = m => { msg = m; };
    delete navigator.canShare; delete navigator.share;
    HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null); };
    document.getElementById('save').click();
    await new Promise(r => setTimeout(r, 200));
    return msg;
  });
  console.log('null blob alert:', nullBlob);

  // offline
  await ctx.setOffline(true);
  await page.reload();
  console.log('offline title:', await page.title());
  await page.setInputFiles('#file', 'test/sample.png');
  await page.waitForFunction(() => !document.getElementById('save').disabled);
  console.log('offline render ok, canvas w:', await page.evaluate(() => document.getElementById('out').width));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
