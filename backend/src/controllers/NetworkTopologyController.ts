// src/controllers/NetworkTopologyController.ts
// Controller for Network Topology CRUD endpoints

import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import networkTopologyService from '../services/networkTopology.service';
import {
  CreateNetworkTopologyDto,
  UpdateNetworkTopologyDto,
} from '../dto/network-topology.dto';

const A3_LANDSCAPE_PAGE: [number, number] = [1190.55, 841.89];

interface TopologyPdfExportRequest {
  imageDataUrl?: string;
  title?: string;
  fileName?: string;
}

const sanitizeDownloadFileName = (fileName: string): string => {
  const baseName = path.posix.basename(path.win32.basename(fileName));
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/\.\.+/g, '_')
    .replace(/^_+/, '');
  const withFallback = sanitized || 'topologia.pdf';
  return withFallback.toLowerCase().endsWith('.pdf') ? withFallback : `${withFallback}.pdf`;
};

export class NetworkTopologyController {
  private buildTopologyPdf = async ({
    imageDataUrl,
    title,
  }: TopologyPdfExportRequest): Promise<Uint8Array> => {
    if (!imageDataUrl?.startsWith('data:image/png;base64,')) {
      throw new Error('INVALID_IMAGE_DATA');
    }

    const imageBytes = Buffer.from(imageDataUrl.split(',')[1], 'base64');
    const pdfDocument = await PDFDocument.create();
    const page = pdfDocument.addPage(A3_LANDSCAPE_PAGE);
    const pngImage = await pdfDocument.embedPng(imageBytes);

    const margin = 24;
    const titleHeight = title ? 28 : 0;
    const availableWidth = page.getWidth() - margin * 2;
    const availableHeight = page.getHeight() - margin * 2 - titleHeight;
    const scale = Math.min(availableWidth / pngImage.width, availableHeight / pngImage.height);
    const imageWidth = pngImage.width * scale;
    const imageHeight = pngImage.height * scale;

    page.drawRectangle({
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
      color: rgb(1, 1, 1),
    });

    if (title) {
      const titleFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
      page.drawText(title, {
        x: margin,
        y: page.getHeight() - margin,
        size: 18,
        font: titleFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    page.drawImage(pngImage, {
      x: (page.getWidth() - imageWidth) / 2,
      y: margin,
      width: imageWidth,
      height: imageHeight,
    });

    return pdfDocument.save();
  };

  private sendTopologyPdf = async (
    req: Request<unknown, unknown, TopologyPdfExportRequest>,
    res: Response,
    defaultFileName: string
  ): Promise<void> => {
    try {
      const pdfBytes = await this.buildTopologyPdf(req.body);
      const fileName = sanitizeDownloadFileName(req.body.fileName || defaultFileName);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      console.error('Error in sendTopologyPdf:', error);
      res.status(error.message === 'INVALID_IMAGE_DATA' ? 400 : 500).json({
        success: false,
        error: error.message === 'INVALID_IMAGE_DATA' ? 'VALIDATION_ERROR' : 'SERVER_ERROR',
        message:
          error.message === 'INVALID_IMAGE_DATA'
            ? 'Nieprawidłowe dane obrazu do eksportu PDF'
            : 'Błąd generowania PDF topologii',
      });
    }
  };

  /**
   * GET /api/contracts/:contractId/subsystems/:subsystemIndex/topology
   * Pobierz najnowszą wersję topologii
   */
  getLatest = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      const topology = await networkTopologyService.getLatest(contractId, subsystemIndex);
      if (!topology) {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }

      res.json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in getLatest:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * GET /api/topologies/:id
   * Pobierz topologię po ID
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const topology = await networkTopologyService.getById(id);
      if (!topology) {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }

      res.json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in getById:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * GET /api/network-topologies
   * Pobierz najnowsze wersje wszystkich topologii (we wszystkich kontraktach)
   */
  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const topologies = await networkTopologyService.getAll();
      res.json({ success: true, data: topologies });
    } catch (error: any) {
      console.error('Error in getAll:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * GET /api/contracts/:contractId/topologies
   * Pobierz wszystkie topologie dla kontraktu (tylko najnowsze wersje)
   */
  getAllByContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      if (isNaN(contractId)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId',
        });
        return;
      }

      const topologies = await networkTopologyService.getAllByContract(contractId);
      res.json({ success: true, data: topologies });
    } catch (error: any) {
      console.error('Error in getAllByContract:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  exportPdfWizard = async (
    req: Request<unknown, unknown, TopologyPdfExportRequest>,
    res: Response
  ): Promise<void> => {
    await this.sendTopologyPdf(req, res, 'topologia-wizard.pdf');
  };

  exportPdf = async (
    req: Request<{ contractId: string; subsystemIndex: string }, unknown, TopologyPdfExportRequest>,
    res: Response
  ): Promise<void> => {
    const contractId = parseInt(req.params.contractId, 10);
    const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

    if (isNaN(contractId) || isNaN(subsystemIndex)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Nieprawidłowy contractId lub subsystemIndex',
      });
      return;
    }

    await this.sendTopologyPdf(
      req,
      res,
      `topologia-kontrakt-${contractId}-podsystem-${subsystemIndex + 1}.pdf`
    );
  };

