import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import type { ApiError } from '../../common/api-response/api-response.types';
import { ConflictError, ValidationError } from '../../common/errors/app-error';
import {
  runWithContext,
  newId,
  DEFAULT_VERSION,
} from '../../common/request-context/request-context';
import { env } from '../../env';
import type { Attachment, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { AttachmentsCode } from './attachments.codes';
import type {
  AttachmentDto,
  CreateUploadDto,
  UploadCreatedDto,
} from './attachments.dto';

const UNLINKED_TTL_MS = 24 * 60 * 60_000;
const baseType = (t = '') => t.split(';')[0].trim().toLowerCase();

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Step 1 of an upload: a row (not yet linked) and a presigned PUT for the device. */
  async createUpload(
    userId: string,
    dto: CreateUploadDto,
  ): Promise<UploadCreatedDto> {
    if (env.USER_STORAGE_LIMIT_MB !== undefined) {
      const used = await this.prisma.attachment.aggregate({
        where: { userId },
        _sum: { sizeBytes: true },
      });
      if (
        (used._sum.sizeBytes ?? 0) + dto.sizeBytes >
        env.USER_STORAGE_LIMIT_MB * 1024 * 1024
      )
        throw new ConflictError(
          AttachmentsCode.STORAGE_LIMIT_REACHED,
          `You've used your ${env.USER_STORAGE_LIMIT_MB} MB of receipt storage. Delete old receipts to add more.`,
        );
    }

    const id = randomUUID();
    const row = await this.prisma.attachment.create({
      data: {
        id,
        userId,
        key: `users/${userId}/${id}`,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        name: dto.name,
      },
    });
    return {
      attachment: await this.toDto(row),
      uploadUrl: await this.storage.presignUpload(
        row.key,
        row.mimeType,
        row.sizeBytes,
      ),
      headers: { 'Content-Type': row.mimeType },
    };
  }

  /**
   * Checks every id before a warranty save: the caller's, not on another warranty, and (if new)
   * actually uploaded with the declared size and type. Throws one 422 listing each bad entry.
   */
  async validateForWarranty(
    userId: string,
    warrantyId: string | null,
    ids: string[],
  ): Promise<void> {
    const rows = await this.prisma.attachment.findMany({
      where: { id: { in: ids }, userId },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const errors: ApiError[] = [];

    await Promise.all(
      ids.map(async (id, i) => {
        const field = `proofOfPurchase[${i}].id`;
        const row = byId.get(id);
        if (!row || (row.warrantyId && row.warrantyId !== warrantyId)) {
          errors.push({
            field,
            code: AttachmentsCode.ATTACHMENT_NOT_FOUND,
            message: "This file wasn't found. Upload it again.",
          });
          return;
        }
        if (row.warrantyId) return; // already on this warranty, checked when it was linked
        const object = await this.storage.head(row.key);
        if (!object)
          errors.push({
            field,
            code: AttachmentsCode.ATTACHMENT_NOT_UPLOADED,
            message: "This file hasn't finished uploading. Try again.",
          });
        else if (
          object.sizeBytes !== row.sizeBytes ||
          baseType(object.contentType) !== baseType(row.mimeType)
        )
          errors.push({
            field,
            code: AttachmentsCode.ATTACHMENT_MISMATCH,
            message:
              "This file doesn't match what was uploaded. Upload it again.",
          });
      }),
    );

    if (errors.length) {
      errors.sort((a, b) =>
        a.field!.localeCompare(b.field!, undefined, { numeric: true }),
      );
      throw new ValidationError(errors[0].code, errors[0].message, errors);
    }
  }

  /** Links the ids to the warranty. Guards the race where another save grabbed one in between. */
  async link(
    tx: Prisma.TransactionClient,
    userId: string,
    warrantyId: string,
    ids: string[],
  ): Promise<void> {
    const { count } = await tx.attachment.updateMany({
      where: {
        id: { in: ids },
        userId,
        OR: [{ warrantyId: null }, { warrantyId }],
      },
      data: { warrantyId },
    });
    if (count !== ids.length)
      throw new ValidationError(
        AttachmentsCode.ATTACHMENT_NOT_FOUND,
        "This file wasn't found. Upload it again.",
      );
  }

  /** Removes the warranty's attachments that aren't in `keepIds`. Returns their keys for deleteFiles(). */
  async unlinkRemoved(
    tx: Prisma.TransactionClient,
    warrantyId: string,
    keepIds: string[],
  ): Promise<string[]> {
    const removed = await tx.attachment.findMany({
      where: { warrantyId, id: { notIn: keepIds } },
      select: { id: true, key: true },
    });
    if (removed.length)
      await tx.attachment.deleteMany({
        where: { id: { in: removed.map((r) => r.id) } },
      });
    return removed.map((r) => r.key);
  }

  /** Keys of a warranty's files, read before deleting it (the DB cascade removes the rows). */
  async keysOf(
    tx: Prisma.TransactionClient,
    warrantyId: string,
  ): Promise<string[]> {
    const rows = await tx.attachment.findMany({
      where: { warrantyId },
      select: { key: true },
    });
    return rows.map((r) => r.key);
  }

  /** After the DB commit. A failure leaves a stray file (cents), never a row pointing at nothing. */
  async deleteFiles(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.storage
      .deleteKeys(keys)
      .catch((err: unknown) =>
        this.logger.error(
          { count: keys.length, err: String(err) },
          'File delete failed; left in bucket',
        ),
      );
  }

  toDto(row: Attachment): Promise<AttachmentDto> {
    return this.storage.presignDownload(row.key).then((url) => ({
      id: row.id,
      url,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      ...(row.name && { name: row.name }),
    }));
  }

  /** Hourly: uploads never attached to a warranty within 24 h (abandoned forms). */
  @Cron(CronExpression.EVERY_HOUR)
  cleanupCron() {
    return runWithContext(
      { requestId: newId('job'), version: DEFAULT_VERSION },
      () =>
        this.cleanupUnlinked().catch((err: unknown) =>
          this.logger.error({ err: String(err) }, 'Attachment cleanup failed'),
        ),
    );
  }

  async cleanupUnlinked(now = new Date()): Promise<number> {
    const stale = await this.prisma.attachment.findMany({
      where: {
        warrantyId: null,
        createdAt: { lt: new Date(now.getTime() - UNLINKED_TTL_MS) },
      },
      select: { id: true, key: true },
      take: 1000,
    });
    if (!stale.length) return 0;
    await this.prisma.attachment.deleteMany({
      where: { id: { in: stale.map((r) => r.id) }, warrantyId: null },
    });
    await this.deleteFiles(stale.map((r) => r.key));
    this.logger.log({ count: stale.length }, 'Removed unlinked uploads');
    return stale.length;
  }
}
