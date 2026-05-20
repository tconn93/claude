import type { ToolDefinition } from '../types/tool.ts';
import type { PermissionMode, PermissionResult } from '../types/permissions.ts';

export interface ToolPermissionHook {
  check: (tool: ToolDefinition, input: Record<string, unknown>) => Promise<PermissionResult>;
  getMode: (toolName: string) => PermissionMode;
  setMode: (toolName: string, mode: PermissionMode) => void;
  isDenied: (toolName: string) => boolean;
  addDenial: (toolName: string) => void;
  clearDenials: () => void;
}

export function createToolPermissionHook(
  defaultMode: PermissionMode = 'default',
  rules: Map<string, PermissionMode> = new Map(),
): ToolPermissionHook {
  const denials = new Set<string>();

  return {
    async check(tool, input) {
      // Check deny list
      if (denials.has(tool.name)) {
        return { allowed: false, reason: `Tool '${tool.name}' was previously denied this session.` };
      }

      // Check explicit rule
      const ruleMode = rules.get(tool.name);
      const effectiveMode = ruleMode || defaultMode;

      // Auto-allow modes
      if (effectiveMode === 'bypassPermissions' || effectiveMode === 'auto') {
        return { allowed: true };
      }

      // Deny mode
      if (effectiveMode === 'dontAsk') {
        return { allowed: false, reason: `Tool '${tool.name}' is blocked by permission mode.` };
      }

      // Check tool's own permission logic
      if (tool.canUse) {
        const result = await tool.canUse({
          sessionId: '',
          toolUseId: '',
          messageId: '',
          signal: new AbortController().signal,
          permissionMode: effectiveMode,
          workingDirectory: process.cwd(),
          messages: [],
        });
        return result;
      }

      // Read-only tools allowed in acceptEdits mode
      if (effectiveMode === 'acceptEdits' && tool.isReadOnly) {
        return { allowed: true };
      }

      return { allowed: true };
    },

    getMode(toolName) {
      return rules.get(toolName) || defaultMode;
    },

    setMode(toolName, mode) {
      rules.set(toolName, mode);
    },

    isDenied(toolName) {
      return denials.has(toolName);
    },

    addDenial(toolName) {
      denials.add(toolName);
    },

    clearDenials() {
      denials.clear();
    },
  };
}
