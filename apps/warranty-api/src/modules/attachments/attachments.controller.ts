import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import {
  ApiErrors,
  ApiResult,
} from '../../common/api-response/api-result.decorator';
import { UserId } from '../../common/decorators/user-id.decorator';
import { AttachmentsCode } from './attachments.codes';
import { CreateUploadDto, UploadCreatedDto } from './attachments.dto';
import { AttachmentsService } from './attachments.service';

@Controller('uploads')
@ApiErrors(401)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  @ApiResult({
    summary:
      'Starts a receipt upload. PUT the bytes to uploadUrl with the given headers, then send attachment.id in the warranty.',
    code: AttachmentsCode.UPLOAD_CREATED,
    message: 'Upload ready.',
    type: UploadCreatedDto,
    status: HttpStatus.CREATED,
  })
  @ApiErrors(409, 422, 502)
  create(@UserId() userId: string, @Body() dto: CreateUploadDto) {
    return this.attachments.createUpload(userId, dto);
  }
}
