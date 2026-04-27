// src/controllers/MapController.ts
// Kontroler markerów mapy

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { ServiceTask } from '../entities/ServiceTask';
import { Asset } from '../entities/Asset';

export class MapController {
  static async getMarkers(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const permissions = user?.permissions;
      const isAdmin = permissions?.all === true;
      const canViewAll = isAdmin || permissions?.map?.viewAll === true;
      const userId = user?.id;

      // Query Tasks
      const taskRepo = AppDataSource.getRepository(Task);
      let taskQb = taskRepo.createQueryBuilder('task')
        .where('task.gpsLatitude IS NOT NULL')
        .andWhere('task.gpsLongitude IS NOT NULL')
        .andWhere('task.deletedAt IS NULL');
      if (!canViewAll) {
        taskQb = taskQb.innerJoin('task.assignments', 'ta', 'ta.userId = :userId', { userId });
      }
      const tasks = await taskQb.getMany();

      // Query ServiceTasks
      let serviceTasks: ServiceTask[] = [];
      try {
        const serviceTaskRepo = AppDataSource.getRepository(ServiceTask);
        let stQb = serviceTaskRepo.createQueryBuilder('st')
          .where('st.gpsLatitude IS NOT NULL')
          .andWhere('st.gpsLongitude IS NOT NULL')
          .andWhere('st.deletedAt IS NULL');
        if (!canViewAll) {
          stQb = stQb.innerJoin('brigades', 'b', 'b.id = st.brigadeId')
            .innerJoin('brigade_members', 'bm', 'bm.brigadeId = b.id AND bm.userId = :userId AND bm.active = true', { userId });
        }
        serviceTasks = await stQb.getMany();
      } catch (_err) {
        // ServiceTask GPS columns may not exist yet
        serviceTasks = [];
      }

      // Query Assets (if user has assets.read permission)
      let assets: Asset[] = [];
      const canReadAssets = isAdmin || permissions?.assets?.read === true;
      if (canReadAssets) {
        const assetRepo = AppDataSource.getRepository(Asset);
        assets = await assetRepo.createQueryBuilder('asset')
          .where('asset.gpsLatitude IS NOT NULL')
          .andWhere('asset.gpsLongitude IS NOT NULL')
          .getMany();
      }

      // Map to unified format
      const markers = [
        ...tasks.map(t => ({
          id: t.id,
          markerType: 'task' as const,
          title: t.title,
          number: t.taskNumber,
          status: t.status,
          priority: t.priority,
          isHighPriority: (t.priority || 0) >= 8,
          gpsLatitude: Number(t.gpsLatitude),
          gpsLongitude: Number(t.gpsLongitude),
          location: t.location,
          googleMapsUrl: t.googleMapsUrl,
        })),
        ...serviceTasks.map(st => ({
          id: st.id,
          markerType: 'service_task' as const,
          title: st.title,
          number: st.taskNumber,
          status: st.status,
          priority: st.priority,
          isHighPriority: (st.priority || 0) >= 8,
          gpsLatitude: Number((st as any).gpsLatitude),
          gpsLongitude: Number((st as any).gpsLongitude),
          googleMapsUrl: (st as any).googleMapsUrl,
        })),
        ...assets.map(a => ({
          id: a.id,
          markerType: 'asset' as const,
          title: a.name,
          number: a.assetNumber,
          status: a.status,
          isHighPriority: false,
          gpsLatitude: Number(a.gpsLatitude),
          gpsLongitude: Number(a.gpsLongitude),
          googleMapsUrl: a.googleMapsUrl,
          assetType: a.assetType,
          location: a.miejscowosc,
        })),
      ];

      res.json({ success: true, data: markers });
    } catch (error) {
      console.error('Błąd pobierania markerów mapy:', error);
      res.status(500).json({ success: false, message: 'Błąd pobierania markerów mapy' });
    }
  }
}
