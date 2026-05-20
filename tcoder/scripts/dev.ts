import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

const SRC_DIR = resolve(import.meta.dirname, '..', 'src');
const BUILD_SCRIPT = resolve(import.meta.dirname, 'build.ts');

console.log('[dev] Starting development mode...');

function rebuild() {
  const proc = spawn('bun', [BUILD_SCRIPT], {
    stdio: 'inherit',
    env: process.env,
  });
}

// Initial build
rebuild();

// Watch for changes
let timeout: ReturnType<typeof setTimeout> | null = null;
watch(SRC_DIR, { recursive: true }, (_, filename) => {
  if (filename) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log(`[dev] Change detected in ${filename}`);
      rebuild();
    }, 100);
  }
});

process.on('SIGINT', () => {
  console.log('\n[dev] Stopped');
  process.exit(0);
});
