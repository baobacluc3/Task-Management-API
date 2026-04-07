import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIMES = ['image/jpeg', 'image/png'];

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();

    return {
      success: true,
      data: users,
      message: 'Get users successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_AVATAR_MIMES.includes(file.mimetype)) {
          cb(new BadRequestException('Only JPG/PNG files are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @GetUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const currentUser = await this.usersService.findById(userId);
    if (currentUser.avatarUrl) {
      const publicId = this.cloudinaryService.extractPublicIdFromUrl(
        currentUser.avatarUrl,
      );
      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    const uploadedFile = await this.cloudinaryService.uploadFile(file);
    const user = await this.usersService.updateAvatar(userId, uploadedFile.secure_url);

    return {
      success: true,
      data: { avatarUrl: user.avatarUrl },
      message: 'Upload avatar successfully',
    };
  }
}
