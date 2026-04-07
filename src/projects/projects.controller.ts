import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { QueryProjectDto } from './dto/query-project.dto';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const project = await this.projectsService.create(createProjectDto, user);

    return {
      success: true,
      data: project,
      message: 'Create project successfully',
    };
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Projects fetched successfully' })
  async findAll(@Query() query: QueryProjectDto) {
    const projects = await this.projectsService.findAll(query);

    return {
      success: true,
      data: projects,
      message: 'Get projects successfully',
    };
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  @ApiOperation({ summary: 'Get project by id' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Project fetched successfully' })
  async findOne(@Param('id') id: string) {
    const project = await this.projectsService.findOne(id);

    return {
      success: true,
      data: project,
      message: 'Get project successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const project = await this.projectsService.update(
      id,
      updateProjectDto,
      user,
    );

    return {
      success: true,
      data: project,
      message: 'Update project successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  async remove(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.projectsService.remove(id, user);
  }
}
