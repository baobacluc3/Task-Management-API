import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarUrlToUsers1710000000004 implements MigrationInterface {
  name = 'AddAvatarUrlToUsers1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "avatarUrl" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "avatarUrl"
    `);
  }
}
