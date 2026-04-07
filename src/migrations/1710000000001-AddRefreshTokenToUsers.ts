// src/migrations/1710000000001-AddRefreshTokenToUsers.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenToUsers1710000000001 implements MigrationInterface {
  name = 'AddRefreshTokenToUsers1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "refreshToken" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "refreshToken"
    `);
  }
}