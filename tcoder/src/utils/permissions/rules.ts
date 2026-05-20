import type { PermissionRule, PermissionMode, PermissionConfig } from '../../types/permissions.ts';
import { loadSettings } from '../settings/load.ts';
import { saveSettings } from '../settings/save.ts';

export function createRule(
  toolName: string,
  mode: PermissionMode,
  scope: 'project' | 'user' | 'session' = 'project',
): PermissionRule {
  return { toolName, mode, scope };
}

export function addRule(rule: PermissionRule, existing: PermissionRule[]): PermissionRule[] {
  const filtered = existing.filter(r => r.toolName !== rule.toolName);
  return [...filtered, rule];
}

export function removeRule(toolName: string, existing: PermissionRule[]): PermissionRule[] {
  return existing.filter(r => r.toolName !== toolName);
}

export function updateRule(
  toolName: string,
  updates: Partial<Pick<PermissionRule, 'mode' | 'scope'>>,
  existing: PermissionRule[],
): PermissionRule[] {
  return existing.map(r => {
    if (r.toolName !== toolName) return r;
    return { ...r, ...updates };
  });
}

export function findRules(
  toolName: string,
  rules: PermissionRule[],
): PermissionRule[] {
  return rules.filter(r => ruleMatches(r.toolName, toolName));
}

export function ruleMatches(pattern: string, toolName: string): boolean {
  if (pattern === '*') return true;
  if (pattern === toolName) return true;

  if (pattern.startsWith('*') && pattern.endsWith('*')) {
    const inner = pattern.slice(1, -1);
    return toolName.includes(inner);
  }

  if (pattern.endsWith('*')) {
    return toolName.startsWith(pattern.slice(0, -1));
  }

  if (pattern.startsWith('*')) {
    return toolName.endsWith(pattern.slice(1));
  }

  return false;
}

export function mergeRules(base: PermissionRule[], overlay: PermissionRule[]): PermissionRule[] {
  const merged = new Map<string, PermissionRule>();

  for (const rule of base) {
    merged.set(rule.toolName, rule);
  }

  for (const rule of overlay) {
    merged.set(rule.toolName, rule);
  }

  return Array.from(merged.values());
}

export function getEffectiveMode(
  toolName: string,
  config: PermissionConfig,
): PermissionMode {
  const rule = config.rules.find(r => ruleMatches(r.toolName, toolName));
  if (rule) return rule.mode;

  if (config.denyList.includes(toolName)) {
    return 'default';
  }

  return config.defaultMode;
}

export function isDenied(
  toolName: string,
  config: PermissionConfig,
): boolean {
  return config.denyList.includes(toolName);
}

export function diffRules(
  oldRules: PermissionRule[],
  newRules: PermissionRule[],
): { added: PermissionRule[]; removed: PermissionRule[]; changed: PermissionRule[] } {
  const oldMap = new Map(oldRules.map(r => [r.toolName, r]));
  const newMap = new Map(newRules.map(r => [r.toolName, r]));

  const added: PermissionRule[] = [];
  const removed: PermissionRule[] = [];
  const changed: PermissionRule[] = [];

  for (const [name, rule] of newMap) {
    const oldRule = oldMap.get(name);
    if (!oldRule) {
      added.push(rule);
    } else if (oldRule.mode !== rule.mode || oldRule.scope !== rule.scope) {
      changed.push(rule);
    }
  }

  for (const [name, rule] of oldMap) {
    if (!newMap.has(name)) {
      removed.push(rule);
    }
  }

  return { added, removed, changed };
}
