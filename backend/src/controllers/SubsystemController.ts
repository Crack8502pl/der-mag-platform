// src/controllers/SubsystemController.ts
// Kontroler dla endpointów podsystemów

import { Request, Response } from 'express';
import { SubsystemService } from '../services/SubsystemService';
import { SubsystemDocumentService } from '../services/SubsystemDocumentService';
import { SystemType, SubsystemStatus } from '../entities/Subsystem';
import * as fs from 'fs';

export class SubsystemController {
  private subsystemService: SubsystemService;
  private documentService: SubsystemDocumentService;

  constructor() {
    this.subsystemService = new SubsystemService();
    this.documentService = new SubsystemDocumentService();
  }

  /**
   * GET /api/subsystems
   * Lista podsystemów z filtrami i sortowaniem
   */
  getList = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        systemType,
        projectManager,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        page = 1,
        limit = 30
      } = req.query;

      // Get subsystems with filters
      const subsystems = await this.subsystemService.getAllSubsystems({
        systemType: systemType as SystemType | undefined,
        status: undefined,
        contractId: undefined
      });

      // Apply search filter (subsystemNumber, contract number)
      let filtered = subsystems;
      if (search) {
        const searchStr = (search as string).toLowerCase();
        filtered = subsystems.filter(s => 
          s.subsystemNumber.toLowerCase().includes(searchStr) ||
          s.contract?.contractNumber?.toLowerCase().includes(searchStr)
        );
      }

      // Apply projectManager filter (search by firstName, lastName, or username)
      if (projectManager) {
        const pmSearch = (projectManager as string).toLowerCase();
        filtered = filtered.filter(s => {
          const pm = s.contract?.projectManager;
          if (!pm) return false;
          
          return (
            pm.firstName?.toLowerCase().includes(pmSearch) ||
            pm.lastName?.toLowerCase().includes(pmSearch) ||
            pm.username?.toLowerCase().includes(pmSearch) ||
            `${pm.firstName} ${pm.lastName}`.toLowerCase().includes(pmSearch)
          );
        });
      }

      // Get document counts for all subsystems in one query
      const subsystemIds = filtered.map(s => s.id);
      const documentCounts = await this.documentService.getDocumentCounts(subsystemIds);

      // Attach document counts to subsystems
      const subsystemsWithDocCount = filtered.map((subsystem) => ({
        ...subsystem,
        documentCount: documentCounts[subsystem.id] || 0
      }));

      // Apply sorting
      const sorted = subsystemsWithDocCount.sort((a, b) => {
        let aVal: any = a[sortBy as keyof typeof a];
        let bVal: any = b[sortBy as keyof typeof b];

        // Handle nested properties
        if (sortBy === 'contractNumber') {
          aVal = a.contract?.contractNumber || '';
          bVal = b.contract?.contractNumber || '';
        } else if (sortBy === 'projectManager') {
          const pmA = a.contract?.projectManager;
          const pmB = b.contract?.projectManager;
          aVal = pmA ? `${pmA.lastName} ${pmA.firstName}` : '';
          bVal = pmB ? `${pmB.lastName} ${pmB.firstName}` : '';
        }

        if (sortOrder === 'ASC') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginated = sorted.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginated,
        total: sorted.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(sorted.length / limitNum)
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania listy podsystemów',
        error: error.message
      });
    }
  };

  /**
   * GET /api/contracts/:contractId/subsystems
   * Lista podsystemów dla kontraktu
   */
  getContractSubsystems = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.params;
      const subsystems = await this.subsystemService.getSubsystemsByContract(
        parseInt(contractId)
      );

      res.json({
        success: true,
        data: subsystems,
        count: subsystems.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania podsystemów',
        error: error.message
      });
    }
  };

  /**
   * POST /api/contracts/:contractId/subsystems
   * Utworzenie nowego podsystemu
   */
  createSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.params;
      const { systemType, quantity, subsystemNumber } = req.body;

      if (!systemType) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganego pola: systemType'
        });
        return;
      }

      const subsystem = await this.subsystemService.createSubsystem({
        contractId: parseInt(contractId),
        systemType: systemType as SystemType,
        quantity,
        subsystemNumber
      });

      res.status(201).json({
        success: true,
        message: 'Podsystem utworzony pomyślnie',
        data: subsystem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas tworzenia podsystemu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/subsystems/:id
   * Szczegóły podsystemu
   */
  getSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const subsystem = await this.subsystemService.getSubsystemById(parseInt(id));

      if (!subsystem) {
        res.status(404).json({
          success: false,
          message: 'Podsystem nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: subsystem
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania podsystemu',
        error: error.message
      });
    }
  };

  /**
   * PUT /api/subsystems/:id
   * Aktualizacja podsystemu
   */
  updateSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const subsystem = await this.subsystemService.updateSubsystem(
        parseInt(id),
        updates
      );

      res.json({
        success: true,
        message: 'Podsystem zaktualizowany pomyślnie',
        data: subsystem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas aktualizacji podsystemu',
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/subsystems/:id
   * Usunięcie podsystemu
   */
  deleteSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.subsystemService.deleteSubsystem(parseInt(id));

      res.json({
        success: true,
        message: 'Podsystem usunięty pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas usuwania podsystemu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/subsystems/:id/documentation
   * Lista dokumentów podsystemu
   */
  getDocumentation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const documents = await this.documentService.getDocuments(parseInt(id));

      res.json({
        success: true,
        data: documents,
        count: documents.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania dokumentacji',
        error: error.message
      });
    }
  };

  /**
   * POST /api/subsystems/:id/documentation
   * Upload dokumentu dla podsystemu
   */
  uploadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const file = req.file;
      const userId = (req as any).user?.id;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'Brak pliku do przesłania'
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const document = await this.documentService.uploadDocument(
        parseInt(id),
        file,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Dokument przesłany pomyślnie',
        data: document
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas przesyłania dokumentu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/subsystems/:id/documentation/:docId/download
   * Pobieranie dokumentu
   */
  downloadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { docId } = req.params;
      const document = await this.documentService.getDocument(parseInt(docId));

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Dokument nie znaleziony'
        });
        return;
      }

      if (!fs.existsSync(document.filePath)) {
        res.status(404).json({
          success: false,
          message: 'Plik nie istnieje'
        });
        return;
      }

      res.download(document.filePath, document.originalName);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania dokumentu',
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/subsystems/:id/documentation/:docId
   * Usunięcie dokumentu
   */
  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { docId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      await this.documentService.deleteDocument(parseInt(docId), userId);

      res.json({
        success: true,
        message: 'Dokument usunięty pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas usuwania dokumentu',
        error: error.message
      });
    }
  };
}
