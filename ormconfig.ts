// ormconfig.ts
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const isTsRuntime =
  process.argv.some((arg) => arg.includes('ts-node')) ||
  __filename.endsWith('.ts');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [isTsRuntime ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
  migrations: [
    isTsRuntime ? 'src/migrations/*.ts' : 'dist/migrations/*.js',
  ],
  synchronize: false,
});
