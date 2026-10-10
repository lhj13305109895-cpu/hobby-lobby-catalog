import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Some Windows-mounted drives reject native realpath while the standard
// implementation resolves the same permitted file correctly.
const nativeRealpath = fs.realpathSync.native;
fs.realpathSync.native = (...args) => {
  try { return nativeRealpath(...args); }
  catch (error) {
    if (error.code !== 'EPERM') throw error;
    return fs.realpathSync(...args);
  }
};
const { createServer } = await import('vite');
const port = Number(process.env.STUDIO_PREVIEW_PORT || 5173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('STUDIO_PREVIEW_PORT must be an integer from 1024 to 65535');
}
const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  server: { host: '127.0.0.1', port, strictPort: true },
});
await server.listen();
server.printUrls();
console.log(`Studio preview process: ${process.pid}`);
console.log('Keep this window open while using the studio. Ctrl+C stops it.');

if (process.argv.includes('--open')) {
  const url = `http://127.0.0.1:${port}/studio/?capacity=322`;
  // Open only after the page responds, not while Vite is still starting.
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Studio readiness check failed: ${response.status}`);
  await response.body?.cancel();
  if (process.platform === 'win32') {
    const opener = spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process '${url}'`], {
      windowsHide: true, stdio: 'ignore',
    });
    opener.on('error', () => console.log(`Open this URL in your browser: ${url}`));
    opener.unref();
  } else {
    console.log(`Open this URL in your browser: ${url}`);
  }
}
