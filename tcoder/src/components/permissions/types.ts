import type { ToolDefinition } from '../../types/tool.ts';

export interface PermissionDialogOptions {
  tool: ToolDefinition;
  args: Record<string, unknown>;
  onAllow: () => void;
  onDeny: () => void;
  onAllowAll: () => void;
}

export interface PermissionDialogState {
  isOpen: boolean;
  tool: ToolDefinition | null;
  args: Record<string, unknown>;
}
