export interface VoiceConfig {
  enabled: boolean;
  inputDevice?: string;
  outputDevice?: string;
  language: string;
  sampleRate: number;
  audioFormat: 'pcm16' | 'opus' | 'aac';
  chunkSize: number;
  vadThreshold: number;
  silenceTimeoutMs: number;
  maxRecordingMs: number;
}

export interface VoiceSession {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  audioData?: Uint8Array;
  transcript?: string;
  error?: string;
}

export interface VoiceState {
  isRecording: boolean;
  isSpeaking: boolean;
  currentSession: VoiceSession | null;
  config: VoiceConfig;
  enabled: boolean;
}

export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  language?: string;
}

export interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
  language?: string;
}

export interface TTSEvent {
  type: 'audio' | 'done' | 'error';
  data?: Uint8Array;
  error?: string;
}
