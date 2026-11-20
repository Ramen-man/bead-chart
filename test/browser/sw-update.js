// Updates must arrive as a whole set: editing one file on the server must NOT
// leak into the installed app until sw.js's version changes.
const { chromium } = require(process.argv[2]);
const fs = require('fs'), { execSync, spawn } = require('child_process');
const SITE = require('os').tmpdir() + '/bead-sw-site';
(async () => {
  execSync(`rm -rf ${SITE} && mkdir -p ${SITE} && cp perler.html index.html beads.js chart.js sw.js manifest.json icon-*.png ${SITE}/`);
  const srv = spawn('python3', ['-c', `
import http.server, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
http.server.ThreadingHTTPServer(('', 8766), functools.partial(H, directory='${SITE}')).serve_forever()`], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ executablePath: process.env.CH });
  const page = await (await b.newContext()).newPage();
  const url = 'http://localhost:8766/perler.html';
  await page.goto(url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();

  fs.appendFileSync(`${SITE}/beads.js`, '\nwindow.__v = 2;\n');       // server gets a new beads.js only
  await page.reload(); await page.waitForTimeout(500); await page.reload();
  console.log('partial update leaked:', await page.evaluate(() => window.__v === 2));

  const sw = fs.readFileSync(`${SITE}/sw.js`, 'utf8').replace(/beads-v\d+/, 'beads-v999');
  fs.writeFileSync(`${SITE}/sw.js`, sw);                               // release: bump version
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await page.waitForTimeout(1500);
  await page.reload();
  console.log('versioned update arrived:', await page.evaluate(() => window.__v === 2));
  await b.close(); srv.kill();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
