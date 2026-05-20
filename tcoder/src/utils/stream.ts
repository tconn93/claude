import { Readable, Writable, Transform, pipeline } from 'node:stream';
import { promisify } from 'node:util';

const pipelineAsync = promisify(pipeline);

export function createReadableStream<T = string>(
  items: T[],
  options?: { objectMode?: boolean },
): Readable {
  const stream = new Readable({
    objectMode: options?.objectMode ?? true,
    read() {
      for (const item of items) {
        this.push(item);
      }
      this.push(null);
    },
  });

  return stream;
}

export function createWritableStream<T = string>(
  onData: (chunk: T) => void,
  options?: { objectMode?: boolean },
): Writable {
  return new Writable({
    objectMode: options?.objectMode ?? true,
    write(chunk: T, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      try {
        onData(chunk);
        callback();
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },
  });
}

export function createTransformStream<I, O>(
  transform: (chunk: I) => O,
  options?: { objectMode?: boolean },
): Transform {
  return new Transform({
    objectMode: options?.objectMode ?? true,
    transform(chunk: I, _encoding: BufferEncoding, callback: (error?: Error | null, data?: O) => void) {
      try {
        const result = transform(chunk);
        callback(null, result);
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },
  });
}

export function collectStream<T>(stream: Readable): Promise<T[]> {
  const chunks: T[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: T) => chunks.push(chunk));
    stream.on('end', () => resolve(chunks));
    stream.on('error', reject);
  });
}

export function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    readable.on('data', (chunk: Buffer) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export function stringToStream(text: string): Readable {
  return Readable.from([text]);
}

export function asyncIteratorToStream<T>(iterator: AsyncIterable<T>): Readable {
  return Readable.from(iterator);
}

export async function streamToAsyncIterator<T>(stream: Readable): Promise<AsyncIterable<T>> {
  return stream;
}

export function mergeStreams<T>(...streams: Readable[]): Readable {
  const merged = new Readable({
    objectMode: true,
    read() {},
  });

  let completed = 0;

  for (const stream of streams) {
    stream.on('data', (chunk: T) => {
      if (!merged.destroyed) {
        merged.push(chunk);
      }
    });

    stream.on('end', () => {
      completed++;
      if (completed === streams.length) {
        merged.push(null);
      }
    });

    stream.on('error', (err: Error) => {
      merged.destroy(err);
    });
  }

  return merged;
}

export async function pipeStreams(
  ...streams: (Readable | Writable | Transform)[]
): Promise<void> {
  return pipelineAsync(streams as [Readable, ...Array<Writable | Transform>]);
}

export function splitStream(stream: Readable, predicate: (chunk: unknown) => boolean): [Readable, Readable] {
  const pass = new Readable({ objectMode: true, read() {} });
  const fail = new Readable({ objectMode: true, read() {} });

  stream.on('data', (chunk: unknown) => {
    if (predicate(chunk)) {
      pass.push(chunk);
    } else {
      fail.push(chunk);
    }
  });

  stream.on('end', () => {
    pass.push(null);
    fail.push(null);
  });

  stream.on('error', (err: Error) => {
    pass.destroy(err);
    fail.destroy(err);
  });

  return [pass, fail];
}
