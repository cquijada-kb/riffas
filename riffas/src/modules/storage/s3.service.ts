import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get('AWS_S3_BUCKET')!;
    this.publicUrl = this.config.get('AWS_S3_PUBLIC_URL')!;

    this.s3 = new S3Client({
      region: this.config.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY')!
      }
    });
  }

  async uploadImage(
    buffer: Buffer,
    mimeType: string,
    key: string
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType
      })
    );

    return `${this.publicUrl}/${key}`;
  }

  async getObjectByUrl(url: string) {
    const key = this.extractKeyFromUrl(url);
    return this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private extractKeyFromUrl(url: string): string {
    if (url.startsWith(`${this.publicUrl}/`)) {
      return decodeURIComponent(url.slice(this.publicUrl.length + 1));
    }

    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  }
}
