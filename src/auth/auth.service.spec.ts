jest.mock('@nestjs/bull', () => ({
  InjectQueue: () => () => undefined,
}), { virtual: true });
jest.mock('bull', () => ({}), { virtual: true });


import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { MAIL_JOBS } from '../mail/constants/mail-queue.constants';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;

  const usersServiceMock = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;

  const jwtServiceMock = {
    sign: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const mailQueueMock = {
    add: jest.fn(),
  };

  const baseUser: User = {
    id: 'user-id-1',
    email: 'john@example.com',
    password: 'hashed-password',
    fullName: 'John Doe',
    role: UserRole.USER,
    isActive: true,
    refreshToken: 'hashed-refresh-token',
    avatarUrl: null,
    projects: [],
    assignedTasks: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(usersServiceMock, jwtServiceMock, mailQueueMock as any);
  });

  describe('register', () => {
    it('should register successfully', async () => {
      usersServiceMock.findByEmail.mockResolvedValueOnce(null as any);
      const createdUser = { ...baseUser };
      usersServiceMock.create.mockResolvedValueOnce(createdUser);

      jest.spyOn(authService, 'hashPassword').mockResolvedValueOnce('hashed-new-password');
      jest.spyOn(authService, 'generateTokens').mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.register({
        email: 'john@example.com',
        password: '123456',
        fullName: 'John Doe',
      });

      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(usersServiceMock.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'hashed-new-password',
        fullName: 'John Doe',
      });
      expect(mailQueueMock.add).toHaveBeenCalledWith(MAIL_JOBS.SEND_WELCOME_EMAIL, {
        email: createdUser.email,
        fullName: createdUser.fullName,
      });
      expect(result).toEqual({
        success: true,
        data: {
          user: expect.objectContaining({
            id: createdUser.id,
            email: createdUser.email,
            fullName: createdUser.fullName,
          }),
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
        message: 'Register successfully',
      });
      expect((result.data.user as Partial<User>).password).toBeUndefined();
    });

    it('should throw BadRequestException when email already exists', async () => {
      usersServiceMock.findByEmail.mockResolvedValueOnce(baseUser);

      await expect(
        authService.register({
          email: baseUser.email,
          password: '123456',
          fullName: baseUser.fullName,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(usersServiceMock.create).not.toHaveBeenCalled();
      expect(mailQueueMock.add).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      usersServiceMock.findByEmail.mockResolvedValueOnce(baseUser);
      jest.spyOn(authService, 'comparePassword').mockResolvedValueOnce(true);
      jest.spyOn(authService, 'generateTokens').mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.login({
        email: baseUser.email,
        password: 'correct-password',
      });

      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(baseUser.email);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successfully');
      expect((result.data.user as Partial<User>).password).toBeUndefined();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      usersServiceMock.findByEmail.mockResolvedValueOnce(baseUser);
      jest.spyOn(authService, 'comparePassword').mockResolvedValueOnce(false);

      await expect(
        authService.login({
          email: baseUser.email,
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      usersServiceMock.findByEmail.mockResolvedValueOnce(null as any);

      await expect(
        authService.login({
          email: 'missing@example.com',
          password: 'any-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully when refresh token is valid', async () => {
      usersServiceMock.findById.mockResolvedValueOnce(baseUser);
      jest.spyOn(authService, 'comparePassword').mockResolvedValueOnce(true);
      jest.spyOn(authService, 'generateTokens').mockResolvedValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await authService.refreshTokens({
        id: baseUser.id,
        email: baseUser.email,
        refreshToken: 'valid-refresh-token',
      });

      expect(usersServiceMock.findById).toHaveBeenCalledWith(baseUser.id);
      expect(result).toEqual({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
        message: 'Refresh token successfully',
      });
    });

    it('should throw UnauthorizedException when refresh token is expired/invalid', async () => {
      usersServiceMock.findById.mockResolvedValueOnce(baseUser);
      jest.spyOn(authService, 'comparePassword').mockResolvedValueOnce(false);

      await expect(
        authService.refreshTokens({
          id: baseUser.id,
          email: baseUser.email,
          refreshToken: 'expired-refresh-token',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

    });
  });
  describe('generateTokens', () => {
    it('should generate access/refresh token and persist hashed refresh token', async () => {
      jwtServiceMock.sign
        .mockReturnValueOnce('access-token-value')
        .mockReturnValueOnce('refresh-token-value');
      jest.spyOn(authService, 'hashPassword').mockResolvedValueOnce('hashed-refresh-token');
      usersServiceMock.update.mockResolvedValueOnce(baseUser as any);

      const tokens = await authService.generateTokens(baseUser);

      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);
      expect(usersServiceMock.update).toHaveBeenCalledWith(baseUser.id, {
        refreshToken: 'hashed-refresh-token',
      });
      expect(tokens).toEqual({
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
      });
    });
  });

  describe('logout', () => {
    it('should clear refresh token successfully', async () => {
      usersServiceMock.update.mockResolvedValueOnce(baseUser as any);

      const result = await authService.logout(baseUser.id);

      expect(usersServiceMock.update).toHaveBeenCalledWith(baseUser.id, {
        refreshToken: null,
      });
      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Logout successfully',
      });
    });
  });

});
