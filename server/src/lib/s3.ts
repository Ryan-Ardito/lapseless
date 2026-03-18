import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env';

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

// Separate client for generating presigned URLs accessible from the browser
const s3Public = env.S3_PUBLIC_ENDPOINT
  ? new S3Client({
      endpoint: env.S3_PUBLIC_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    })
  : s3;

export async function createPresignedUploadUrl(key: string, contentType: string, contentLength: number) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(s3Public, command, { expiresIn: 300 });
}

function sanitizeContentDisposition(fileName: string): string {
  const ascii = fileName.replace(/["\\\x00-\x1f\x7f]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function createPresignedDownloadUrl(key: string, fileName: string) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ResponseContentDisposition: sanitizeContentDisposition(fileName),
  });
  return getSignedUrl(s3Public, command, { expiresIn: 900 });
}

export async function getObjectSize(key: string): Promise<number> {
  const response = await s3.send(new HeadObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  }));
  const size = response.ContentLength;
  if (size === undefined) {
    throw new Error(`S3 object missing ContentLength: ${key}`);
  }
  return size;
}

export async function deleteS3Object(key: string) {
  await s3.send(new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  }));
}
