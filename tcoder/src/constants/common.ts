export const APP_NAME = 'tcoder';
export const APP_VERSION = '0.1.0';

export const DEFAULT_MODEL = 'grok-4.3';
export const DEFAULT_MAX_TOKENS = 8192;
export const DEFAULT_TEMPERATURE = 0.7;

export const SYSTEM_PROMPT_SECTIONS = [
  'identity',
  'tools',
  'guidelines',
  'constraints',
  'environment',
] as const;

export const SPINNER_VERBS = [
  'thinking',
  'analyzing',
  'processing',
  'computing',
  'reasoning',
  'evaluating',
  'planning',
  'searching',
] as const;

export const MAX_CONVERSATION_MESSAGES = 500;
export const COMPACT_THRESHOLD = 400;
export const MAX_TOOL_CALLS_PER_TURN = 50;

export const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_LINES = 2000;
export const MAX_SEARCH_RESULTS = 100;

export const SANDBOX_TIMEOUT = 120_000; // 2 minutes
export const HOOK_TIMEOUT = 60_000; // 1 minute
export const BACKGROUND_TASK_TIMEOUT = 600_000; // 10 minutes

export const CLAUDE_CONFIG_DIR = '.claude';
export const SESSIONS_DIR = 'sessions';
export const MEMORY_DIR = 'memory';
export const PLUGINS_DIR = 'plugins';
export const SKILLS_DIR = 'skills';
export const LOGS_DIR = 'logs';

export const PROMPT_CACHE_TTL_MS = 300_000; // 5 minutes
export const SESSION_IDLE_TIMEOUT_MS = 3_600_000; // 1 hour
