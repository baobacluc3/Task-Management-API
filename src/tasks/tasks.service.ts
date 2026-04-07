import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Project } from '../projects/entities/project.entity';
import { QueryTaskDto } from './dto/query-task.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { UsersService } from '../users/users.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MAIL_JOBS, MAIL_QUEUE } from '../mail/constants/mail-queue.constants';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly usersService: UsersService,
    @InjectQueue(MAIL_QUEUE)
    private readonly mailQueue: Queue,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(projectId: string, createTaskDto: CreateTaskDto): Promise<Task> {
    await this.ensureProjectExists(projectId);

    const task = this.taskRepository.create({
      ...createTaskDto,
      projectId,
      dueDate: createTaskDto.dueDate
        ? new Date(createTaskDto.dueDate)
        : undefined,
    });

    const createdTask = await this.taskRepository.save(task);

    this.notificationsGateway.notifyTaskCreated(createdTask);

    if (createdTask.assigneeId) {
      await this.enqueueTaskAssignedEmail(createdTask.assigneeId, createdTask.title);
      this.notificationsGateway.notifyTaskAssigned(createdTask);
    }

    return createdTask;
  }

  async findAll(
    projectId: string,
    query: QueryTaskDto,
  ): Promise<PaginatedResult<Task>> {
    await this.ensureProjectExists(projectId);

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      priority,
      assigneeId,
    } = query;

    const sortableFields = new Set(['createdAt', 'updatedAt', 'title', 'dueDate']);
    const orderByField = sortableFields.has(sortBy) ? sortBy : 'createdAt';

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.projectId = :projectId', { projectId });

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    if (assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    }

    queryBuilder
      .orderBy(`task.${orderByField}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(projectId: string, id: string): Promise<Task> {
    await this.ensureProjectExists(projectId);

    const task = await this.taskRepository.findOne({
      where: { id, projectId },
      relations: ['project', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    projectId: string,
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOne(projectId, id);
    const previousAssigneeId = task.assigneeId;

    Object.assign(task, {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : updateTaskDto.dueDate,
    });

    const updatedTask = await this.taskRepository.save(task);

    this.notificationsGateway.notifyTaskUpdated(updatedTask);

    if (updatedTask.assigneeId && updatedTask.assigneeId !== previousAssigneeId) {
      await this.enqueueTaskAssignedEmail(updatedTask.assigneeId, updatedTask.title);
      this.notificationsGateway.notifyTaskAssigned(updatedTask);
    }

    return updatedTask;
  }

  async remove(projectId: string, id: string) {
    const task = await this.findOne(projectId, id);
    await this.taskRepository.remove(task);

    return {
      success: true,
      data: null,
      message: 'Delete task successfully',
    };
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    task.status = status;

    return this.taskRepository.save(task);
  }

  private async enqueueTaskAssignedEmail(
    assigneeId: string,
    taskTitle: string,
  ): Promise<void> {
    const assignee = await this.usersService.findById(assigneeId);

    await this.mailQueue.add(MAIL_JOBS.SEND_TASK_ASSIGNED_EMAIL, {
      email: assignee.email,
      fullName: assignee.fullName,
      taskTitle,
    });
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
