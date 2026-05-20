export type EventLevel = 'debug' | 'info' | 'warn' | 'error';

export type EventCategory =
  | 'session'
  | 'message'
  | 'tool'
  | 'api'
  | 'ui'
  | 'error'
  | 'performance'
  | 'config'
  | 'telemetry';

export interface AnalyticsEvent {
  id: string;
  category: EventCategory;
  level: EventLevel;
  name: string;
  timestamp: number;
  sessionId?: string;
  data?: Record<string, unknown>;
  tags?: Record<string, string>;
}

let eventCounter = 0;

export function createEvent(
  category: EventCategory,
  name: string,
  options?: {
    level?: EventLevel;
    sessionId?: string;
    data?: Record<string, unknown>;
    tags?: Record<string, string>;
  },
): AnalyticsEvent {
  return {
    id: `evt_${++eventCounter}_${Date.now()}`,
    category,
    level: options?.level ?? 'info',
    name,
    timestamp: Date.now(),
    sessionId: options?.sessionId,
    data: options?.data,
    tags: options?.tags,
  };
}

export function createSessionEvent(sessionId: string, name: string, data?: Record<string, unknown>): AnalyticsEvent {
  return createEvent('session', name, { sessionId, data });
}

export function createMessageEvent(sessionId: string, name: string, data?: Record<string, unknown>): AnalyticsEvent {
  return createEvent('message', name, { sessionId, data });
}

export function createToolEvent(sessionId: string, toolName: string, data?: Record<string, unknown>): AnalyticsEvent {
  return createEvent('tool', toolName, { sessionId, data });
}

export function createApiEvent(sessionId: string, name: string, data?: Record<string, unknown>): AnalyticsEvent {
  return createEvent('api', name, { sessionId, data });
}

export function createErrorEvent(sessionId: string, name: string, data?: Record<string, unknown>): AnalyticsEvent {
  return createEvent('error', name, { level: 'error', sessionId, data });
}

export function createPerformanceEvent(sessionId: string, name: string, data?: Record<string, unknown>): AnalyticsEvent {
  return createEvent('performance', name, { sessionId, data });
}
