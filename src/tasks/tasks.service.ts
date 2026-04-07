import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
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

    return this.taskRepository.save(task);
  }

  async findAll(projectId: string): Promise<Task[]> {
    await this.ensureProjectExists(projectId);

    return this.taskRepository.find({
      where: { projectId },
      relations: ['project', 'assignee'],
      order: { createdAt: 'DESC' },
    });
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

    Object.assign(task, {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : updateTaskDto.dueDate,
    });

    return this.taskRepository.save(task);
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

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
