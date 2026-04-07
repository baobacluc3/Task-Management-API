import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create task in a project' })
  @ApiParam({ name: 'projectId', type: String, format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(projectId, createTaskDto);

    return {
      success: true,
      data: task,
      message: 'Create task successfully',
    };
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Get all tasks in a project' })
  @ApiParam({ name: 'projectId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tasks fetched successfully' })
  async findAll(@Param('projectId') projectId: string) {
    const tasks = await this.tasksService.findAll(projectId);

    return {
      success: true,
      data: tasks,
      message: 'Get tasks successfully',
    };
  }

  @Get('projects/:projectId/tasks/:id')
  @ApiOperation({ summary: 'Get a task by id in a project' })
  @ApiParam({ name: 'projectId', type: String, format: 'uuid' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task fetched successfully' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.findOne(projectId, id);

    return {
      success: true,
      data: task,
      message: 'Get task successfully',
    };
  }

  @Patch('projects/:projectId/tasks/:id')
  @ApiOperation({ summary: 'Update a task in a project' })
  @ApiParam({ name: 'projectId', type: String, format: 'uuid' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(projectId, id, updateTaskDto);

    return {
      success: true,
      data: task,
      message: 'Update task successfully',
    };
  }

  @Delete('projects/:projectId/tasks/:id')
  @ApiOperation({ summary: 'Delete a task in a project' })
  @ApiParam({ name: 'projectId', type: String, format: 'uuid' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.tasksService.remove(projectId, id);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status only' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
  ) {
    const task = await this.tasksService.updateStatus(
      id,
      updateTaskStatusDto.status,
    );

    return {
      success: true,
      data: task,
      message: 'Update task status successfully',
    };
  }
}
