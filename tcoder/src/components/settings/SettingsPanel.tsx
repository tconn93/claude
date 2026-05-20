import React, { type ReactElement } from 'react';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { Divider } from '../ui/Divider.tsx';
import { APP_NAME, APP_VERSION } from '../../constants/common.ts';

export interface SettingsData {
  model: string;
  theme: string;
  permissionMode: string;
  workingDirectory: string;
  gitBranch: string | null;
  sessionId: string;
  fastMode: boolean;
  config: Record<string, unknown>;
}

export interface SettingsPanelProps {
  settings: SettingsData;
}

function SettingRow({ label, value }: { label: string; value: string }): ReactElement {
  return React.createElement(Flex, { flexDirection: 'row', gap: 2 },
    React.createElement(Text, { dim: true }, label.padEnd(20)),
    React.createElement(Text, { bold: true }, value),
  );
}

export function SettingsPanel(props: SettingsPanelProps): ReactElement {
  const { settings } = props;

  return React.createElement(
    Box,
    { border: 'single', padding: 1 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      React.createElement(Text, { bold: true, underline: true }, `${APP_NAME} v${APP_VERSION}`),
      React.createElement(Divider, { char: '─' }),
      React.createElement(SettingRow, { label: 'Session ID', value: settings.sessionId }),
      React.createElement(SettingRow, { label: 'Model', value: settings.model }),
      React.createElement(SettingRow, { label: 'Theme', value: settings.theme }),
      React.createElement(SettingRow, { label: 'Permission Mode', value: settings.permissionMode }),
      React.createElement(SettingRow, { label: 'Working Directory', value: settings.workingDirectory }),
      React.createElement(SettingRow, { label: 'Git Branch', value: settings.gitBranch ?? 'none' }),
      React.createElement(SettingRow, { label: 'Fast Mode', value: settings.fastMode ? 'on' : 'off' }),
      settings.config && Object.keys(settings.config).length > 0
        ? React.createElement(Flex, { flexDirection: 'column', gap: 0 },
            React.createElement(Divider, { char: '─' }),
            React.createElement(Text, { dim: true }, 'Config:'),
            ...Object.entries(settings.config).map(([k, v]) =>
              React.createElement(SettingRow, { key: k, label: `  ${k}`, value: String(v) }),
            ),
          )
        : null,
    ),
  );
}
