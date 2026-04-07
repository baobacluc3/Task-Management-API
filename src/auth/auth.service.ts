// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { RefreshAuthenticatedUser } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private sanitizeUser(user: User): Omit<User, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'secret',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      expiresIn: '7d',
    });

    const hashedRefresh = await this.hashPassword(refreshToken);

    await this.usersService.update(user.id, {
      refreshToken: hashedRefresh,
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already exists');

    const hashed = await this.hashPassword(dto.password);

    const user = await this.usersService.create({
      ...dto,
      password: hashed,
    });

    const tokens = await this.generateTokens(user);

    return {
      success: true,
      data: { user: this.sanitizeUser(user), ...tokens },
      message: 'Register successfully',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await this.comparePassword(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user);

    return {
      success: true,
      data: { user: this.sanitizeUser(user), ...tokens },
      message: 'Login successfully',
    };
  }

  async refreshTokens(user: RefreshAuthenticatedUser) {
    const dbUser = await this.usersService.findById(user.id);

    const isMatch = await this.comparePassword(
      user.refreshToken,
      dbUser.refreshToken ?? '',
    );

    if (!isMatch) throw new UnauthorizedException();

    const tokens = await this.generateTokens(dbUser);

    return {
      success: true,
      data: tokens,
      message: 'Refresh token successfully',
    };
  }

  async logout(userId: string) {
    await this.usersService.update(userId, { refreshToken: null });

    return {
      success: true,
      data: null,
      message: 'Logout successfully',
    };
  }
}
