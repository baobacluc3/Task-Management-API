import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { buildTaskAssignedEmailTemplate, buildWelcomeEmailTemplate } from './templates/mail.templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 1025),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: this.configService.get<string>('SMTP_USER')
        ? {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  async sendWelcomeEmail(to: string, fullName: string): Promise<void> {
    await this.sendMail(to, 'Welcome to Task Management API', buildWelcomeEmailTemplate(fullName));
  }

  async sendTaskAssignedEmail(
    to: string,
    fullName: string,
    taskTitle: string,
  ): Promise<void> {
    await this.sendMail(
      to,
      'You have been assigned a new task',
      buildTaskAssignedEmailTemplate(fullName, taskTitle),
    );
  }

  private async sendMail(to: string, subject: string, text: string): Promise<void> {
    const from = this.configService.get<string>(
      'SMTP_FROM',
      'no-reply@task-management.local',
    );

    await this.transporter.sendMail({
      from,
      to,
      subject,
      text,
    });

    this.logger.log(`Email sent: ${subject} -> ${to}`);
  }
}
