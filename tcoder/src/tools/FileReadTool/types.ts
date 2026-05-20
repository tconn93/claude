export interface FileReadInput {
  file_path: string;
  offset?: number;
  limit?: number;
  encoding?: string;
}

export interface FileReadOutput {
  content: string;
  filePath: string;
  totalLines: number;
  linesRead: number;
  offset: number;
  fileSize: number;
  mimeType: string;
  isBinary: boolean;
}
