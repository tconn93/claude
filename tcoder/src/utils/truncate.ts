export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function truncateMiddle(text: string, maxLength: number, separator = '...'): string {
  if (text.length <= maxLength) return text;

  const half = Math.floor((maxLength - separator.length) / 2);
  const start = text.slice(0, half);
  const end = text.slice(text.length - half);

  return start + separator + end;
}

export function truncateLines(text: string, maxLines: number, suffix = '...'): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;

  return lines.slice(0, maxLines).join('\n') + '\n' + suffix;
}

export function truncateWords(text: string, maxWords: number, suffix = '...'): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  return words.slice(0, maxWords).join(' ') + suffix;
}

export function truncateBytes(text: string, maxBytes: number, suffix = '...'): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  if (bytes.length <= maxBytes) return text;

  const suffixBytes = encoder.encode(suffix).length;
  const targetBytes = maxBytes - suffixBytes;

  let charCount = 0;
  let byteCount = 0;

  for (const char of text) {
    const charBytes = encoder.encode(char).length;
    if (byteCount + charBytes > targetBytes) break;
    byteCount += charBytes;
    charCount++;
  }

  return text.slice(0, charCount) + suffix;
}

export function truncateJson(
  obj: unknown,
  maxLength: number,
  suffix = '...',
): string {
  const str = JSON.stringify(obj);
  return truncate(str, maxLength, suffix);
}

export function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;

  const segments = path.split(/[/\\]/);
  if (segments.length <= 2) return truncate(path, maxLength);

  let result = segments[0] + '/.../' + segments[segments.length - 1];

  if (result.length > maxLength) {
    return truncateMiddle(path, maxLength);
  }

  return result;
}

export function truncateList(
  items: string[],
  maxItems: number,
  suffix = `... and {count} more`,
): string[] {
  if (items.length <= maxItems) return items;

  const shown = items.slice(0, maxItems);
  const remaining = items.length - maxItems;
  const suffixText = suffix.replace('{count}', String(remaining));

  return [...shown, suffixText];
}
