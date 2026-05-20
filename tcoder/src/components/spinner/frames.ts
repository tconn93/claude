export const spinnerFrames: Record<string, string[]> = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\'],
  dots2: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  dots3: ['◜', '◠', '◝', '◞', '◡', '◟'],
  dots4: ['◐', '◓', '◑', '◒'],
  arc: ['◜', '◞', '◟', '◠', '◡', '◝'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  toggle: ['⊶', '⊷'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  triangle: ['◢', '◣', '◤', '◥'],
  square: ['◰', '◳', '◲', '◱'],
};

export const defaultFrameSet = 'dots';

export function getFrames(name: string = defaultFrameSet): string[] {
  return spinnerFrames[name] ?? spinnerFrames[defaultFrameSet];
}
