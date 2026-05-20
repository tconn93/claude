export type PermissionMode =
  | 'auto'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'default'
  | 'dontAsk'
  | 'plan';

export type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export interface PermissionRule {
  toolName: string;
  mode: PermissionMode;
  scope?: 'project' | 'user' | 'session';
  args?: Record<string, unknown>;
}

export interface PermissionConfig {
  rules: PermissionRule[];
  defaultMode: PermissionMode;
  denyList: string[];
}

export interface AdditionalWorkingDirectory {
  path: string;
  label?: string;
}
