import { APP_NAME } from '../../constants/common.ts';

export function getConfigDir(): string {
  const home = getHomeDir();
  const xdgConfig = process.env.XDG_CONFIG_HOME;

  if (xdgConfig) {
    return `${xdgConfig}/${APP_NAME}`;
  }

  const platform = process.platform;

  if (platform === 'darwin') {
    return `${home}/Library/Application Support/${APP_NAME}`;
  }

  if (platform === 'win32') {
    return `${process.env.APPDATA ?? home}/${APP_NAME}`;
  }

  return `${home}/.config/${APP_NAME}`;
}

export function getDataDir(): string {
  const home = getHomeDir();
  const xdgData = process.env.XDG_DATA_HOME;

  if (xdgData) {
    return `${xdgData}/${APP_NAME}`;
  }

  const platform = process.platform;

  if (platform === 'darwin') {
    return `${home}/Library/Application Support/${APP_NAME}`;
  }

  if (platform === 'win32') {
    return `${process.env.LOCALAPPDATA ?? home}/${APP_NAME}`;
  }

  return `${home}/.local/share/${APP_NAME}`;
}

export function getCacheDir(): string {
  const home = getHomeDir();
  const xdgCache = process.env.XDG_CACHE_HOME;

  if (xdgCache) {
    return `${xdgCache}/${APP_NAME}`;
  }

  const platform = process.platform;

  if (platform === 'darwin') {
    return `${home}/Library/Caches/${APP_NAME}`;
  }

  if (platform === 'win32') {
    return `${process.env.LOCALAPPDATA ?? home}/${APP_NAME}/Cache`;
  }

  return `${home}/.cache/${APP_NAME}`;
}

export function getSettingsPath(): string {
  return `${getConfigDir()}/settings.json`;
}

export function getSettingsDir(): string {
  return getConfigDir();
}

export function getPermissionsPath(): string {
  return `${getConfigDir()}/permissions.json`;
}

export function getModelsPath(): string {
  return `${getConfigDir()}/models.json`;
}

export function getMCPConfigPath(): string {
  return `${getConfigDir()}/mcp.json`;
}

export function getHistoryPath(): string {
  return `${getDataDir()}/history.json`;
}

export function getSessionsDir(): string {
  return `${getDataDir()}/sessions`;
}

export function getLogsDir(): string {
  return `${getCacheDir()}/logs`;
}

export function getTempDir(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    return process.env.TEMP ?? process.env.TMP ?? `${getHomeDir()}/AppData/Local/Temp`;
  }

  return process.env.TMPDIR ?? '/tmp';
}

export function getHomeDir(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
}

export function ensureConfigDir(): boolean {
  const { mkdirSync } = require('node:fs');
  try {
    mkdirSync(getConfigDir(), { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export function resolvePath(relativePath: string): string {
  if (relativePath.startsWith('~')) {
    return relativePath.replace('~', getHomeDir());
  }

  if (relativePath.startsWith('$HOME')) {
    return relativePath.replace('$HOME', getHomeDir());
  }

  return relativePath;
}
