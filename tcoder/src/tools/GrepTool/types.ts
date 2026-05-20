export interface GrepInput {
  pattern: string;
  path?: string;
  include?: string;
  exclude?: string;
  maxResults?: number;
  contextBefore?: number;
  contextAfter?: number;
  maxFileSize?: number;
  ignoreCase?: boolean;
}
