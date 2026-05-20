import type { PermissionMode, PermissionResult, PermissionRule } from '../../types/permissions.ts';

export function checkPermission(
  toolName: string,
  mode: PermissionMode,
  rules: PermissionRule[],
): PermissionResult {
  const matchingRule = findMatchingRule(toolName, rules);

  if (matchingRule) {
    return evaluateRule(matchingRule);
  }

  return evaluateDefaultMode(toolName, mode);
}

function findMatchingRule(toolName: string, rules: PermissionRule[]): PermissionRule | undefined {
  for (const rule of rules) {
    if (ruleMatches(rule.toolName, toolName)) {
      return rule;
    }
  }
  return undefined;
}

function ruleMatches(pattern: string, toolName: string): boolean {
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

function evaluateRule(rule: PermissionRule): PermissionResult {
  switch (rule.mode) {
    case 'auto':
    case 'acceptEdits':
    case 'bypassPermissions':
    case 'dontAsk':
      return { allowed: true };
    case 'plan':
      return { allowed: false, reason: 'Plan mode requires explicit approval' };
    default:
      return { allowed: false, reason: `Permission mode '${rule.mode}' not recognized` };
  }
}

function evaluateDefaultMode(toolName: string, mode: PermissionMode): PermissionResult {
  switch (mode) {
    case 'auto':
    case 'acceptEdits':
    case 'bypassPermissions':
    case 'dontAsk':
      return { allowed: true };
    case 'default':
      return { allowed: false, reason: `Permission required for '${toolName}'. Use 'auto' or 'acceptEdits' to bypass.` };
    case 'plan':
      return { allowed: false, reason: `Plan mode requires explicit approval for '${toolName}'` };
    default:
      return { allowed: false, reason: `Unknown permission mode: ${mode}` };
  }
}

export function isReadOnlyTool(toolName: string): boolean {
  const readOnlyTools = new Set([
    'read',
    'list',
    'glob',
    'grep',
    'search',
    'find',
    'ls',
    'cat',
    'head',
    'tail',
    'stat',
    'which',
    'whereis',
    'file',
    'pwd',
    'env',
  ]);

  return readOnlyTools.has(toolName);
}

export function isDestructiveTool(toolName: string): boolean {
  const destructiveTools = new Set([
    'rm',
    'delete',
    'remove',
    'unlink',
    'rmdir',
    'truncate',
    'format',
    'mkfs',
    'dd',
    'sudo',
  ]);

  return destructiveTools.has(toolName);
}

export function getRequiredMode(toolName: string): PermissionMode | null {
  if (isDestructiveTool(toolName)) return 'default';
  if (isReadOnlyTool(toolName)) return 'auto';
  return null;
}
