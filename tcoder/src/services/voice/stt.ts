import type { STTResult, VoiceConfig } from './types.ts';

export interface STTEngine {
  name: string;
  recognize(audioData: Uint8Array, config: VoiceConfig): Promise<STTResult>;
  isAvailable(): boolean;
}

export class LocalSTTEngine implements STTEngine {
  name = 'local';

  async recognize(audioData: Uint8Array, config: VoiceConfig): Promise<STTResult> {
    // Placeholder for local STT (e.g., whisper.cpp integration)
    // In a real implementation, this would use a local STT model
    return {
      text: '',
      confidence: 0,
      isFinal: false,
    };
  }

  isAvailable(): boolean {
    return false;
  }
}

export class RemoteSTTEngine implements STTEngine {
  name = 'remote';
  private endpoint: string;
  private apiKey?: string;

  constructor(endpoint?: string, apiKey?: string) {
    this.endpoint = endpoint ?? 'https://api.x.ai/v1/audio/transcriptions';
    this.apiKey = apiKey;
  }

  async recognize(audioData: Uint8Array, config: VoiceConfig): Promise<STTResult> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': `audio/${config.audioFormat}`,
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: audioData,
      });

      if (!response.ok) {
        throw new Error(`STT request failed: HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        text: string;
        confidence: number;
        is_final: boolean;
        language?: string;
      };

      return {
        text: data.text,
        confidence: data.confidence,
        isFinal: data.is_final,
        language: data.language,
      };
    } catch {
      return {
        text: '',
        confidence: 0,
        isFinal: false,
      };
    }
  }

  isAvailable(): boolean {
    return true;
  }
}

export class STTService {
  private engines: STTEngine[] = [];

  constructor() {
    this.engines.push(new LocalSTTEngine());
    this.engines.push(new RemoteSTTEngine());
  }

  addEngine(engine: STTEngine): void {
    this.engines.push(engine);
  }

  async recognize(audioData: Uint8Array, config: VoiceConfig): Promise<STTResult> {
    for (const engine of this.engines) {
      if (engine.isAvailable()) {
        try {
          const result = await engine.recognize(audioData, config);
          if (result.text.length > 0 || result.isFinal) {
            return result;
          }
        } catch {
          // Try next engine
        }
      }
    }

    return {
      text: '',
      confidence: 0,
      isFinal: false,
    };
  }

  getAvailableEngines(): string[] {
    return this.engines.filter((e) => e.isAvailable()).map((e) => e.name);
  }
}

export const sttService = new STTService();
