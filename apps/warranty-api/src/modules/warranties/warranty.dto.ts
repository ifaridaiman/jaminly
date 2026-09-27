import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  ValidateNested,
} from 'class-validator';
import { AttachmentDto } from '../attachments';
import { isYmd } from './expiry';

export const CATEGORIES = [
  'electronics',
  'appliance',
  'furniture',
  'vehicle',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const TEXT = 200;
const tooLong = { message: `Use ${TEXT} characters or fewer.` };

/** "YYYY-MM-DD" and a real calendar date. Maps to the INVALID_DATE code. */
function IsYmd() {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isYmd',
      target: target.constructor,
      propertyName,
      options: { message: 'Enter a valid date (YYYY-MM-DD).' },
      validator: { validate: isYmd },
    });
}

export class PriceDto {
  /** Major units: 2999 = RM 2,999. */
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter a valid price.' })
  @Min(0, { message: 'Enter a valid price.' })
  @Max(9_999_999_999.99, { message: 'Enter a valid price.' })
  amount!: number;

  /** ISO 4217, e.g. MYR. */
  @Matches(/^[A-Z]{3}$/, { message: 'Use a 3-letter currency code, e.g. MYR.' })
  currency!: string;
}

export class CoverageDto {
  @IsArray()
  @ArrayMaxSize(30, { message: 'Add up to 30 items.' })
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Use 100 characters or fewer.' })
  covered!: string[];

  @IsArray()
  @ArrayMaxSize(30, { message: 'Add up to 30 items.' })
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Use 100 characters or fewer.' })
  notCovered!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Use 2,000 characters or fewer.' })
  notes?: string;
}

/** An uploaded attachment, by id. The other fields are accepted (the app sends back what it got) and ignored. */
export class AttachmentRefDto {
  @IsUUID('all', { message: "This file wasn't found. Upload it again." })
  id!: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() sizeBytes?: number;
  @IsOptional() @IsString() name?: string;
}

/** Same rules as the UI's validate.ts, plus field limits (PRD §5). */
export class CreateWarrantyDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Product name is required.' })
  @MaxLength(TEXT, tooLong)
  productName!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TEXT, tooLong)
  brand?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TEXT, tooLong)
  model?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TEXT, tooLong)
  serialNumber?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TEXT, tooLong)
  store?: string;

  @IsEnum(CATEGORIES, { message: 'Choose a category.' })
  category!: Category;

  @IsYmd()
  purchaseDate!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceDto)
  price?: PriceDto;

  @IsInt({ message: 'Enter a number of months between 1 and 600.' })
  @Min(1, { message: 'Enter a number of months between 1 and 600.' })
  @Max(600, { message: 'Enter a number of months between 1 and 600.' })
  warrantyMonths!: number;

  /** Omit to use purchaseDate + warrantyMonths (month-end clamped). Must not be before purchaseDate. */
  @IsOptional()
  @IsYmd()
  expiryDate?: string;

  @ValidateNested()
  @Type(() => CoverageDto)
  coverage!: CoverageDto;

  /** 1–5 attachment ids from POST /uploads. */
  @IsArray()
  @ArrayMinSize(1, { message: 'Add a proof of purchase to save.' })
  @ArrayMaxSize(5, { message: 'Up to 5 files.' })
  @ArrayUnique((a: AttachmentRefDto) => a?.id, {
    message: 'The same file is attached twice.',
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentRefDto)
  proofOfPurchase!: AttachmentRefDto[];

  /** Days before expiry, 0 = on the day. Omit for the user's defaults; [] turns reminders off. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Choose up to 10 reminders.' })
  @IsInt({ each: true, message: 'Reminders are whole days.' })
  @Min(0, { each: true, message: 'Use 0 to 365 days.' })
  @Max(365, { each: true, message: 'Use 0 to 365 days.' })
  reminderOffsetsDays?: number[];
}

/** PATCH: any subset of the create fields. Missing fields are left unchanged. */
export class UpdateWarrantyDto extends PartialType(CreateWarrantyDto) {}

/** Matches the UI's `Warranty` type. Optional fields are omitted, never null. */
export class WarrantyDto {
  id!: string;
  productName!: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category!: Category;
  store?: string;
  /** YYYY-MM-DD */
  purchaseDate!: string;
  price?: PriceDto;
  warrantyMonths!: number;
  /** YYYY-MM-DD */
  expiryDate!: string;
  coverage!: CoverageDto;
  proofOfPurchase!: AttachmentDto[];
  reminderOffsetsDays!: number[];
  /** ISO 8601, UTC */
  createdAt!: string;
  updatedAt!: string;
}
