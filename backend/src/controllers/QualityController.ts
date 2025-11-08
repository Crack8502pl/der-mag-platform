// src/controllers/QualityController.ts
// Kontroler kontroli jakości (zdjęcia)

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { QualityPhoto } from '../entities/QualityPhoto';
import { PhotoService } from '../services/PhotoService';

export class QualityController {
  static async uploadPhoto(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Brak pliku' });
        return;
      }

      const { taskId, activityId, notes } = req.body;
      const userId = req.userId!;

      const processed = await PhotoService.processPhoto(req.file.path, req.file.originalname);

      const photoRepository = AppDataSource.getRepository(QualityPhoto);
      const photo = photoRepository.create({
        taskId: Number(taskId),
        activityId: activityId ? Number(activityId) : undefined,
        filePath: processed.compressedPath,
        thumbnailPath: processed.thumbnailPath,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        width: processed.metadata.width,
        height: processed.metadata.height,
        gpsLatitude: processed.metadata.gpsLatitude,
        gpsLongitude: processed.metadata.gpsLongitude,
        photoDate: processed.metadata.photoDate,
        exifData: processed.metadata.exifData,
        uploadedById: userId,
        notes
      });

      await photoRepository.save(photo);

      res.status(201).json({ success: true, data: photo });
    } catch (error) {
      console.error('Błąd uploadu zdjęcia:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async getTaskPhotos(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const { Task } = await import('../entities/Task');
      
      const task = await AppDataSource.getRepository(Task).findOne({
        where: { taskNumber }
      });

      if (!task) {
        res.status(404).json({ success: false, message: 'Zadanie nie znalezione' });
        return;
      }

      const photoRepository = AppDataSource.getRepository(QualityPhoto);
      const photos = await photoRepository.find({
        where: { taskId: task.id },
        relations: ['uploadedBy', 'approvedBy', 'activity']
      });

      res.json({ success: true, data: photos });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async approvePhoto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      const photoRepository = AppDataSource.getRepository(QualityPhoto);

      const photo = await photoRepository.findOne({ where: { id: Number(id) } });
      if (!photo) {
        res.status(404).json({ success: false, message: 'Zdjęcie nie znalezione' });
        return;
      }

      photo.status = 'approved';
      photo.approvedById = userId;
      photo.approvedAt = new Date();
      await photoRepository.save(photo);

      res.json({ success: true, data: photo });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}
