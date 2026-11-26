// Plain-Node checks of the safety helpers: run with  npm test
const assert = require('assert');
const path = require('path');
const { driveRoot, inside, allowedUrl, safeName } = require('../paths');
const base = path.resolve('/drive/Cafe Data');

assert.strictEqual(inside(base, 'Projects/m14.zip'), path.join(base, 'Projects', 'm14.zip'));
assert.strictEqual(inside(base, ''), base);
assert.strictEqual(inside(base, '../secret.txt'), null);
assert.strictEqual(inside(base, 'Data/../../etc/passwd'), null);
assert.strictEqual(inside(base, '..\\..\\windows'), null);
assert.strictEqual(inside(base, '/etc/passwd'), path.join(base, 'etc', 'passwd'));   // a leading slash stays inside
assert.strictEqual(inside(base, 'a\0b'), null);

assert.ok(allowedUrl('cafe://app/index.html'));
assert.ok(allowedUrl('blob:cafe://app/1234'));
assert.ok(allowedUrl('data:text/plain,hi'));
assert.ok(allowedUrl('about:srcdoc'));
assert.ok(!allowedUrl('https://fonts.googleapis.com/css2'));
assert.ok(!allowedUrl('http://example.com'));
assert.ok(!allowedUrl('wss://example.com/socket'));

assert.ok(!/[\/:]/.test(safeName('../../evil:name?.zip')));
assert.strictEqual(safeName(''), 'download');

assert.strictEqual(driveRoot({ PORTABLE_EXECUTABLE_DIR: 'E:\\' }, 'C:\\Temp\\x\\Cafe.exe', true, ''), 'E:\\');
assert.strictEqual(driveRoot({ APPIMAGE: '/media/u/CAFE/Cafe for Linux.AppImage' }, '/tmp/.mount/cafe', true, ''), '/media/u/CAFE');
assert.strictEqual(driveRoot({}, '/Volumes/CAFE/Cafe for Mac/Cafe.app/Contents/MacOS/Cafe', true, ''), '/Volumes/CAFE/Cafe for Mac');
assert.strictEqual(driveRoot({}, '/x/electron', false, '/home/me/cafe-desktop'), '/home/me/cafe-desktop');
console.log('paths: all checks passed');
