import type { MCPResource, MCPResourceContent, MCPServerConfig } from './types.ts';

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  variables?: Record<string, { description?: string; required?: boolean }>;
}

export function parseResourceUri(uri: string): {
  serverName: string;
  path: string;
} | null {
  try {
    const url = new URL(uri);
    const serverName = url.hostname;
    const path = url.pathname;
    return { serverName, path };
  } catch {
    const parts = uri.split('://');
    if (parts.length === 2) {
      const [scheme, rest] = parts;
      const pathParts = rest.split('/');
      const serverName = pathParts[0] ?? scheme;
      const path = '/' + pathParts.slice(1).join('/');
      return { serverName, path };
    }
    return null;
  }
}

export function formatResourceUri(serverName: string, path: string): string {
  return `${serverName}://resources${path.startsWith('/') ? path : `/${path}`}`;
}

export function isResourceReadable(resource: MCPResource): boolean {
  return !!resource.uri && !!resource.name;
}

export function filterResourcesByType(resources: MCPResource[], mimeType: string): MCPResource[] {
  return resources.filter((r) => r.mimeType === mimeType);
}

export function filterResourcesByPattern(resources: MCPResource[], pattern: string): MCPResource[] {
  const lower = pattern.toLowerCase();
  return resources.filter(
    (r) =>
      r.uri.toLowerCase().includes(lower) ||
      r.name.toLowerCase().includes(lower) ||
      (r.description?.toLowerCase().includes(lower) ?? false) ||
      (r.serverName?.toLowerCase().includes(lower) ?? false),
  );
}

export class ResourceManager {
  private resources = new Map<string, {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    content: () => Promise<string>;
  }>();

  register(
    uri: string,
    name: string,
    content: () => Promise<string>,
    options?: { description?: string; mimeType?: string },
  ): void {
    this.resources.set(uri, {
      uri,
      name,
      description: options?.description,
      mimeType: options?.mimeType,
      content,
    });
  }

  unregister(uri: string): void {
    this.resources.delete(uri);
  }

  async read(uri: string): Promise<string | null> {
    const resource = this.resources.get(uri);
    if (!resource) return null;
    return await resource.content();
  }

  list(): MCPResource[] {
    return Array.from(this.resources.values()).map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));
  }

  has(uri: string): boolean {
    return this.resources.has(uri);
  }

  clear(): void {
    this.resources.clear();
  }
}
