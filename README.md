# Task Management API

![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-43853D?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Queue-DC382D?logo=redis)
![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

RESTful API cho hệ thống quản lý công việc theo project, xây dựng bằng NestJS. Dự án hỗ trợ xác thực JWT + refresh token, phân quyền role, quản lý tasks/projects, upload avatar Cloudinary, cache Redis, queue xử lý email với Bull và tài liệu API bằng Swagger.

## Tech stack

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL + TypeORM
- **Auth:** Passport (Local/JWT), JWT access/refresh token
- **Cache/Queue:** Redis, `@nestjs/cache-manager`, Bull
- **File storage:** Cloudinary
- **Mail:** Nodemailer
- **Realtime:** Socket.IO Gateway
- **Documentation:** Swagger (`@nestjs/swagger`)

## Kiến trúc tổng quan

Ứng dụng được tổ chức theo module của NestJS:

- `AuthModule`: đăng ký/đăng nhập/refresh/logout/profile
- `UsersModule`: quản lý người dùng, upload avatar
- `ProjectsModule`: CRUD project
- `TasksModule`: CRUD task theo project + cập nhật trạng thái
- `NotificationsModule`: websocket notifications
- `MailModule`: queue và gửi email
- `CloudinaryModule`: upload/xóa file ảnh

Luồng chính:

1. Client gọi API qua prefix `api/v1`
2. `JwtAuthGuard` + `RolesGuard` bảo vệ các endpoint cần xác thực
3. Service xử lý business logic + TypeORM thao tác PostgreSQL
4. Redis dùng cho cache và hàng đợi background job
5. Swagger được expose tại `/api/docs`

## Chạy local

### 1) Cài dependencies

```bash
npm install
```

### 2) Cấu hình biến môi trường

Tạo file `.env` (hoặc cập nhật file có sẵn) theo mẫu ở mục **Environment variables**.

### 3) Chuẩn bị hạ tầng local

- PostgreSQL
- Redis
- (Tuỳ chọn) SMTP server local như MailHog/Mailpit

### 4) Chạy ứng dụng

```bash
# development
npm run start:dev

# production build + run
npm run build
npm run start:prod
```

API base URL mặc định: `http://localhost:3000/api/v1`

## Environment variables

| Variable | Required | Default | Mô tả |
|---|---:|---|---|
| `DB_HOST` | ✅ | - | PostgreSQL host |
| `DB_PORT` | ❌ | `5432` | PostgreSQL port |
| `DB_USERNAME` | ✅ | - | PostgreSQL username |
| `DB_PASSWORD` | ✅ | - | PostgreSQL password |
| `DB_NAME` | ✅ | - | PostgreSQL database name |
| `JWT_SECRET` | ❌ | `secret` | Secret ký access token |
| `JWT_REFRESH_SECRET` | ❌ | `refresh_secret` | Secret ký refresh token |
| `REDIS_HOST` | ❌ | `localhost` | Redis host |
| `REDIS_PORT` | ❌ | `6379` | Redis port |
| `SMTP_HOST` | ❌ | `localhost` | SMTP host |
| `SMTP_PORT` | ❌ | `1025` | SMTP port |
| `SMTP_SECURE` | ❌ | `false` | Bật/tắt TLS SMTP |
| `SMTP_USER` | ❌ | empty | SMTP username |
| `SMTP_PASS` | ❌ | empty | SMTP password |
| `SMTP_FROM` | ❌ | `no-reply@task-management.local` | Email người gửi mặc định |
| `CLOUDINARY_CLOUD_NAME` | ✅ (nếu upload ảnh) | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ (nếu upload ảnh) | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ (nếu upload ảnh) | - | Cloudinary API secret |
| `CORS_WHITELIST` | ❌ | `http://localhost:3000` | Danh sách origin cho CORS, ngăn cách bằng dấu phẩy |

## API docs link

- Local Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Deploy link

- Production API: `https://your-domain.example.com/api/v1`
- Production Swagger: `https://your-domain.example.com/api/docs`

> Cập nhật các URL deploy ở trên theo môi trường thực tế của bạn.
