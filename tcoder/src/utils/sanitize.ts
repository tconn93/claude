export function sanitizeInput(input: string): string {
  return input
    .replace(/\x00/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 255) || 'untitled';
}

export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function sanitizeShellArg(arg: string): string {
  return arg.replace(/[^a-zA-Z0-9._\-/]/g, '');
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return '';
  }
}

export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '');
}

export function sanitizeJsonString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function redactSensitiveInfo(text: string): string {
  const patterns: Array<[RegExp, string]> = [
    [/[A-Za-z0-9+/]{40,}={0,2}/g, '[REDACTED_TOKEN]'],
    [/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED_API_KEY]'],
    [/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_GITHUB_TOKEN]'],
    /(?:api[_-]?key|apikey|secret|password|token|auth)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi,
    ['[REDACTED_CREDENTIAL]'],
  ];

  let result = text;

  for (const [pattern, replacement] of patterns) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern as RegExp, replacement);
    }
  }

  return result;
}

export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function removeAnsiEscapeCodes(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}
