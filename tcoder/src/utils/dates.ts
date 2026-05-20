export function formatDate(date: Date | number, format = 'iso'): string {
  const d = typeof date === 'number' ? new Date(date) : date;

  switch (format) {
    case 'iso':
      return d.toISOString();
    case 'short':
      return d.toLocaleDateString();
    case 'long':
      return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    case 'time':
      return d.toLocaleTimeString();
    case 'datetime':
      return d.toLocaleString();
    case 'relative':
      return formatRelative(d);
    case 'filename':
      return formatFilename(d);
    default:
      return d.toISOString();
  }
}

export function formatRelative(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const absDiff = Math.abs(diff);

  const isPast = diff >= 0;
  const prefix = isPast ? '' : 'in ';
  const suffix = isPast ? ' ago' : '';

  if (absDiff < 1000) return 'just now';
  if (absDiff < 60_000) {
    const seconds = Math.floor(absDiff / 1000);
    return `${prefix}${seconds}s${suffix}`;
  }
  if (absDiff < 3_600_000) {
    const minutes = Math.floor(absDiff / 60_000);
    return `${prefix}${minutes}m${suffix}`;
  }
  if (absDiff < 86_400_000) {
    const hours = Math.floor(absDiff / 3_600_000);
    return `${prefix}${hours}h${suffix}`;
  }
  if (absDiff < 604_800_000) {
    const days = Math.floor(absDiff / 86_400_000);
    return `${prefix}${days}d${suffix}`;
  }
  if (absDiff < 2_592_000_000) {
    const weeks = Math.floor(absDiff / 604_800_000);
    return `${prefix}${weeks}w${suffix}`;
  }
  if (absDiff < 31_536_000_000) {
    const months = Math.floor(absDiff / 2_592_000_000);
    return `${prefix}${months}mo${suffix}`;
  }
  const years = Math.floor(absDiff / 31_536_000_000);
  return `${prefix}${years}y${suffix}`;
}

export function formatFilename(date?: Date | number): string {
  const d = date ? (typeof date === 'number' ? new Date(date) : date) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function getAge(timestamp: number): number {
  return Date.now() - timestamp;
}

export function isOlderThan(timestamp: number, durationMs: number): boolean {
  return Date.now() - timestamp > durationMs;
}

export function isNewerThan(timestamp: number, durationMs: number): boolean {
  return Date.now() - timestamp < durationMs;
}

export function now(): number {
  return Date.now();
}

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
