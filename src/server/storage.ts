import "server-only";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "./env";
import { logger } from "./logger";

const globalForS3 = globalThis as unknown as {
  rentarideS3?: S3Client;
  rentarideBucketReady?: Promise<void>;
};

/**
 * S3 client. With S3_ENDPOINT set (SeaweedFS locally) it uses path-style
 * addressing; in production on EC2 leave S3_ENDPOINT empty and the instance
 * role (or the access keys) authorises it.
 */
function s3(): S3Client {
  if (!globalForS3.rentarideS3) {
    const e = env();
    globalForS3.rentarideS3 = new S3Client({
      region: e.S3_REGION,
      ...(e.S3_ENDPOINT && { endpoint: e.S3_ENDPOINT, forcePathStyle: true }),
      ...(e.S3_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: e.S3_ACCESS_KEY_ID,
          secretAccessKey: e.S3_SECRET_ACCESS_KEY,
        },
      }),
    });
  }
  return globalForS3.rentarideS3;
}

/** Create the bucket on first use in development (it must exist in production). */
function ensureBucket(): Promise<void> {
  globalForS3.rentarideBucketReady ??= (async () => {
    const Bucket = env().S3_BUCKET;
    try {
      await s3().send(new HeadBucketCommand({ Bucket }));
    } catch {
      if (!env().S3_ENDPOINT)
        throw new Error(`S3 bucket ${Bucket} is missing.`);
      await s3().send(new CreateBucketCommand({ Bucket }));
      logger.info("created storage bucket", { bucket: Bucket });
    }
  })().catch((e) => {
    globalForS3.rentarideBucketReady = undefined;
    throw e;
  });
  return globalForS3.rentarideBucketReady;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await ensureBucket();
  await s3().send(
    new PutObjectCommand({
      Bucket: env().S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** Stream an object. Returns null when it doesn't exist. */
export async function getObject(key: string) {
  try {
    const res = await s3().send(
      new GetObjectCommand({ Bucket: env().S3_BUCKET, Key: key }),
    );
    if (!res.Body) return null;
    return {
      body: res.Body.transformToWebStream(),
      contentType: res.ContentType ?? "application/octet-stream",
      length: res.ContentLength,
    };
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey") return null;
    throw e;
  }
}
