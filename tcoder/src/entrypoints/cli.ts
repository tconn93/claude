// Corepack auto-pin disable
process.env.COREPACK_ENABLE_AUTO_PIN = '0';
process.env.COREPACK_ROOT = '';
process.env.COREPACK_ENABLE_STRICT = '0';

// ---- Zero-dependency fast path for --version and --help ----
// These must run without any imports to minimize startup time.

const fastArgs = process.argv.slice(2);

for (let i = 0; i < fastArgs.length; i++) {
  const arg = fastArgs[i];

  if (arg === '--version' || arg === '-v' || arg === '-V') {
    const pkg = readPackageJsonSync();
    process.stdout.write(`${pkg.version ?? '0.1.0'}\n`);
    process.exit(0);
  }

  if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
}

// ---- Startup profiler ----
const PROFILER_ENABLED = process.env.TCODER_PROFILE === '1';
const checkpoints: [string, number][] = [];

function profile(label: string): void {
  if (PROFILER_ENABLED) {
    checkpoints.push([label, performance.now()]);
  }
}

profile('cli-start');

// ---- Dynamic import for all other paths ----
// Minimize startup cost by only loading what's needed.
import { parseArgs } from './parseArgs.ts';
import { handleBridgeMode } from './bridge.ts';
import { handleDaemonMode } from './daemon.ts';
import { handleBackgroundSession } from './background.ts';

profile('imports-loaded');

async function main(): Promise<void> {
  profile('main-start');

  const args = parseArgs();

  // Fast path: version and help already handled above synchronously.
  // Fast path: if no args were parsed (parseArgs returned early), done.

  profile('args-parsed');

  // ---- Bridge mode ----
  // Bridge mode connects tcoder as a subprocess controlled by a parent IDE/editor.
  if (args.mode === 'bridge') {
    await handleBridgeMode(args);
    return;
  }

  // ---- Daemon mode ----
  // Daemon mode runs as a long-lived background server for API requests.
  if (args.mode === 'daemon') {
    await handleDaemonMode(args);
    return;
  }

  // ---- Background session ----
  // Background sessions run without an interactive TTY.
  if (args.background || args.bg) {
    await handleBackgroundSession(args);
    return;
  }

  // ---- Default: Interactive REPL ----
  profile('before-init');

  const { initializeApp, handleInitError, gracefulDegrade } = await import('./init.ts');

  const initResult = await initializeApp();

  profile('init-complete');

  if (!initResult.success) {
    handleInitError(initResult);
    if (!gracefulDegrade(initResult)) {
      process.exit(1);
    }
  }

  // Show setup on first run
  if (initResult.warnings.length > 0) {
    for (const warn of initResult.warnings) {
      console.log(`\x1b[33mWarning:\x1b[0m ${warn}`);
    }
    console.log();
  }

  const { printWelcome } = await import('../setup.ts');
  const { checkSetupStatus } = await import('../setup.ts');
  const setupCtx = checkSetupStatus();
  if (setupCtx.firstRun) {
    const { runSetup } = await import('../setup.ts');
    runSetup(true);
    printWelcome({ success: true, message: '', steps: [] });
  } else {
    printWelcome({ success: true, message: '', steps: [] });
  }

  profile('welcome-shown');

  const { startup } = await import('../main.ts');

  const app = await startup({
    model: args.model,
    sessionId: args.session,
    workingDir: args.dir,
    prompt: args.prompt,
    stream: !args.noStream,
  });

  profile('app-started');

  if (PROFILER_ENABLED) {
    console.error('\n\x1b[2mStartup profile:\x1b[0m');
    for (let i = 1; i < checkpoints.length; i++) {
      const [label, ms] = checkpoints[i];
      const prev = checkpoints[i - 1];
      const delta = (ms - prev[1]).toFixed(1);
      console.error(`\x1b[2m  ${label.padEnd(20)} ${String(delta).padStart(6)}ms\x1b[0m`);
    }
    const total = (checkpoints[checkpoints.length - 1][1] - checkpoints[0][1]).toFixed(1);
    console.error(`\x1b[2m  ${'total'.padEnd(20)} ${String(total).padStart(6)}ms\x1b[0m`);
  }

  // ---- Signal handlers ----
  let sigintCount = 0;
  const SIGINT_RESET_MS = 2000;
  let sigintTimer: ReturnType<typeof setTimeout> | null = null;

  process.on('SIGINT', () => {
    sigintCount++;

    if (sigintTimer) {
      clearTimeout(sigintTimer);
    }

    sigintTimer = setTimeout(() => {
      sigintCount = 0;
    }, SIGINT_RESET_MS);

    if (sigintCount === 1) {
      // First Ctrl+C: cancel current operation
      console.log('\n\x1b[33mInterrupted. Press Ctrl+C again to exit.\x1b[0m');
      app.abort();
    } else if (sigintCount >= 2) {
      // Second Ctrl+C: graceful shutdown
      console.log('\n\x1b[33mShutting down...\x1b[0m');
      shutdown();
      process.exit(0);
    }
  });

  process.on('SIGTERM', () => {
    console.log('\n\x1b[33mReceived SIGTERM. Shutting down...\x1b[0m');
    shutdown();
    process.exit(0);
  });

  // Handle uncaught errors gracefully
  process.on('uncaughtException', (err) => {
    console.error(`\n\x1b[31mUncaught error: ${err.message}\x1b[0m`);
    console.error(err.stack);
    if (process.env.TCODER_DEBUG) {
      console.error(err);
    }
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`\n\x1b[31mUnhandled rejection: ${String(reason)}\x1b[0m`);
  });

  // Run the app
  await app.run();
}

