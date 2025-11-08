// src/services/PhotoService.ts
// Serwis przetwarzania zdjęć

import sharp from 'sharp';
import exifr from 'exifr';
import fs from 'fs/promises';
import path from 'path';
import { VALIDATION_LIMITS } from '../config/constants';

export interface PhotoMetadata {
  width: number;
  height: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  photoDate?: Date;
  exifData: Record<string, any>;
}

export class PhotoService {
  private static uploadDir = process.env.UPLOAD_DIR || './uploads';
  private static photosDir = path.join(this.uploadDir, 'photos');
  private static thumbnailsDir = path.join(this.uploadDir, 'thumbnails');

  /**
   * Przetwarza przesłane zdjęcie (kompresja, miniaturka, EXIF)
   */
  static async processPhoto(
    filePath: string,
    originalName: string
  ): Promise<{
    compressedPath: string;
    thumbnailPath: string;
    metadata: PhotoMetadata;
  }> {
    // Odczytaj metadane EXIF
    const metadata = await this.extractMetadata(filePath);

    // Kompresuj zdjęcie
    const compressedPath = await this.compressImage(filePath);

    // Utwórz miniaturkę
    const thumbnailPath = await this.createThumbnail(filePath, originalName);

    return {
      compressedPath,
      thumbnailPath,
      metadata
    };
  }

  /**
   * Kompresuje obraz do maksymalnych wymiarów
   */
  private static async compressImage(filePath: string): Promise<string> {
    const { MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, IMAGE_QUALITY } = VALIDATION_LIMITS;
    
    const outputPath = filePath.replace(/(\.[^.]+)$/, '_compressed$1');

    await sharp(filePath)
      .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: IMAGE_QUALITY })
      .toFile(outputPath);

    // Usuń oryginalny plik
    await fs.unlink(filePath);

    return outputPath;
  }

  /**
   * Tworzy miniaturkę zdjęcia
   */
  private static async createThumbnail(filePath: string, originalName: string): Promise<string> {
    const { THUMBNAIL_SIZE } = VALIDATION_LIMITS;
    const thumbnailName = `thumb_${Date.now()}_${originalName}`;
    const thumbnailPath = path.join(this.thumbnailsDir, thumbnailName);

    await sharp(filePath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  /**
   * Ekstrahuje metadane EXIF ze zdjęcia
   */
  private static async extractMetadata(filePath: string): Promise<PhotoMetadata> {
    const image = sharp(filePath);
    const imageMetadata = await image.metadata();

    let exifData: any = {};
    let gpsLatitude: number | undefined;
    let gpsLongitude: number | undefined;
    let photoDate: Date | undefined;

    try {
      exifData = await exifr.parse(filePath) || {};

      // Wyciągnij współrzędne GPS
      if (exifData.latitude && exifData.longitude) {
        gpsLatitude = exifData.latitude;
        gpsLongitude = exifData.longitude;
      }

      // Wyciągnij datę wykonania zdjęcia
      if (exifData.DateTimeOriginal) {
        photoDate = new Date(exifData.DateTimeOriginal);
      }
    } catch (error) {
      console.warn('Nie udało się odczytać danych EXIF:', error);
    }

    return {
      width: imageMetadata.width || 0,
      height: imageMetadata.height || 0,
      gpsLatitude,
      gpsLongitude,
      photoDate,
      exifData
    };
  }

  /**
   * Usuwa zdjęcie i jego miniaturkę
   */
  static async deletePhoto(photoPath: string, thumbnailPath?: string): Promise<void> {
    try {
      await fs.unlink(photoPath);
      
      if (thumbnailPath) {
        await fs.unlink(thumbnailPath);
      }
    } catch (error) {
      console.error('Błąd podczas usuwania zdjęcia:', error);
    }
  }
}
