import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailService } from './mail.service';
import { MAIL_JOBS, MAIL_QUEUE } from './constants/mail-queue.constants';

type WelcomeEmailPayload = {
  email: string;
  fullName: string;
};

type TaskAssignedEmailPayload = {
  email: string;
  fullName: string;
  taskTitle: string;
};

@Processor(MAIL_QUEUE)
export class MailProcessor {
  constructor(private readonly mailService: MailService) {}

  @Process(MAIL_JOBS.SEND_WELCOME_EMAIL)
  async handleWelcomeEmail(job: Job<WelcomeEmailPayload>): Promise<void> {
    await this.mailService.sendWelcomeEmail(job.data.email, job.data.fullName);
  }

  @Process(MAIL_JOBS.SEND_TASK_ASSIGNED_EMAIL)
  async handleTaskAssignedEmail(job: Job<TaskAssignedEmailPayload>): Promise<void> {
    await this.mailService.sendTaskAssignedEmail(
      job.data.email,
      job.data.fullName,
      job.data.taskTitle,
    );
  }
}
