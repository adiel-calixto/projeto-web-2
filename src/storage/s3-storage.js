import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export function createS3Storage({
  bucket,
  region,
  publicBaseUrl,
  client,
  endpoint = null,
  forcePathStyle = false,
}) {
  const s3 = client ?? new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle } : {}),
  });
  const baseUrl = publicBaseUrl.replace(/\/+$/, '');

  return {
    async upload({ key, body, contentType }) {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      return { url: `${baseUrl}/${key}` };
    },

    async deleteByUrl(url) {
      if (!url || !url.startsWith(`${baseUrl}/`)) {
        return;
      }

      const key = url.slice(baseUrl.length + 1);

      if (!key) {
        return;
      }

      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
