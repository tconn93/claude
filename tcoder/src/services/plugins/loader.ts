import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin, PluginManifest, PluginHooks, PluginConfig } from './types.ts';

export class PluginLoader {
  private config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  async discoverPlugins(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    if (!existsSync(this.config.pluginsDir)) {
      return manifests;
    }

    try {
      const entries = readdirSync(this.config.pluginsDir);

      for (const entry of entries) {
        const pluginDir = join(this.config.pluginsDir, entry);

        try {
          if (!statSync(pluginDir).isDirectory()) continue;

          const manifestPath = join(pluginDir, 'plugin.json');
          const packageJsonPath = join(pluginDir, 'package.json');

          let manifest: PluginManifest | null = null;

          if (existsSync(manifestPath)) {
            manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PluginManifest;
          } else if (existsSync(packageJsonPath)) {
            const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as Record<string, unknown>;
            if (pkg.tcoder) {
              manifest = pkg.tcoder as PluginManifest;
            }
          }

          if (manifest) {
            manifests.push({
              ...manifest,
              main: manifest.main.startsWith('./')
                ? join(pluginDir, manifest.main.slice(2))
                : manifest.main,
            });
          }
        } catch {
          // Skip invalid plugin directories
        }
      }
    } catch {
      // Skip if can't read directory
    }

    return manifests;
  }

  async loadPlugin(manifest: PluginManifest): Promise<Plugin> {
    const id = `${manifest.name}@${manifest.version}`;

    const plugin: Plugin = {
      id,
      manifest,
      path: manifest.main,
      enabled: this.config.enabledPlugins.includes(manifest.name),
      status: 'loaded',
      loadedAt: Date.now(),
    };

    try {
      if (!existsSync(plugin.path)) {
        plugin.status = 'error';
        plugin.error = `Plugin main file not found: ${plugin.path}`;
        return plugin;
      }

      // Dynamic import
      const module = await import(plugin.path);
      const hooks = module.default ?? module;

      plugin.hooks = {
        onLoad: hooks.onLoad,
        onUnload: hooks.onUnload,
        onEnable: hooks.onEnable,
        onDisable: hooks.onDisable,
        getTools: hooks.getTools,
        getCommands: hooks.getCommands,
      };

      if (hooks.onLoad) {
        await hooks.onLoad();
      }

      if (hooks.getTools) {
        plugin.tools = hooks.getTools();
      }

      plugin.status = plugin.enabled ? 'active' : 'loaded';
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error.message : String(error);
    }

    return plugin;
  }

  async unloadPlugin(plugin: Plugin): Promise<void> {
    try {
      if (plugin.hooks?.onUnload) {
        await plugin.hooks.onUnload();
      }
    } catch {
      // Ignore unload errors
    }
  }

  async enablePlugin(plugin: Plugin): Promise<Plugin> {
    plugin.enabled = true;

    try {
      if (plugin.hooks?.onEnable) {
        await plugin.hooks.onEnable();
      }
      plugin.status = 'active';
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error.message : String(error);
    }

    return plugin;
  }

  async disablePlugin(plugin: Plugin): Promise<Plugin> {
    plugin.enabled = false;

    try {
      if (plugin.hooks?.onDisable) {
        await plugin.hooks.onDisable();
      }
      plugin.status = 'disabled';
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error.message : String(error);
    }

    return plugin;
  }

  updateConfig(config: Partial<PluginConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
