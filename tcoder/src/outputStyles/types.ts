export interface OutputStyle {
  name: string;
  description: string;
  format: 'markdown' | 'plain' | 'json' | 'custom';
  template?: string;
  colors?: OutputStyleColors;
  options?: Record<string, unknown>;
}

export interface OutputStyleColors {
  userMessage: string;
  assistantMessage: string;
  systemMessage: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  code: string;
  link: string;
  bold: string;
  italic: string;
}

export const DEFAULT_OUTPUT_STYLE: OutputStyle = {
  name: 'default',
  description: 'Default tcoder output style',
  format: 'markdown',
  colors: {
    userMessage: 'cyan',
    assistantMessage: 'white',
    systemMessage: 'gray',
    error: 'red',
    success: 'green',
    warning: 'yellow',
    info: 'blue',
    code: 'magenta',
    link: 'blue',
    bold: 'white',
    italic: 'white',
  },
};

export const MINIMAL_OUTPUT_STYLE: OutputStyle = {
  name: 'minimal',
  description: 'Minimal output with less formatting',
  format: 'plain',
  colors: {
    userMessage: 'white',
    assistantMessage: 'white',
    systemMessage: 'gray',
    error: 'red',
    success: 'white',
    warning: 'white',
    info: 'white',
    code: 'white',
    link: 'white',
    bold: 'white',
    italic: 'white',
  },
};
