import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isMinify = process.argv.includes('--minify');
const isProd = process.argv.includes('--prod') || isMinify;

const config: esbuild.BuildOptions = {
  entryPoints: ['src/entrypoints/cli.ts'],
  bundle: true,
  outfile: 'dist/tcoder.js',
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: !isProd,
  minify: isProd,
  treeShaking: true,
  external: [
    // Native modules that shouldn't be bundled
    'node-pty',
    'sharp',
  ],
  banner: {
    js: '#!/usr/bin/env bun\n',
  },
  define: {
    'process.env.APP_VERSION': JSON.stringify(
      process.env.npm_package_version || '0.1.0',
    ),
  },
  plugins: [],
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('[build] Watching for changes...');
  } else {
    const start = performance.now();
    await esbuild.build(config);
    const elapsed = (performance.now() - start).toFixed(0);
    console.log(`[build] Built in ${elapsed}ms → dist/tcoder.js`);
  }
}

main().catch((err) => {
  console.error('[build] Error:', err);
  process.exit(1);
});
