import { Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/app-error';
import { env } from '../../env';
import type { Attachment, Warranty } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AttachmentsService } from '../attachments';
import { RemindersService } from '../notifications';
import { UsersService } from '../users';
import { addMonths, ymdToDate } from './expiry';
import { toWarrantyDto } from './to-response';
import { WarrantyCode } from './warranty.codes';
import type {
  CreateWarrantyDto,
  UpdateWarrantyDto,
  WarrantyDto,
} from './warranty.dto';

const notFound = () =>
  new NotFoundError(WarrantyCode.WARRANTY_NOT_FOUND, 'Warranty not found.');
const withFiles = { attachments: { orderBy: { createdAt: 'asc' } } } as const;
type Row = Warranty & { attachments: Attachment[] };

/** Every query carries `userId`: another user's id behaves exactly like a missing one (404). */
@Injectable()
export class WarrantiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentsService,
    private readonly reminders: RemindersService,
    private readonly users: UsersService,
  ) {}

  async list(userId: string): Promise<WarrantyDto[]> {
    const rows = await this.prisma.warranty.findMany({
      where: { userId },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      include: withFiles,
    });
    return Promise.all(rows.map((r) => this.toDto(r)));
  }

  async get(userId: string, id: string): Promise<WarrantyDto> {
    const row = await this.prisma.warranty.findFirst({
      where: { id, userId },
      include: withFiles,
    });
    if (!row) throw notFound();
    return this.toDto(row);
  }

  async create(userId: string, dto: CreateWarrantyDto): Promise<WarrantyDto> {
    if (env.USER_WARRANTY_LIMIT !== undefined) {
      const count = await this.prisma.warranty.count({ where: { userId } });
      if (count >= env.USER_WARRANTY_LIMIT)
        throw new ConflictError(
          WarrantyCode.WARRANTY_LIMIT_REACHED,
          `You've reached the limit of ${env.USER_WARRANTY_LIMIT} warranties. Delete old ones to add more.`,
        );
    }
    const user = await this.users.getById(userId);
    const ids = dto.proofOfPurchase.map((a) => a.id);
    await this.attachments.validateForWarranty(userId, null, ids);

    const expiryDate =
      dto.expiryDate ?? addMonths(dto.purchaseDate, dto.warrantyMonths);
    assertExpiryAfterPurchase(dto.purchaseDate, expiryDate);

    const row = await this.prisma.$transaction(async (tx) => {
      const w = await tx.warranty.create({
        data: {
          userId,
          ...fields(dto),
          purchaseDate: ymdToDate(dto.purchaseDate),
          expiryDate: ymdToDate(expiryDate),
          warrantyMonths: dto.warrantyMonths,
          category: dto.category,
          productName: dto.productName,
          covered: dto.coverage.covered,
          notCovered: dto.coverage.notCovered,
          reminderOffsetsDays: dedupe(
            dto.reminderOffsetsDays ?? user.defaultReminders,
          ),
        },
      });
      await this.attachments.link(tx, userId, w.id, ids);
      await this.reminders.plan(tx, w, user.timezone);
      return tx.warranty.findUniqueOrThrow({
        where: { id: w.id },
        include: withFiles,
      });
    });
    return this.toDto(row);
  }

  /** Partial update. Changing purchase date or length without an explicit expiry recomputes it. */
  async update(
    userId: string,
    id: string,
    dto: UpdateWarrantyDto,
  ): Promise<WarrantyDto> {
    const existing = await this.prisma.warranty.findFirst({
      where: { id, userId },
    });
    if (!existing) throw notFound();
    const user = await this.users.getById(userId);

    const ids = dto.proofOfPurchase?.map((a) => a.id);
    if (ids) await this.attachments.validateForWarranty(userId, id, ids);

    const purchaseDate =
      dto.purchaseDate ?? existing.purchaseDate.toISOString().slice(0, 10);
    const months = dto.warrantyMonths ?? existing.warrantyMonths;
    const expiryDate =
      dto.expiryDate ??
      (dto.purchaseDate || dto.warrantyMonths
        ? addMonths(purchaseDate, months)
        : existing.expiryDate.toISOString().slice(0, 10));
    assertExpiryAfterPurchase(purchaseDate, expiryDate);

    let removedKeys: string[] = [];
    const row = await this.prisma.$transaction(async (tx) => {
      const w = await tx.warranty.update({
        where: { id },
        data: {
          ...fields(dto),
          ...(dto.productName !== undefined && {
            productName: dto.productName,
          }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.coverage && {
            covered: dto.coverage.covered,
            notCovered: dto.coverage.notCovered,
          }),
          ...(dto.reminderOffsetsDays && {
            reminderOffsetsDays: dedupe(dto.reminderOffsetsDays),
          }),
          purchaseDate: ymdToDate(purchaseDate),
          warrantyMonths: months,
          expiryDate: ymdToDate(expiryDate),
        },
      });
      if (ids) {
        removedKeys = await this.attachments.unlinkRemoved(tx, id, ids);
        await this.attachments.link(tx, userId, id, ids);
      }
      await this.reminders.plan(tx, w, user.timezone);
      return tx.warranty.findUniqueOrThrow({
        where: { id },
        include: withFiles,
      });
    });
    await this.attachments.deleteFiles(removedKeys);
    return this.toDto(row);
  }

  /** Idempotent: an unknown (or someone else's) id is a silent no-op. */
  async remove(userId: string, id: string): Promise<void> {
    const keys = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.warranty.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!owned) return [];
      const k = await this.attachments.keysOf(tx, id);
      await tx.warranty.delete({ where: { id } }); // cascades attachments + reminders
      return k;
    });
    await this.attachments.deleteFiles(keys);
  }

  private async toDto(row: Row): Promise<WarrantyDto> {
    return toWarrantyDto(
      row,
      await Promise.all(row.attachments.map((a) => this.attachments.toDto(a))),
    );
  }
}

function assertExpiryAfterPurchase(purchase: string, expiry: string) {
  if (expiry < purchase)
    throw new BusinessRuleError(
      WarrantyCode.EXPIRY_BEFORE_PURCHASE,
      'The expiry date is before the purchase date.',
      [
        {
          field: 'expiryDate',
          code: WarrantyCode.EXPIRY_BEFORE_PURCHASE,
          message: 'Must be on or after the purchase date.',
        },
      ],
    );
}

const dedupe = (days: number[]) => [...new Set(days)].sort((a, b) => b - a);

/** Optional columns shared by create and update. `undefined` = leave alone; empty string = clear. */
type OptionalColumns = {
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  store?: string | null;
  priceAmount?: number;
  priceCurrency?: string;
  coverageNotes?: string | null;
};

function fields(dto: UpdateWarrantyDto): OptionalColumns {
  const opt = (v: string | undefined) =>
    v === undefined ? undefined : v || null;
  return {
    brand: opt(dto.brand),
    model: opt(dto.model),
    serialNumber: opt(dto.serialNumber),
    store: opt(dto.store),
    ...(dto.price !== undefined && {
      priceAmount: dto.price.amount,
      priceCurrency: dto.price.currency,
    }),
    ...(dto.coverage && { coverageNotes: dto.coverage.notes || null }),
  };
}
