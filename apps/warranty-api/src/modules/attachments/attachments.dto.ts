import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class CreateUploadDto {
  /** image/jpeg, image/png, image/heic, image/heif or application/pdf. */
  @IsIn(ALLOWED_TYPES, { message: 'Use JPG, PNG, HEIC or PDF files.' })
  mimeType!: string;

  /** Exact file size in bytes, at most 10 MB. The upload URL only accepts this size. */
  @IsInt({ message: 'Each file must be 10 MB or smaller.' })
  @Min(1, { message: 'This file is empty.' })
  @Max(MAX_FILE_BYTES, { message: 'Each file must be 10 MB or smaller.' })
  sizeBytes!: number;

  /** Original file name, shown in the app. */
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Use 200 characters or fewer.' })
  name?: string;
}

/** Matches the UI's `Attachment` type. `url` is a presigned GET, valid for 1 hour. */
export class AttachmentDto {
  id!: string;
  url!: string;
  mimeType!: string;
  sizeBytes!: number;
  name?: string;
}

export class UploadCreatedDto {
  attachment!: AttachmentDto;
  /** PUT the file bytes here within 10 minutes, with exactly these headers. */
  uploadUrl!: string;
  headers!: Record<string, string>;
}
