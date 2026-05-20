export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  dim: string;
  bright: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  isDark: boolean;
}

export const BUILTIN_THEMES: Record<string, Theme> = {
  default: {
    name: 'default',
    colors: {
      primary: '#7C3AED',
      secondary: '#6366F1',
      accent: '#06B6D4',
      background: '#1E1E2E',
      foreground: '#CDD6F4',
      muted: '#585B70',
      border: '#45475A',
      success: '#A6E3A1',
      warning: '#F9E2AF',
      error: '#F38BA8',
      info: '#89B4FA',
      dim: '#6C7086',
      bright: '#F5F5F5',
    },
    isDark: true,
  },
  dark: {
    name: 'dark',
    colors: {
      primary: '#7C3AED',
      secondary: '#6366F1',
      accent: '#06B6D4',
      background: '#1A1B26',
      foreground: '#A9B1D6',
      muted: '#565F89',
      border: '#3B4261',
      success: '#9ECE6A',
      warning: '#E0AF68',
      error: '#F7768E',
      info: '#7AA2F7',
      dim: '#565F89',
      bright: '#C0CAF5',
    },
    isDark: true,
  },
  light: {
    name: 'light',
    colors: {
      primary: '#7C3AED',
      secondary: '#4F46E5',
      accent: '#0891B2',
      background: '#F8F9FA',
      foreground: '#212529',
      muted: '#868E96',
      border: '#DEE2E6',
      success: '#2F9E44',
      warning: '#F08C00',
      error: '#E03131',
      info: '#1971C2',
      dim: '#ADB5BD',
      bright: '#0C0C0C',
    },
    isDark: false,
  },
  monochrome: {
    name: 'monochrome',
    colors: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      accent: '#999999',
      background: '#000000',
      foreground: '#FFFFFF',
      muted: '#666666',
      border: '#333333',
      success: '#FFFFFF',
      warning: '#CCCCCC',
      error: '#FFFFFF',
      info: '#999999',
      dim: '#444444',
      bright: '#FFFFFF',
    },
    isDark: true,
  },
  ocean: {
    name: 'ocean',
    colors: {
      primary: '#00B4D8',
      secondary: '#0077B6',
      accent: '#90E0EF',
      background: '#03045E',
      foreground: '#CAF0F8',
      muted: '#0077B6',
      border: '#00B4D8',
      success: '#90E0EF',
      warning: '#F9E2AF',
      error: '#FF6B6B',
      info: '#48CAE4',
      dim: '#0077B6',
      bright: '#FFFFFF',
    },
    isDark: true,
  },
  forest: {
    name: 'forest',
    colors: {
      primary: '#2D6A4F',
      secondary: '#40916C',
      accent: '#95D5B2',
      background: '#081C15',
      foreground: '#D8F3DC',
      muted: '#40916C',
      border: '#2D6A4F',
      success: '#95D5B2',
      warning: '#FFCA3A',
      error: '#FF595E',
      info: '#52B788',
      dim: '#1B4332',
      bright: '#F0FFF0',
    },
    isDark: true,
  },
};

export function getTheme(name?: string): Theme {
  const themeName = name ?? 'default';
  return BUILTIN_THEMES[themeName] ?? BUILTIN_THEMES.default;
}

export function listThemes(): string[] {
  return Object.keys(BUILTIN_THEMES);
}

export function getThemeNames(): Theme[] {
  return Object.values(BUILTIN_THEMES);
}

export function isValidTheme(name: string): boolean {
  return name in BUILTIN_THEMES;
}

export function isDarkTheme(theme: Theme): boolean {
  return theme.isDark;
}

export function getColor(theme: Theme, color: keyof ThemeColors): string {
  return theme.colors[color];
}

export function createCustomTheme(name: string, colors: Partial<ThemeColors>, isDark = true): Theme {
  const base = getTheme('default');
  return {
    name,
    colors: { ...base.colors, ...colors },
    isDark,
  };
}
