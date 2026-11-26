// Café Desktop: the Café studios in their own window, offline, reading and writing a folder on the thumb drive.
'use strict';
const { app, BrowserWindow, protocol, net, session, ipcMain, dialog, shell, Menu, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { DATA_FOLDER, driveRoot, inside, allowedUrl, safeName } = require('./paths');

// ---------- 1. Before anything starts: no network, no background services ----------
// Every host name fails to resolve, so nothing can reach the internet even by accident.
app.commandLine.appendSwitch('host-resolver-rules', 'MAP * ~NOTFOUND');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('no-pings');

// The data folder lives next to the program on the drive, so projects, saved files and
// the browser profile (remembered tabs, edited lessons) travel with the drive.
const ROOT = driveRoot(process.env, process.execPath, app.isPackaged, app.getAppPath());
const DATA = path.join(ROOT, DATA_FOLDER);
const APPS = path.join(__dirname, 'app');
for (const sub of ['', 'Projects', 'Data', 'Downloads', 'Apps']) {
  try { fs.mkdirSync(path.join(DATA, sub), { recursive: true }); } catch (e) { /* read-only drive: carry on */ }
}
try { app.setPath('userData', path.join(DATA, '.profile')); } catch (e) { /* keep the default */ }

// cafe:// is the app's own address scheme: cafe://app/... for the bundled pages, cafe://data/... for the drive folder.
protocol.registerSchemesAsPrivileged([
  { scheme: 'cafe', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
]);

// The pages may run inline scripts and new Function (the Dynamics Studio compiles equations that way),
// but may connect to nothing outside the app.
const CSP = "default-src cafe: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src cafe: data: blob:; img-src cafe: data: blob:; " +
  "font-src cafe: data:; frame-src cafe: data: blob: about:; worker-src cafe: blob: data:; form-action 'none'";

let win = null, blocked = 0;

function serve(base, rel) {
  const file = inside(base, decodeURIComponent(rel));
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('Not found', { status: 404 });
  return net.fetch(pathToFileURL(file).toString()).then(r => {
    const headers = new Headers(r.headers);
    headers.set('Content-Security-Policy', CSP);
    return new Response(r.body, { status: r.status, headers });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, title: 'Café', backgroundColor: '#eef2f0', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('cafe://app/index.html');

  // links that open new windows: our own pages open in-app; outside addresses are offered, never opened silently
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('cafe://')) return { action: 'allow' };
    askAboutOutsideLink(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('cafe://')) { e.preventDefault(); askAboutOutsideLink(url); } });
}

async function askAboutOutsideLink(url) {
  if (!/^https?:/i.test(url)) return;
  const r = await dialog.showMessageBox(win, {
    type: 'info', title: 'Outside link', message: 'Café works offline and does not open web pages.',
    detail: url, buttons: ['Copy address', 'Open in my usual browser', 'Cancel'], defaultId: 0, cancelId: 2
  });
  if (r.response === 0) clipboard.writeText(url);
  if (r.response === 1) shell.openExternal(url);
}

app.whenReady().then(() => {
  const ses = session.defaultSession;
  ses.setSpellCheckerEnabled(false);
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'clipboard-sanitized-write' || perm === 'fileSystem'));

  // the second wall: any request for an outside address is cancelled and counted
  ses.webRequest.onBeforeRequest((details, cb) => {
    if (allowedUrl(details.url)) return cb({});
    blocked++;
    cb({ cancel: true });
  });

  protocol.handle('cafe', req => {
    const u = new URL(req.url);
    if (u.host === 'app') return serve(APPS, u.pathname);
    if (u.host === 'data') return serve(DATA, u.pathname);
    return new Response('Not found', { status: 404 });
  });

  // saves from the pages ("Save project", "Save .html", PDF export ...) are offered in the drive's folder
  ses.on('will-download', (event, item) => {
    const name = safeName(item.getFilename());
    const kind = /\.zip$/i.test(name) ? 'Projects' : /\.(csv|json|txt)$/i.test(name) ? 'Data' : 'Downloads';
    item.setSaveDialogOptions({ title: 'Save', defaultPath: path.join(DATA, kind, name) });
  });

  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
if (!app.requestSingleInstanceLock()) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

// ---------- 2. The bridge: what the launcher may ask of the drive (only inside Cafe Data) ----------
ipcMain.handle('cafe:info', () => ({ dataDir: DATA, blocked, version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome, platform: process.platform }));
ipcMain.handle('cafe:list', (e, sub) => {
  const dir = inside(DATA, sub || '');
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => !d.name.startsWith('.'))
    .map(d => { const st = fs.statSync(path.join(dir, d.name)); return { name: d.name, folder: d.isDirectory(), size: st.size, modified: st.mtimeMs }; })
    .sort((a, b) => (b.folder - a.folder) || a.name.localeCompare(b.name));
});
ipcMain.handle('cafe:readText', (e, rel) => { const f = inside(DATA, rel); if (!f) throw new Error('Outside the Cafe Data folder'); return fs.readFileSync(f, 'utf8'); });
ipcMain.handle('cafe:writeText', (e, rel, text) => {
  const f = inside(DATA, rel); if (!f) throw new Error('Outside the Cafe Data folder');
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, String(text), 'utf8'); return true;
});
ipcMain.handle('cafe:reveal', (e, rel) => { const f = inside(DATA, rel || ''); if (f) shell.openPath(f); return !!f; });

// ---------- 3. A small menu, including the developer tools: what runs under the hood ----------
function buildMenu() {
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [
      { label: 'Home', accelerator: 'CmdOrCtrl+H', click: () => win && win.loadURL('cafe://app/index.html') },
      { label: 'Open the Cafe Data folder', click: () => shell.openPath(DATA) },
      { type: 'separator' }, isMac ? { role: 'close' } : { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'togglefullscreen' }, { label: 'Developer tools (under the hood)', role: 'toggleDevTools' }] },
    { label: 'Go', submenu: [{ label: 'Back', accelerator: 'Alt+Left', click: () => win && win.webContents.navigationHistory.goBack() },
      { label: 'Forward', accelerator: 'Alt+Right', click: () => win && win.webContents.navigationHistory.goForward() }] },
    { role: 'windowMenu' }
  ]));
}
