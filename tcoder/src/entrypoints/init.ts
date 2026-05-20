import { getAppStateStore } from '../state/store.ts';
import { AppStateManager } from '../state/AppState.ts';
import { getCommandRegistry } from '../commands.ts';
import { getToolRegistry } from '../tools.ts';
import { checkSetupStatus, runSetup, hasApiKey } from '../setup.ts';
import { gatherSystemContext, gatherProjectContext } from '../context.ts';
import { getGitBranch, getGitStatus } from '../tools/shared/gitOperations.ts';
import { detectShell } from '../utils/shell.ts';
import { DEFAULT_MODEL } from '../constants/common.ts';

export interface InitResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  apiAvailable: boolean;
  featureFlags: Record<string, boolean>;
}

export async function initializeApp(): Promise<InitResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let apiAvailable = false;
  let featureFlags: Record<string, boolean> = {};

  // Phase 1: Setup check
  const setupCtx = checkSetupStatus();
  if (setupCtx.firstRun || !setupCtx.configExists) {
    const setupResult = runSetup(false);
    if (!setupResult.success) {
      warnings.push('Setup incomplete: ' + setupResult.message);
    }
  }

  // Phase 2: State initialization
  try {
    const store = getAppStateStore();
    const state = store.getState();

    const workingDir = process.cwd();
    const gitBranch = getGitBranch(workingDir);
    const gitStatus = getGitStatus(workingDir);

    store.setState({
      workingDirectory: workingDir,
      gitBranch,
      gitStatus,
    });
  } catch (err) {
    errors.push(`State initialization failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Phase 3: API key check
  if (!hasApiKey()) {
    warnings.push('No XAI_API_KEY found. API calls will fail.');
  } else {
    apiAvailable = true;
  }

  // Phase 4: Tool and command registration
  try {
    getToolRegistry();
  } catch (err) {
    errors.push(`Tool registry init failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    getCommandRegistry();
  } catch (err) {
    errors.push(`Command registry init failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Phase 5: Feature flags
  featureFlags = await loadFeatureFlags();

  // Phase 6: Auto-update check (non-blocking)
  if (featureFlags.autoUpdate !== false) {
    checkForUpdates().catch(() => {
      // Non-blocking; ignore update check failures
    });
  }

  // Phase 7: Telemetry init (non-blocking)
  if (featureFlags.telemetry !== false) {
    initTelemetry().catch(() => {
      // Non-blocking; ignore telemetry failures
    });
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    apiAvailable,
    featureFlags,
  };
}

async function loadFeatureFlags(): Promise<Record<string, boolean>> {
  // Feature flags could come from config, remote endpoint, or env vars
  const flags: Record<string, boolean> = {
    streaming: process.env.TCODER_STREAMING !== '0',
    telemetry: process.env.TCODER_TELEMETRY !== '0',
    autoUpdate: process.env.TCODER_AUTO_UPDATE !== '0',
    compactEnabled: process.env.TCODER_COMPACT !== '0',
    sessionsEnabled: process.env.TCODER_SESSIONS !== '0',
    hooksEnabled: process.env.TCODER_HOOKS !== '0',
    mcpEnabled: process.env.TCODER_MCP !== '0',
  };

  try {
    const configFlagFile = process.env.TCODER_FLAGS_FILE;
    if (configFlagFile) {
      const { existsSync, readFileSync } = await import('node:fs');
      if (existsSync(configFlagFile)) {
        const raw = readFileSync(configFlagFile, 'utf-8');
        const parsed = JSON.parse(raw);
        Object.assign(flags, parsed);
      }
    }
  } catch {
    // Use defaults
  }

  return flags;
}

async function checkForUpdates(): Promise<void> {
  try {
    const response = await fetch(
      'https://registry.npmjs.org/tcoder/latest',
      { signal: AbortSignal.timeout(3000) },
    );
    if (response.ok) {
      const data = (await response.json()) as { version?: string };
      const latest = data.version;
      if (latest) {
        const current = '0.1.0';
        if (latest !== current) {
          // Update available - store in state for UI to display
          const store = getAppStateStore();
          store.setState({
            config: { ...store.getState().config, updateAvailable: latest },
          });
        }
      }
    }
  } catch {
    // Network error or timeout; silently ignore
  }
}

async function initTelemetry(): Promise<void> {
  // Stub: Initialize telemetry/analytics
  // In production this would set up event collection
}

export function handleInitError(result: InitResult): void {
  if (result.errors.length > 0) {
    console.error('\n\x1b[31mInitialization errors:\x1b[0m');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n\x1b[33mWarnings:\x1b[0m');
    for (const warn of result.warnings) {
      console.log(`  - ${warn}`);
    }
  }

  if (!result.success) {
    console.error('\n\x1b[31mtcoder failed to initialize. Please check the errors above.\x1b[0m');
  }
}

export function gracefulDegrade(result: InitResult): boolean {
  // Returns true if we can continue despite errors
  // Only fatal if we can't even get a basic state initialized
  if (result.errors.some(e => e.includes('State initialization'))) {
    return false;
  }
  return true;
}
