import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'task-management/users/avatar',
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('File upload failed'));
            return;
          }
          resolve(result);
        },
      );

      stream.end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }

  extractPublicIdFromUrl(url: string): string | null {
    const marker = '/upload/';
    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const filePath = url.slice(markerIndex + marker.length).split('/');

    if (filePath.length === 0) {
      return null;
    }

    if (filePath[0]?.startsWith('v')) {
      filePath.shift();
    }

    const joinedPath = filePath.join('/');
    return joinedPath.replace(/\.[^/.]+$/, '');
  }
}
