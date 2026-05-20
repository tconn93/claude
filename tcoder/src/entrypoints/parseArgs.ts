export interface ParsedArgs {
  mode: 'repl' | 'bridge' | 'daemon';
  model?: string;
  session?: string;
  dir?: string;
  prompt?: string;
  background?: boolean;
  bg?: boolean;
  interactive?: boolean;
  noStream?: boolean;
  debug?: boolean;
  profile?: boolean;
}

export function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  const result: ParsedArgs = { mode: 'repl' };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--bridge':
        result.mode = 'bridge';
        break;
      case '--daemon':
        result.mode = 'daemon';
        break;
      case '--background':
      case '--bg':
        result.background = true;
        break;
      case '--no-stream':
        result.noStream = true;
        break;
      case '--debug':
        result.debug = true;
        process.env.TCODER_DEBUG = '1';
        break;
      case '--profile':
        result.profile = true;
        process.env.TCODER_PROFILE = '1';
        break;
      case '--interactive':
      case '-i':
        result.interactive = true;
        break;
      case '--model':
      case '-m':
        if (i + 1 < argv.length) {
          result.model = argv[++i];
        }
        break;
      case '--session':
      case '-s':
        if (i + 1 < argv.length) {
          result.session = argv[++i];
        }
        break;
      case '--dir':
      case '-d':
        if (i + 1 < argv.length) {
          result.dir = argv[++i];
        }
        break;
      case '--prompt':
      case '-p':
        if (i + 1 < argv.length) {
          result.prompt = argv[++i];
        }
        break;
      case '--version':
      case '-v':
      case '-V':
      case '--help':
      case '-h':
        // Handled in fast path before imports; skip here
        break;
      default:
        // Positional: treat as prompt
        if (!arg.startsWith('-')) {
          result.prompt = arg;
        }
        break;
    }
  }

  return result;
}
