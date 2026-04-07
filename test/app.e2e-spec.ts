import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Client } from 'pg';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { LocalStrategy } from '../src/auth/strategies/local.strategy';
import { JwtRefreshStrategy } from '../src/auth/strategies/jwt-refresh.strategy';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/entities/user.entity';
import { Project } from '../src/projects/entities/project.entity';
import { Task } from '../src/tasks/entities/task.entity';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminClient: Client;
  let isTestDatabaseCreated = false;
  const testDbName = `task_management_e2e_${Date.now()}`;

  const dbHost = process.env.DB_HOST ?? '127.0.0.1';
  const dbPort = parseInt(process.env.DB_PORT ?? '5432', 10);
  const dbUsername = process.env.DB_USERNAME ?? 'postgres';
  const dbPassword = process.env.DB_PASSWORD ?? 'postgres';

  const testUser = {
    email: 'e2e.auth@example.com',
    password: 'Password@123',
    fullName: 'E2E Auth User',
  };

  const createTestDatabase = async () => {
    adminClient = new Client({
      host: dbHost,
      port: dbPort,
      user: dbUsername,
      password: dbPassword,
      database: 'postgres',
    });

    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${testDbName}"`);
    isTestDatabaseCreated = true;
  };

  const dropTestDatabase = async () => {
    await adminClient.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [testDbName],
    );
    await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    await adminClient.end();
  };

  const clearDatabase = async () => {
    await dataSource.query(
      'TRUNCATE TABLE "tasks", "projects", "users" RESTART IDENTITY CASCADE',
    );
  };

  beforeAll(async () => {
    await createTestDatabase();

    process.env.DB_HOST = dbHost;
    process.env.DB_PORT = String(dbPort);
    process.env.DB_USERNAME = dbUsername;
    process.env.DB_PASSWORD = dbPassword;
    process.env.DB_NAME = testDbName;
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_jwt_secret';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET ?? 'test_jwt_refresh_secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: dbHost,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          database: testDbName,
          entities: [User, Project, Task],
          synchronize: true,
          dropSchema: false,
        }),
        TypeOrmModule.forFeature([User]),
        PassportModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET,
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        UsersService,
        JwtStrategy,
        LocalStrategy,
        JwtRefreshStrategy,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (adminClient && isTestDatabaseCreated) {
      await dropTestDatabase();
    }
  });

  it('POST /auth/register', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(testUser.email);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/login', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(testUser.email);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/refresh', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: registerResponse.body.data.refreshToken })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/logout', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${registerResponse.body.data.accessToken}`)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: registerResponse.body.data.refreshToken })
      .expect(401);
  });
});
