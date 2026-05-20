export interface WebServerConfig {
  enabled: boolean;
  port: number;
  host: string;
  authRequired: boolean;
  corsOrigins: string[];
}

export interface SessionData {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  model: string;
  tags: string[];
}

export interface TerminalSession {
  id: string;
  cols: number;
  rows: number;
  pid: number;
  created: number;
  lastActivity: number;
}

export interface WebAuthToken {
  userId: string;
  sessionId: string;
  exp: number;
}

export interface ScrollbackBuffer {
  lines: string[];
  maxLines: number;
  addLine: (line: string) => void;
  getLines: () => string[];
  clear: () => void;
}

export function createScrollbackBuffer(maxLines = 5000): ScrollbackBuffer {
  const lines: string[] = [];
  return {
    lines,
    maxLines,
    addLine(line) {
      lines.push(line);
      while (lines.length > maxLines) {
        lines.shift();
      }
    },
    getLines() {
      return [...lines];
    },
    clear() {
      lines.length = 0;
    },
  };
}
