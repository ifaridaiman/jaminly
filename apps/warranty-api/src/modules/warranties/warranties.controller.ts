import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiErrors,
  ApiResult,
} from '../../common/api-response/api-result.decorator';
import { UserId } from '../../common/decorators/user-id.decorator';
import { WarrantiesService } from './warranties.service';
import { WarrantyCode } from './warranty.codes';
import {
  CreateWarrantyDto,
  UpdateWarrantyDto,
  WarrantyDto,
} from './warranty.dto';

@Controller('warranties')
@ApiErrors(401)
export class WarrantiesController {
  constructor(private readonly warranties: WarrantiesService) {}

  @Get()
  @ApiResult({
    summary: "All of the user's warranties, soonest expiry first.",
    code: WarrantyCode.WARRANTIES_FETCHED,
    message: 'Warranties retrieved.',
    type: WarrantyDto,
    isArray: true,
  })
  list(@UserId() userId: string) {
    return this.warranties.list(userId);
  }

  @Get(':id')
  @ApiResult({
    code: WarrantyCode.WARRANTY_FETCHED,
    message: 'Warranty retrieved.',
    type: WarrantyDto,
  })
  @ApiErrors(404)
  get(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.warranties.get(userId, id);
  }

  @Post()
  @ApiResult({
    summary:
      'Creates a warranty from uploaded attachment ids and schedules its reminders.',
    code: WarrantyCode.WARRANTY_CREATED,
    message: 'Warranty saved.',
    type: WarrantyDto,
    status: HttpStatus.CREATED,
  })
  @ApiErrors(409, 422, 502)
  create(@UserId() userId: string, @Body() dto: CreateWarrantyDto) {
    return this.warranties.create(userId, dto);
  }

  @Patch(':id')
  @ApiResult({
    summary:
      'Updates any subset of fields. Removed attachments are deleted; reminders are rescheduled.',
    code: WarrantyCode.WARRANTY_UPDATED,
    message: 'Warranty saved.',
    type: WarrantyDto,
  })
  @ApiErrors(404, 422, 502)
  update(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarrantyDto,
  ) {
    return this.warranties.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiResult({
    summary: 'Deletes the warranty, its files and reminders. Idempotent.',
    code: WarrantyCode.WARRANTY_DELETED,
    message: 'Warranty deleted.',
    status: HttpStatus.NO_CONTENT,
  })
  async remove(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.warranties.remove(userId, id);
  }
}
