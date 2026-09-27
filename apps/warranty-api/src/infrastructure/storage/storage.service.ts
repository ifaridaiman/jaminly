import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ExternalServiceError } from '../../common/errors/app-error';
import { env } from '../../env';

/** The private receipts bucket. Presigned PUT/GET and HEAD land with attachments (M2). */
@Injectable()
export class StorageService {
  private readonly s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: !!env.S3_ENDPOINT, // RustFS/MinIO-style endpoints use path-style URLs
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

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
          o.Key ? [{ Key: o.Key }] : [],
        );
        if (keys.length) {
          await this.s3.send(
            new DeleteObjectsCommand({
              Bucket: env.S3_BUCKET,
              Delete: { Objects: keys, Quiet: true },
            }),
          );
          deleted += keys.length;
        }
        token = page.NextContinuationToken;
      } while (token);
    } catch (cause) {
      throw new ExternalServiceError(
        'STORAGE_FAILED',
        'File storage is unavailable.',
        [],
        { cause },
      );
    }
    return deleted;
  }
}
