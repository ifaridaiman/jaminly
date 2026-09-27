import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { ExternalServiceError } from '../../common/errors/app-error';
import { env } from '../../env';

export type Mail = { to: string; subject: string; text: string; html?: string };

@Injectable()
export class MailService {
  private readonly transport = createTransport(env.SMTP_URL);

  async send(mail: Mail): Promise<void> {
    try {
      await this.transport.sendMail({ from: env.MAIL_FROM, ...mail });
    } catch (cause) {
      throw new ExternalServiceError(
        'MAIL_SEND_FAILED',
        'Email could not be sent.',
        [],
        { cause },
      );
    }
  }
}