  /**
   * POST /api/topologies
   * Utwórz nową topologię
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📥 POST /api/network-topologies - Request body:', JSON.stringify(req.body, null, 2));
      console.log('📊 Body fields:', {
        name: req.body.name,
        contractId: req.body.contractId,
        subsystemIndex: req.body.subsystemIndex,
        subsystemType: req.body.subsystemType,
        nodesCount: req.body.nodes?.length,
        connectionsCount: req.body.connections?.length,
      });

      const dto = plainToClass(CreateNetworkTopologyDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        console.error('❌ Validation errors:', JSON.stringify(errors, null, 2));
        console.error('❌ Detailed validation errors:', errors.map(e => ({
          field: e.property,
          value: e.value,
          constraints: e.constraints,
          children: e.children?.map(child => ({
            field: child.property,
            value: child.value,
            constraints: child.constraints,
          })),
        })));
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Błąd walidacji',
          details: errors.map(e => ({ field: e.property, constraints: e.constraints })),
        });
        return;
      }

      console.log('✅ Validation passed, creating topology...');
      const topology = await networkTopologyService.create(dto);
      res.status(201).json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in create:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * PUT /api/contracts/:contractId/subsystems/:subsystemIndex/topology
   * Utwórz nową wersję topologii (immutable update)
   */
  createNewVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      const dto = plainToClass(UpdateNetworkTopologyDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Błąd walidacji',
          details: errors.map(e => ({ field: e.property, constraints: e.constraints })),
        });
        return;
      }

      const topology = await networkTopologyService.createNewVersion(contractId, subsystemIndex, dto);
      res.json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in createNewVersion:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * PUT /api/network-topologies/:id
   * Utwórz nową wersję topologii (immutable update po UUID)
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto = plainToClass(UpdateNetworkTopologyDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Błąd walidacji',
          details: errors.map(e => ({ field: e.property, constraints: e.constraints })),
        });
        return;
      }

      const topology = await networkTopologyService.update(id, dto);
      res.json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in update:', error);
      if (error.message === 'TOPOLOGY_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * DELETE /api/network-topologies/:id
   * Soft-delete po ID
   */
  softDelete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await networkTopologyService.softDelete(id);
      res.json({ success: true, message: 'Topologia usunięta pomyślnie' });
    } catch (error: any) {
      console.error('Error in softDelete:', error);
      if (error.message === 'TOPOLOGY_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * GET /api/contracts/:contractId/subsystems/:subsystemIndex/topology/history
   * Historia wersji z paginacją
   */
  getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Parametry page i limit muszą być większe od 0',
        });
        return;
      }

      const result = await networkTopologyService.getHistory(contractId, subsystemIndex, page, limit);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in getHistory:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * DELETE /api/contracts/:contractId/subsystems/:subsystemIndex/topology
   * Soft-delete najnowszej wersji
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      await networkTopologyService.delete(contractId, subsystemIndex);
      res.json({ success: true, message: 'Topologia usunięta pomyślnie' });
    } catch (error: any) {
      console.error('Error in delete:', error);
      if (error.message === 'TOPOLOGY_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };
}

export default new NetworkTopologyController();
