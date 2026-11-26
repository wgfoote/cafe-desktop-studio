// Pure helpers for Café Desktop: where the drive's data folder is, and safe paths inside it.
// Kept free of Electron so they can be tested with plain Node (see test/paths.test.js).
'use strict';
const path = require('path');

const DATA_FOLDER = 'Cafe Data';

// The folder that holds the program on the thumb drive.
//   Windows portable .exe: electron-builder sets PORTABLE_EXECUTABLE_DIR to the folder holding the .exe.
//   Linux AppImage: APPIMAGE is the full path of the .AppImage file.
//   macOS: the executable sits at Cafe.app/Contents/MacOS/Cafe, so climb out of the bundle.
//   Development (npm start): the project folder.
function driveRoot(env, exePath, isPackaged, appPath) {
  if (!isPackaged) return appPath;
  if (env.PORTABLE_EXECUTABLE_DIR) return env.PORTABLE_EXECUTABLE_DIR;
  if (env.APPIMAGE) return path.dirname(env.APPIMAGE);
  const mac = exePath.match(/^(.*?)[\\/][^\\/]+\.app[\\/]Contents[\\/]MacOS[\\/][^\\/]+$/);
  if (mac) return mac[1];
  return path.dirname(exePath);
}

// Resolve a path the page asked for, and refuse anything that escapes the base folder.
function inside(base, relative) {
  const rel = String(relative || '').replace(/\\/g, '/');
  if (rel.includes('\0')) return null;
  const full = path.resolve(base, '.' + path.sep + rel);
  const b = path.resolve(base);
  if (full !== b && !full.startsWith(b + path.sep)) return null;
  return full;
}

// Only these kinds of address may load. Everything else (http, https, ws, ftp ...) is cancelled.
function allowedUrl(url) {
  return /^(cafe|file|data|blob|devtools|chrome-extension|about):/i.test(url);
}

// A file name for a save, kept to safe characters.
function safeName(name) {
  const n = String(name || 'download').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '').slice(0, 120);
  return n || 'download';
}

module.exports = { DATA_FOLDER, driveRoot, inside, allowedUrl, safeName };
