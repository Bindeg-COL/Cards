#!/usr/bin/env node
// Chequeo de anclas de la navegación (sin dependencias: Chrome headless + CDP por WebSocket nativo de Node).
//
// Uso:  pnpm dev   (en otra terminal)  y luego  pnpm check:anchors
// Vars: URL (por defecto http://localhost:4321/), CHROME_PATH (por defecto Chrome de macOS).
//
// Falla (exit 1) si, en algún viewport:
//  1. un enlace de la nav apunta a un id que no existe;
//  2. tras el clic, el destino no queda justo debajo de la barra (±6px de su scroll-margin-top),
//     salvo que el destino esté al inicio de la página (scrollY = 0);
//  3. la altura del documento cambia sola durante 8s (provoca tirones al estar al final).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.env.URL ?? 'http://localhost:4321/';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9400 + Math.floor(Math.random() * 400);
const VIEWPORTS = [[1440, 900], [1440, 1300], [820, 1000], [390, 800]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'anchors-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const cleanup = async () => {
  const exited = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await Promise.race([exited, sleep(3000)]);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* perfil temporal: no es crítico */ }
};

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${URL_}`, { method: 'PUT' })).json();
      const ws = new WebSocket(t.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      return ws;
    } catch { await sleep(250); }
  }
  throw new Error(`No se pudo conectar a Chrome (${CHROME}). Define CHROME_PATH.`);
}

let failures = 0;
try {
  for (const [w, h] of VIEWPORTS) {
    const ws = await connect();
    let id = 0; const pend = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); pend.delete(d.id); };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 640 });
    await send('Page.reload');
    await sleep(2500);

    const links = await ev(`[...document.querySelectorAll('header nav a[href^="#"]')].map(a => a.getAttribute('href'))`);
    if (!links?.length) { console.log(`✗ ${w}x${h}: no hay enlaces de ancla en la nav`); failures++; }

    for (const href of links ?? []) {
      await ev('scrollTo(0, document.documentElement.scrollHeight)');
      await sleep(200);
      const r = await ev(`(async () => {
        const t = document.getElementById(${JSON.stringify(href.slice(1))});
        if (!t) return { missing: true };
        const a = document.querySelector('header nav a[href="${href}"]');
        if (getComputedStyle(a).display === 'none') return { hidden: true };
        a.click();
        await new Promise(r => setTimeout(r, 400));
        const margin = parseFloat(getComputedStyle(t).scrollMarginTop) || 0;
        return { top: Math.round(t.getBoundingClientRect().top), margin, scrollY: Math.round(scrollY) };
      })()`);
      if (r.hidden) { console.log(`· ${w}x${h} ${href}: enlace oculto en este ancho (se omite)`); continue; }
      if (r.missing) { console.log(`✗ ${w}x${h} ${href}: el id no existe`); failures++; continue; }
      const ok = Math.abs(r.top - r.margin) <= 6 || r.scrollY === 0;
      console.log(`${ok ? '✓' : '✗'} ${w}x${h} ${href}: top=${r.top}px (esperado ≈${r.margin}px) scrollY=${r.scrollY}`);
      if (!ok) failures++;
    }

    const heights = await ev(`(async () => { const s = new Set(); const t0 = performance.now();
      while (performance.now() - t0 < 8000) { s.add(document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 200)); }
      return [...s]; })()`);
    const stable = heights.length === 1;
    console.log(`${stable ? '✓' : '✗'} ${w}x${h} altura del documento estable: ${heights.join(' / ')}px`);
    if (!stable) failures++;
    ws.close();
  }
} finally {
  await cleanup();
}
console.log(failures ? `\n${failures} fallo(s).` : '\nAnclas OK.');
process.exit(failures ? 1 : 0);
