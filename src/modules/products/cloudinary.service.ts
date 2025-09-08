import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'ecommerce/products',
  ): Promise<string> {
    try {
      // Check if file buffer exists
      if (!file || !file.buffer) {
        throw new Error('No file buffer available. Please ensure file is uploaded correctly.');
      }

      // Check if buffer has content
      if (file.buffer.length === 0) {
        throw new Error('File buffer is empty. Please ensure file is not corrupted.');
      }

      console.log(`Uploading image: ${file.originalname}, size: ${file.buffer.length} bytes, mimetype: ${file.mimetype}`);

      const result = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        {
          resource_type: 'auto',
          folder: folder,
          format: 'webp', // Convert to WebP for better compression
          quality: 'auto',
          fetch_format: 'auto',
        },
      );

      console.log(`Image uploaded successfully: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'ecommerce/products',
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map((file) =>
        this.uploadImage(file, folder),
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(`Failed to upload images: ${error.message}`);
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from URL
      const publicId = this.extractPublicId(imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      // Don't throw error as this is cleanup operation
    }
  }

  async deleteMultipleImages(imageUrls: string[]): Promise<void> {
    try {
      const deletePromises = imageUrls.map((url) => this.deleteImage(url));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Failed to delete images:', error);
    }
  }

  private extractPublicId(imageUrl: string): string | null {
    try {
      // Extract public_id from Cloudinary URL
      const regex = /\/v\d+\/(.+)\.\w+$/;
      const match = imageUrl.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}
