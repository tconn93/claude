import type { Plugin, PluginManifest, PluginConfig, PluginSearchResult } from './types.ts';
import { PluginLoader } from './loader.ts';

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private loader: PluginLoader;

  constructor(config: PluginConfig) {
    this.loader = new PluginLoader(config);
  }

  async discoverAndLoad(): Promise<Plugin[]> {
    const manifests = await this.loader.discoverPlugins();
    const plugins: Plugin[] = [];

    for (const manifest of manifests) {
      const plugin = await this.loader.loadPlugin(manifest);
      this.plugins.set(plugin.id, plugin);
      plugins.push(plugin);
    }

    return plugins;
  }

  async loadPlugin(manifest: PluginManifest): Promise<Plugin> {
    const plugin = await this.loader.loadPlugin(manifest);
    this.plugins.set(plugin.id, plugin);
    return plugin;
  }

  async unloadPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (plugin) {
      await this.loader.unloadPlugin(plugin);
      this.plugins.delete(id);
    }
  }

  async enablePlugin(id: string): Promise<Plugin | null> {
    const plugin = this.plugins.get(id);
    if (!plugin) return null;
    const enabled = await this.loader.enablePlugin(plugin);
    this.plugins.set(id, enabled);
    return enabled;
  }

  async disablePlugin(id: string): Promise<Plugin | null> {
    const plugin = this.plugins.get(id);
    if (!plugin) return null;
    const disabled = await this.loader.disablePlugin(plugin);
    this.plugins.set(id, disabled);
    return disabled;
  }

  getPlugin(id: string): Plugin | null {
    return this.plugins.get(id) ?? null;
  }

  getPluginByName(name: string): Plugin | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.manifest.name === name) return plugin;
    }
    return null;
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): Plugin[] {
    return this.getAllPlugins().filter((p) => p.status === 'active');
  }

  getPluginsByType(type: PluginManifest['type']): Plugin[] {
    return this.getAllPlugins().filter((p) => p.manifest.type === type);
  }

  getPluginTools(): Array<{ pluginName: string; tools: Plugin['tools'] }> {
    const result: Array<{ pluginName: string; tools: Plugin['tools'] }> = [];

    for (const plugin of this.getActivePlugins()) {
      if (plugin.tools && plugin.tools.length > 0) {
        result.push({ pluginName: plugin.manifest.name, tools: plugin.tools });
      }
    }

    return result;
  }

  searchPlugins(query: string): PluginSearchResult[] {
    const lower = query.toLowerCase();
    const results: PluginSearchResult[] = [];

    for (const plugin of this.plugins.values()) {
      let score = 0;

      if (plugin.manifest.name.toLowerCase().includes(lower)) score += 10;
      if (plugin.manifest.description.toLowerCase().includes(lower)) score += 5;
      if (plugin.manifest.keywords?.some((k) => k.toLowerCase().includes(lower))) score += 3;
      if (plugin.manifest.author?.toLowerCase().includes(lower)) score += 1;

      if (score > 0) {
        results.push({ plugin, matchScore: score });
      }
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
  }

  hasPlugin(id: string): boolean {
    return this.plugins.has(id);
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  getActiveCount(): number {
    return this.getActivePlugins().length;
  }
}
