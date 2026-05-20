import { execSync } from 'node:child_process';
import { APP_NAME } from '../constants/common.ts';

export interface NotificationOptions {
  title: string;
  body: string;
  urgency?: 'low' | 'normal' | 'critical';
  icon?: string;
  timeout?: number;
  sound?: boolean;
}

export interface NotifierConfig {
  enabled: boolean;
  useSystemNotifications: boolean;
  showToolResults: boolean;
  showErrors: boolean;
  maxNotificationsPerMinute: number;
}

export const DEFAULT_NOTIFIER_CONFIG: NotifierConfig = {
  enabled: true,
  useSystemNotifications: true,
  showToolResults: false,
  showErrors: true,
  maxNotificationsPerMinute: 10,
};

export class DesktopNotifier {
  private config: NotifierConfig;
  private notificationTimestamps: number[] = [];
  private sentCount = 0;

  constructor(config?: Partial<NotifierConfig>) {
    this.config = { ...DEFAULT_NOTIFIER_CONFIG, ...config };
  }

  async notify(options: NotificationOptions): Promise<boolean> {
    if (!this.config.enabled) return false;

    if (!this.checkRateLimit()) {
      return false;
    }

    this.notificationTimestamps.push(Date.now());
    this.sentCount++;

    try {
      if (this.config.useSystemNotifications) {
        return this.sendSystemNotification(options);
      }

      return this.sendConsoleNotification(options);
    } catch {
      return this.sendConsoleNotification(options);
    }
  }

  async notifyCompletion(
    title: string,
    body: string,
    options?: Partial<NotificationOptions>,
  ): Promise<boolean> {
    return this.notify({
      title,
      body,
      urgency: 'normal',
      ...options,
    });
  }

  async notifyError(
    title: string,
    body: string,
    options?: Partial<NotificationOptions>,
  ): Promise<boolean> {
    if (!this.config.showErrors) return false;

    return this.notify({
      title,
      body,
      urgency: 'critical',
      ...options,
    });
  }

  async notifyToolResult(
    toolName: string,
    result: string,
  ): Promise<boolean> {
    if (!this.config.showToolResults) return false;

    return this.notify({
      title: `Tool: ${toolName}`,
      body: result.substring(0, 200),
      urgency: 'low',
      timeout: 3000,
    });
  }

  getSentCount(): number {
    return this.sentCount;
  }

  resetCounters(): void {
    this.sentCount = 0;
    this.notificationTimestamps = [];
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  updateConfig(partial: Partial<NotifierConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    this.notificationTimestamps = this.notificationTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    );

    return this.notificationTimestamps.length < this.config.maxNotificationsPerMinute;
  }

  private sendSystemNotification(options: NotificationOptions): boolean {
    const platform = process.platform;

    if (platform === 'darwin') {
      return this.sendMacNotification(options);
    } else if (platform === 'linux') {
      return this.sendLinuxNotification(options);
    } else if (platform === 'win32') {
      return this.sendWindowsNotification(options);
    }

    return false;
  }

  private sendMacNotification(options: NotificationOptions): boolean {
    try {
      const script = `display notification "${options.body}" with title "${options.title}"`;
      const soundLine = options.sound !== false ? ' sound name "default"' : '';
      execSync(`osascript -e '${script}${soundLine}'`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private sendLinuxNotification(options: NotificationOptions): boolean {
    try {
      const args = [
        `--app-name=${APP_NAME}`,
        options.title,
        options.body,
      ];

      if (options.urgency === 'critical') {
        args.unshift('--urgency=critical');
      }

      if (options.timeout) {
        args.unshift(`--expire-time=${options.timeout}`);
      }

      if (options.icon) {
        args.unshift(`--icon=${options.icon}`);
      }

      execSync(`notify-send ${args.map((a) => `"${a}"`).join(' ')}`, {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private sendWindowsNotification(options: NotificationOptions): boolean {
    try {
      const script = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $textNodes = $template.GetElementsByTagName("text")
        $textNodes.Item(0).AppendChild($template.CreateTextNode("${options.title}")) > $null
        $textNodes.Item(1).AppendChild($template.CreateTextNode("${options.body}")) > $null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("${APP_NAME}").Show($toast)
      `;
      execSync(`powershell -Command "${script.replace(/"/g, '\\"')}"`, {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private sendConsoleNotification(options: NotificationOptions): boolean {
    const prefix = options.urgency === 'critical' ? '[ERROR]' :
      options.urgency === 'low' ? '[INFO]' : '[NOTIFY]';
    console.log(`${prefix} ${options.title}: ${options.body}`);
    return true;
  }
}

export const notifier = new DesktopNotifier();
