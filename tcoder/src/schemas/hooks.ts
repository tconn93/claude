import { z } from 'zod';

export const HookTypeSchema = z.enum([
  'preToolUse',
  'postToolUse',
  'preMessage',
  'postMessage',
  'onStop',
  'onResume',
]);

export const HookConfigSchema = z.object({
  type: HookTypeSchema,
  command: z.string().min(1),
  timeout: z.number().positive().optional().default(60_000),
  matcher: z.string().optional(),
});

export const HookEventSchema = z.object({
  type: HookTypeSchema,
  sessionId: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
});

export const HookResultSchema = z.object({
  allowed: z.boolean(),
  message: z.string().optional(),
  modifiedInput: z.record(z.unknown()).optional(),
});

export type HookConfig = z.infer<typeof HookConfigSchema>;
export type HookEvent = z.infer<typeof HookEventSchema>;
export type HookResult = z.infer<typeof HookResultSchema>;
