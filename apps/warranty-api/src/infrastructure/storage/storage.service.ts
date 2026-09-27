import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ExternalServiceError } from '../../common/errors/app-error';
import { env } from '../../env';

const UPLOAD_URL_TTL_S = 10 * 60;
const DOWNLOAD_URL_TTL_S = 60 * 60;

const client = (endpoint: string | undefined) =>
  new S3Client({
    endpoint,
    region: env.S3_REGION,
    forcePathStyle: !!endpoint, // RustFS/MinIO-style endpoints use path-style URLs
    // The SDK otherwise signs a CRC32 of the (empty) body into presigned PUT URLs, which real S3/R2
    // then enforce against the uploaded file and reject.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

const storageError = (cause: unknown) =>
  new ExternalServiceError(
    'STORAGE_FAILED',
    'File storage is unavailable.',
    [],
    { cause },
  );

/** The private receipts bucket. Devices move bytes directly via presigned URLs; the API never proxies files. */
@Injectable()
export class StorageService {
  private readonly s3 = client(env.S3_ENDPOINT);
  // Signing is local (no network); a separate client just so URLs carry the device-reachable host.
  private readonly publicS3 = client(env.S3_PUBLIC_ENDPOINT);

  /** PUT URL bound to this exact content type and length, valid 10 minutes. */
  presignUpload(
    key: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<string> {
    return getSignedUrl(
      this.publicS3,
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
      {
        expiresIn: UPLOAD_URL_TTL_S,
        signableHeaders: new Set(['content-type', 'content-length']),
        unhoistableHeaders: new Set(['content-type', 'content-length']),
      },
    );
  }

  /** GET URL valid 1 hour. Generated per read, never stored. */
  presignDownload(key: string): Promise<string> {
    return getSignedUrl(
      this.publicS3,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      {
        expiresIn: DOWNLOAD_URL_TTL_S,
      },
    );
  }

  /** Size and type of an uploaded object, or null if nothing is there. */
  async head(
    key: string,
  ): Promise<{ sizeBytes: number; contentType?: string } | null> {
    try {
      const res = await this.s3.send(
        new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      );
      return {
        sizeBytes: res.ContentLength ?? 0,
        contentType: res.ContentType,
      };
    } catch (err) {
      if (
        err instanceof NotFound ||
        (err as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      )
        return null;
      throw storageError(err);
    }
  }

  /** Deletes the given keys (missing ones are fine). */
  async deleteKeys(keys: string[]): Promise<void> {
    try {
      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);
        if (batch.length)
          await this.s3.send(
            new DeleteObjectsCommand({
              Bucket: env.S3_BUCKET,
              Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
            }),
          );
      }
    } catch (cause) {
      throw storageError(cause);
    }
  }

  /** Deletes every object under `prefix` (e.g. "users/<id>/"). Returns how many were deleted. */
  async deletePrefix(prefix: string): Promise<number> {
    if (!prefix.endsWith('/'))
      throw new Error(
        `Refusing to delete a prefix without a trailing slash: ${prefix}`,
      );
    let deleted = 0;
    try {
      let token: string | undefined;
      do {
        const page = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: env.S3_BUCKET,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
        const keys = (page.Contents ?? []).flatMap((o) =>
          o.Key ? [o.Key] : [],
        );
        await this.deleteKeys(keys);
        deleted += keys.length;
        token = page.NextContinuationToken;
      } while (token);
    } catch (cause) {
      throw cause instanceof ExternalServiceError ? cause : storageError(cause);
    }
    return deleted;
  }
}
