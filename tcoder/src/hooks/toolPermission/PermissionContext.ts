import { createContext, useContext } from 'react';
import type { PermissionMode, PermissionResult } from '../../types/permissions.ts';
import type { ToolDefinition } from '../../types/tool.ts';

export interface PermissionContextValue {
  permissionMode: PermissionMode;
  setPermissionMode: (mode: PermissionMode) => void;
  requestPermission: (tool: ToolDefinition, args: Record<string, unknown>) => Promise<PermissionResult>;
  isPending: boolean;
  pendingToolName: string | null;
  resolvePermission: (allowed: boolean) => void;
}

export const PermissionContext = createContext<PermissionContextValue>({
  permissionMode: 'default',
  setPermissionMode: () => {},
  requestPermission: async () => ({ allowed: true }),
  isPending: false,
  pendingToolName: null,
  resolvePermission: () => {},
});

export function usePermissionContext(): PermissionContextValue {
  return useContext(PermissionContext);
}
