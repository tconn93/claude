import type { MCPAuthConfig } from './types.ts';

export interface MCPAuthResult {
  headers: Record<string, string>;
  token?: string;
  expiresAt?: number;
}

export class MCPAuthManager {
  private tokens = new Map<string, { token: string; expiresAt?: number }>();
  private configs = new Map<string, MCPAuthConfig>();

  registerConfig(serverName: string, config: MCPAuthConfig): void {
    this.configs.set(serverName, config);
  }

  unregisterConfig(serverName: string): void {
    this.configs.delete(serverName);
    this.tokens.delete(serverName);
  }

  async authenticate(serverName: string): Promise<MCPAuthResult> {
    const config = this.configs.get(serverName);
    if (!config || config.type === 'none') {
      return { headers: {} };
    }

    // Check cached token
    const cached = this.tokens.get(serverName);
    if (cached && cached.expiresAt && cached.expiresAt > Date.now()) {
      return {
        headers: this.buildHeaders(config, cached.token),
        token: cached.token,
        expiresAt: cached.expiresAt,
      };
    }

    switch (config.type) {
      case 'token':
        return this.handleTokenAuth(serverName, config);
      case 'api_key':
        return this.handleApiKeyAuth(config);
      case 'oauth':
        return this.handleOAuthAuth(serverName, config);
      default:
        return { headers: {} };
    }
  }

  isTokenValid(serverName: string): boolean {
    const cached = this.tokens.get(serverName);
    if (!cached) return false;
    if (cached.expiresAt) {
      return cached.expiresAt > Date.now();
    }
    return true;
  }

  clearToken(serverName: string): void {
    this.tokens.delete(serverName);
  }

  clearAll(): void {
    this.tokens.clear();
  }

  private async handleTokenAuth(
    serverName: string,
    config: MCPAuthConfig,
  ): Promise<MCPAuthResult> {
    const token = config.token ?? '';
    this.tokens.set(serverName, { token });
    return {
      headers: this.buildHeaders(config, token),
      token,
    };
  }

  private handleApiKeyAuth(config: MCPAuthConfig): MCPAuthResult {
    const token = config.token ?? '';
    return {
      headers: {
        ...(config.headers ?? {}),
        'x-api-key': token,
      },
      token,
    };
  }

  private async handleOAuthAuth(
    serverName: string,
    config: MCPAuthConfig,
  ): Promise<MCPAuthResult> {
    if (!config.tokenUrl || !config.clientId || !config.clientSecret) {
      throw new Error(`OAuth config incomplete for MCP server '${serverName}'`);
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: config.scopes?.join(' ') ?? '',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`OAuth token request failed: HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in?: number;
        token_type?: string;
      };

      const token = data.access_token;
      const expiresAt = data.expires_in
        ? Date.now() + data.expires_in * 1000
        : undefined;

      this.tokens.set(serverName, { token, expiresAt });

      return {
        headers: this.buildHeaders(config, token),
        token,
        expiresAt,
      };
    } catch (error) {
      throw new Error(
        `OAuth authentication failed for MCP server '${serverName}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private buildHeaders(config: MCPAuthConfig, token: string): Record<string, string> {
    return {
      ...(config.headers ?? {}),
      Authorization: `Bearer ${token}`,
    };
  }
}
