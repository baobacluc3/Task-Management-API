// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@GetUser() user: any) {
    return this.authService.refreshTokens(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@GetUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  getProfile(@GetUser() user: any) {
    return {
      success: true,
      data: user,
      message: 'Get profile successfully',
    };
  }
}