// Note: the shutdown() and readPackageJsonSync() functions below use
// CJS-style require() and __dirname. These work in Bun's ESM mode, which
// is the target runtime for this project. For strict Node ESM compat,
// these would need createRequire, but Bun provides both globally.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: ((id: string) => any) | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __dirname: string | undefined;

function shutdown(): void {
  try {
    // Best-effort flush state to disk
    const { writeFileSync, mkdirSync, existsSync } = (require as (id: string) => unknown)('node:fs') as typeof import('node:fs');
    const { resolve, dirname } = (require as (id: string) => unknown)('node:path') as typeof import('node:path');
    const { getAppDataDir } = (require as (id: string) => unknown)('../utils/shell.ts') as typeof import('../utils/shell.ts');
    const dataDir = getAppDataDir();
    const statePath = resolve(dataDir, 'state.json');
    if (!existsSync(dirname(statePath))) {
      mkdirSync(dirname(statePath), { recursive: true });
    }
  } catch {
    // Best-effort shutdown
  }
}

function readPackageJsonSync(): { version?: string } {
  try {
    const { readFileSync } = (require as (id: string) => unknown)('node:fs') as typeof import('node:fs');
    const { resolve } = (require as (id: string) => unknown)('node:path') as typeof import('node:path');
    const pkgPath = resolve((__dirname as string), '../../package.json');
    const raw = readFileSync(pkgPath, 'utf-8');
    return JSON.parse(raw) as { version?: string };
  } catch {
    return {};
  }
}

function printHelp(): void {
  const version = readPackageJsonSync().version ?? '0.1.0';
  process.stdout.write(`
tcoder v${version} - Terminal-based AI coding assistant

Usage:
  tcoder [options] [prompt]

Options:
  -v, --version       Show version number
  -h, --help          Show this help message
  -m, --model MODEL   Model to use (default: grok-4.3)
  -s, --session ID    Resume a previous session
  -d, --dir PATH      Working directory
  -p, --prompt TEXT   Initial prompt (non-interactive if provided without --interactive)
  -i, --interactive   Force interactive mode even with --prompt
  --bridge            Bridge mode (IDE/editor integration via stdio)
  --daemon            Daemon mode (long-running background server)
  --background        Background session (non-interactive, single prompt)
  --no-stream         Disable streaming responses
  --debug             Enable debug output
  --profile           Show startup profile timings

Examples:
  tcoder                                    Start interactive session
  tcoder "Explain this codebase"            Run prompt in interactive mode
  tcoder -m grok-4.3                 Use Grok 4.3 model
  tcoder --session sess_abc123              Resume a previous session
  tcoder --bridge                           Start bridge mode for IDE integration
  tcoder --daemon                           Start daemon mode

Environment:
  XAI_API_KEY          xAI API key (required)
  TCODER_DEBUG         Enable debug output (1)
  TCODER_PROFILE       Enable startup profiling (1)
  TCODER_STREAMING     Disable streaming (0)
  TCODER_TELEMETRY     Disable telemetry (0)

`.trimStart());
}

main().catch((err) => {
  console.error(`\x1b[31mFatal: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
  if (process.env.TCODER_DEBUG) {
    console.error(err);
  }
  process.exit(1);
});
