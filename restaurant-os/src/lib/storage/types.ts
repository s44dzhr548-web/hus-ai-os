export interface StorageUploadResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  upload(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<StorageUploadResult>;
  delete?(key: string): Promise<void>;
}
