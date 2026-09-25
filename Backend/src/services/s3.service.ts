import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
export const BUCKET =
  process.env.S3_BUCKET_NAME ||
  process.env.S3_BUCKET ||
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET ||
  process.env.BUCKET ||
  "";

if (!BUCKET) {
  console.warn("S3 bucket not set in environment (checked S3_BUCKET_NAME, S3_BUCKET, AWS_S3_BUCKET_NAME, AWS_S3_BUCKET, BUCKET). S3 operations will fail until configured.");
}

const s3Client = new S3Client({
  region: REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : undefined,
});

export function generateS3Key(userId: string, originalFileName: string) {
  const ext = originalFileName.includes(".") ? `.${originalFileName.split(".").pop()}` : "";
  return `${userId}/${Date.now()}-${randomUUID()}${ext}`;
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType?: string, bucketName?: string) {
  const targetBucket = bucketName || BUCKET;
  if (!targetBucket) throw new Error("S3 bucket is not configured");
  const cmd = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(cmd);
  return key;
}

export async function getSignedUploadUrl(key: string, expiresIn = 900, bucketName?: string) {
  const targetBucket = bucketName || BUCKET;
  if (!targetBucket) throw new Error("S3 bucket is not configured");
  const cmd = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
  });
  return getSignedUrl(s3Client, cmd, { expiresIn });
}

export async function getSignedDownloadUrl(key: string, expiresIn = 900, bucketName?: string) {
  const targetBucket = bucketName || BUCKET;
  if (!targetBucket) throw new Error("S3 bucket is not configured");
  const cmd = new GetObjectCommand({
    Bucket: targetBucket,
    Key: key,
  });
  return getSignedUrl(s3Client, cmd, { expiresIn });
}

export async function deleteObject(key: string) {
  if (!BUCKET) throw new Error("S3 bucket is not configured");
  const cmd = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  try {
    await s3Client.send(cmd);
  } catch (err: any) {
    console.error("Failed to delete S3 object:", err?.message || err);
    throw err;
  }
}

export { s3Client };
