export interface WebSearchInput {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
  maxResults?: number;
}
