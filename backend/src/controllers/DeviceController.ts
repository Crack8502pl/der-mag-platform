// src/controllers/DeviceController.ts
// Kontroler zarządzania urządzeniami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Device } from '../entities/Device';

export class DeviceController {
  static async registerDevice(req: Request, res: Response): Promise<void> {
    try {
      const deviceRepository = AppDataSource.getRepository(Device);
      const device = deviceRepository.create(req.body);
      await deviceRepository.save(device);

      res.status(201).json({ success: true, data: device });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async getDevice(req: Request, res: Response): Promise<void> {
    try {
      const { serialNumber } = req.params;
      const deviceRepository = AppDataSource.getRepository(Device);
      
      const device = await deviceRepository.findOne({
        where: { serialNumber },
        relations: ['task']
      });

      if (!device) {
        res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
        return;
      }

      res.json({ success: true, data: device });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async verifyDevice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deviceRepository = AppDataSource.getRepository(Device);
      
      const device = await deviceRepository.findOne({ where: { id: Number(id) } });
      if (!device) {
        res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
        return;
      }

      device.status = 'verified';
      device.verificationDate = new Date();
      await deviceRepository.save(device);

      res.json({ success: true, data: device });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}
