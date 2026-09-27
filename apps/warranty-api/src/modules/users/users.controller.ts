import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiErrors,
  ApiResult,
} from '../../common/api-response/api-result.decorator';
import { UserId } from '../../common/decorators/user-id.decorator';
import { DeletionService } from './deletion.service';
import { UsersCode } from './users.codes';
import { ConfirmDeletionDto, DeletionRequestedDto, UserDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('me')
@ApiErrors(401)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly deletion: DeletionService,
  ) {}

  @Get()
  @ApiResult({
    code: UsersCode.USER_FETCHED,
    message: 'Profile retrieved.',
    type: UserDto,
  })
  async me(@UserId() userId: string) {
    return this.users.toDto(await this.users.getById(userId));
  }

  @Post('deletion')
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiResult({
    summary: 'Emails a one-time code that confirms account deletion.',
    code: UsersCode.DELETION_CODE_SENT,
    message: 'We emailed you a code.',
    type: DeletionRequestedDto,
  })
  @ApiErrors(502)
  requestDeletion(@UserId() userId: string) {
    return this.deletion.request(userId);
  }

  @Delete()
  @ApiResult({
    summary: 'Deletes the account and all its data if the code matches.',
    code: UsersCode.ACCOUNT_DELETED,
    message: 'Account deleted.',
    status: HttpStatus.NO_CONTENT,
  })
  @ApiErrors(422)
  async confirmDeletion(
    @UserId() userId: string,
    @Body() dto: ConfirmDeletionDto,
  ) {
    await this.deletion.confirm(userId, dto.code);
  }
}
