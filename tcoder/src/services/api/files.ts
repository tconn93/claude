import { FILE_SIZE_LIMIT } from '../../constants/common.ts';
import { ApiError, ApiErrorCode } from './errors.ts';

export interface FileUploadOptions {
  filePath: string;
  fileName: string;
  mimeType?: string;
  purpose?: string;
}

export interface FileUploadResult {
  id: string;
  fileName: string;
  bytes: number;
  createdAt: number;
  purpose: string;
}

export interface FileMetadata {
  id: string;
  fileName: string;
  bytes: number;
  createdAt: number;
  mimeType: string;
  purpose: string;
  expiresAt?: number;
}

export function validateFileSize(filePath: string, content: Buffer | string): boolean {
  const size = typeof content === 'string' ? Buffer.byteLength(content) : content.length;
  return size <= FILE_SIZE_LIMIT;
}

export function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';

  const mimeMap: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    js: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    jsx: 'text/javascript',
    css: 'text/css',
    html: 'text/html',
    xml: 'application/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    toml: 'application/toml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    pdf: 'application/pdf',
    py: 'text/x-python',
    rb: 'text/x-ruby',
    rs: 'text/x-rust',
    go: 'text/x-go',
    java: 'text/x-java',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    h: 'text/x-c',
    sh: 'text/x-shellscript',
    bash: 'text/x-shellscript',
    zsh: 'text/x-shellscript',
    sql: 'text/x-sql',
    graphql: 'application/graphql',
  };

  return mimeMap[ext] ?? 'application/octet-stream';
}

export function encodeFileForUpload(content: Buffer): string {
  return content.toString('base64');
}

export function createImageContentBlock(
  mediaType: string,
  data: string,
): { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data,
    },
  };
}

export function isImageFile(filePath: string): boolean {
  const mimeType = getMimeType(filePath);
  return mimeType.startsWith('image/');
}

export function isTextFile(filePath: string): boolean {
  const mimeType = getMimeType(filePath);
  return mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml';
}

export async function uploadFile(
  apiKey: string,
  baseUrl: string,
  options: FileUploadOptions,
  content: Buffer,
): Promise<FileUploadResult> {
  const formData = new FormData();
  formData.append('file', new Blob([content]), options.fileName);
  formData.append('purpose', options.purpose ?? 'user-data');

  try {
    const response = await fetch(`${baseUrl}/v1/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw ApiError.fromHttpStatus(response.status, `File upload failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as FileUploadResult;
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.fromNetworkError(error);
  }
}

export async function listFiles(
  apiKey: string,
  baseUrl: string,
): Promise<FileMetadata[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/files`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw ApiError.fromHttpStatus(response.status, `File list failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { data: FileMetadata[] };
    return data.data ?? [];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.fromNetworkError(error);
  }
}

export async function deleteFile(
  apiKey: string,
  baseUrl: string,
  fileId: string,
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw ApiError.fromHttpStatus(response.status, `File delete failed: HTTP ${response.status}`);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.fromNetworkError(error);
  }
}
