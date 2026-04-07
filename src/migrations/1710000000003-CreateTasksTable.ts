import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTasksTable1710000000003 implements MigrationInterface {
  name = 'CreateTasksTable1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tasks_status_enum" AS ENUM('TODO', 'IN_PROGRESS', 'DONE')
    `);

    await queryRunner.query(`
      CREATE TYPE "tasks_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH')
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "status" "tasks_status_enum" NOT NULL DEFAULT 'TODO',
        "priority" "tasks_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "dueDate" TIMESTAMP,
        "projectId" uuid NOT NULL,
        "assigneeId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasks_projectId_projects_id" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tasks_assigneeId_users_id" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "tasks_status_enum"`);
  }
}
