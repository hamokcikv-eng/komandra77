import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['worker', 'browser'],
  outfile: 'dist/worker.js',
  loader: { '.sql': 'text' },
  legalComments: 'none',
  logLevel: 'info',
});

await mkdir('dist', { recursive: true });
const manifest = {
  entrypoint: 'worker.js',
  compatibilityDate: '2026-10-01',
  modules: [{ name: 'worker.js', type: 'esm', path: './worker.js' }],
  assetsDirectory: './client',
  spa: true,
};
await writeFile('dist/deploy.json', JSON.stringify(manifest, null, 2));
console.log('worker + deploy manifest written to dist/');
