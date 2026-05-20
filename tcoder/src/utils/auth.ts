import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getConfigDir } from '../settings/paths.ts';

export interface AuthToken {
  key: string;
  type: 'api_key' | 'oauth' | 'token';
  provider: string;
  createdAt: number;
  expiresAt: number | null;
}

export function getAuthToken(provider: string): AuthToken | null {
  const envVar = getEnvVarForProvider(provider);

  if (process.env[envVar]) {
    return {
      key: process.env[envVar]!,
      type: 'api_key',
      provider,
      createdAt: 0,
      expiresAt: null,
    };
  }

  const stored = loadStoredToken(provider);
  if (stored && !isTokenExpired(stored)) {
    return stored;
  }

  return null;
}

export function setAuthToken(provider: string, key: string): boolean {
  const token: AuthToken = {
    key,
    type: 'api_key',
    provider,
    createdAt: Date.now(),
    expiresAt: null,
  };

  return saveStoredToken(token);
}

export function removeAuthToken(provider: string): boolean {
  const path = getTokenPath(provider);
  try {
    if (existsSync(path)) {
      const { unlinkSync } = require('node:fs');
      unlinkSync(path);
    }
    delete process.env[getEnvVarForProvider(provider)];
    return true;
  } catch {
    return false;
  }
}

export function hasAuthToken(provider: string): boolean {
  return getAuthToken(provider) !== null;
}

export function getTokenForAPI(provider: string): string | null {
  const token = getAuthToken(provider);
  return token?.key ?? null;
}

export function loadAllTokens(): AuthToken[] {
  const dir = getConfigDir();
  const tokens: AuthToken[] = [];

  try {
    const { readdirSync } = require('node:fs');
    const files = readdirSync(dir).filter((f: string) => f.startsWith('auth_') && f.endsWith('.json'));

    for (const file of files) {
      const token = loadStoredTokenFromFile(`${dir}/${file}`);
      if (token) tokens.push(token);
    }
  } catch {
    // no-op
  }

  return tokens;
}

export function isAuthenticated(provider: string): boolean {
  return hasAuthToken(provider);
}

function getEnvVarForProvider(provider: string): string {
  const mapping: Record<string, string> = {
    xai: 'XAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    github: 'GITHUB_TOKEN',
    gitlab: 'GITLAB_TOKEN',
  };
  return mapping[provider] ?? `${provider.toUpperCase()}_API_KEY`;
}

function getTokenPath(provider: string): string {
  return `${getConfigDir()}/auth_${provider}.json`;
}

function loadStoredToken(provider: string): AuthToken | null {
  return loadStoredTokenFromFile(getTokenPath(provider));
}

function loadStoredTokenFromFile(path: string): AuthToken | null {
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as AuthToken;
  } catch {
    return null;
  }
}

function saveStoredToken(token: AuthToken): boolean {
  try {
    const path = getTokenPath(token.provider);
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify(token, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

function isTokenExpired(token: AuthToken): boolean {
  if (!token.expiresAt) return false;
  return Date.now() >= token.expiresAt;
}
