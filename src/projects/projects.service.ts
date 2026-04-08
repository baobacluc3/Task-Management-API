import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { QueryProjectDto } from './dto/query-project.dto';
import type { Cache } from 'cache-manager';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      ownerId: user.id,
    });

    const createdProject = await this.projectRepository.save(project);

    await this.invalidateProjectCache();

    return createdProject;
  }

  async findAll(query: QueryProjectDto): Promise<PaginatedResult<Project>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
    } = query;

    const sortableFields = new Set(['createdAt', 'updatedAt', 'title']);
    const orderByField = sortableFields.has(sortBy) ? sortBy : 'createdAt';

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner');

    if (status) {
      queryBuilder.where('project.status = :status', { status });
    }

    queryBuilder
      .orderBy(`project.${orderByField}`, sortOrder)
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

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, user: User) {
    const project = await this.findOne(id);
    this.ensureCanManageProject(project, user);

    Object.assign(project, updateProjectDto);

    const createdProject = await this.projectRepository.save(project);

    await this.invalidateProjectCache();

    return createdProject;
  }

  async remove(id: string, user: User) {
    const project = await this.findOne(id);
    this.ensureCanManageProject(project, user);

    await this.projectRepository.remove(project);
    await this.invalidateProjectCache();

    return {
      success: true,
      data: null,
      message: 'Delete project successfully',
    };
  }

  private async invalidateProjectCache(): Promise<void> {
    await this.cacheManager.reset();
  }

  private ensureCanManageProject(project: Project, user: User): void {
    if (project.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only project owner or admin can perform this action',
      );
    }
  }
}
