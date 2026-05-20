import type { VoiceConfig, VoiceSession, VoiceState, STTResult, TTSOptions, TTSEvent } from './types.ts';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: false,
  language: 'en',
  sampleRate: 16000,
  audioFormat: 'pcm16',
  chunkSize: 4096,
  vadThreshold: 0.5,
  silenceTimeoutMs: 1500,
  maxRecordingMs: 60000,
};

export class VoiceManager {
  private config: VoiceConfig;
  private state: VoiceState;
  private sessions: VoiceSession[] = [];
  private sessionCounter = 0;

  constructor(config?: Partial<VoiceConfig>) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
    this.state = {
      isRecording: false,
      isSpeaking: false,
      currentSession: null,
      config: this.config,
      enabled: this.config.enabled,
    };
  }

  getState(): VoiceState {
    return { ...this.state };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  enable(): void {
    this.config.enabled = true;
    this.state.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
    this.state.enabled = false;
    this.stopListening();
  }

  updateConfig(partial: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...partial };
    this.state.config = this.config;
  }

  startListening(): VoiceSession {
    if (this.state.isRecording) {
      throw new Error('Already recording');
    }

    const session: VoiceSession = {
      id: `voice_${++this.sessionCounter}_${Date.now()}`,
      startTime: Date.now(),
      status: 'listening',
    };

    this.state.currentSession = session;
    this.state.isRecording = true;
    this.sessions.push(session);

    return session;
  }

  stopListening(): VoiceSession | null {
    if (!this.state.currentSession) return null;

    const session = this.state.currentSession;
    session.endTime = Date.now();
    session.status = 'idle';

    this.state.currentSession = null;
    this.state.isRecording = false;

    return session;
  }

  setTranscript(sessionId: string, transcript: string): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.transcript = transcript;
      session.status = 'idle';
    }
  }

  setAudioData(sessionId: string, data: Uint8Array): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.audioData = data;
    }
  }

  setError(sessionId: string, error: string): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.error = error;
      session.status = 'error';
    }
  }

  startSpeaking(): void {
    this.state.isSpeaking = true;
  }

  stopSpeaking(): void {
    this.state.isSpeaking = false;
  }

  getSession(sessionId: string): VoiceSession | null {
    return this.sessions.find((s) => s.id === sessionId) ?? null;
  }

  getCurrentSession(): VoiceSession | null {
    return this.state.currentSession;
  }

  getAllSessions(): VoiceSession[] {
    return [...this.sessions];
  }

  getRecentSessions(count = 10): VoiceSession[] {
    return this.sessions.slice(-count);
  }

  clearHistory(): void {
    this.sessions = [];
  }

  isListening(): boolean {
    return this.state.isRecording;
  }

  isSpeaking(): boolean {
    return this.state.isSpeaking;
  }
}

export const voiceManager = new VoiceManager();
