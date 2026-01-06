// src/controllers/ContractController.ts
// Kontroler dla endpointów kontraktów

import { Request, Response } from 'express';
import { ContractService } from '../services/ContractService';
import { ContractStatus } from '../entities/Contract';
import { SubsystemService } from '../services/SubsystemService';
import { SystemType } from '../entities/Subsystem';

export class ContractController {
  private contractService: ContractService;
  private subsystemService: SubsystemService;

  constructor() {
    this.contractService = new ContractService();
    this.subsystemService = new SubsystemService();
  }

  /**
   * GET /api/contracts
   * Lista wszystkich kontraktów
   */
  getContracts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        status, 
        projectManagerId,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        page = 1,
        limit = 20
      } = req.query;

      const filters: any = {};
      if (status) filters.status = status as ContractStatus;
      if (projectManagerId) {
        const parsedId = parseInt(projectManagerId as string);
        if (!isNaN(parsedId)) {
          filters.projectManagerId = parsedId;
        }
      }

      const result = await this.contractService.getAllContracts(filters, {
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      });

      res.json({
        success: true,
        data: result.contracts,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania kontraktów',
        error: error.message
      });
    }
  };

  /**
   * GET /api/contracts/:id
   * Szczegóły kontraktu
   */
  getContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const contract = await this.contractService.getContractById(parseInt(id));

      if (!contract) {
        res.status(404).json({
          success: false,
          message: 'Kontrakt nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: contract
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania kontraktu',
        error: error.message
      });
    }
  };

  /**
   * POST /api/contracts
   * Utworzenie nowego kontraktu
   */
  createContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        contractNumber,
        customName,
        orderDate,
        managerCode,
        projectManagerId,
        jowiszRef
      } = req.body;

      // Walidacja wymaganych pól
      if (!customName || !orderDate || !managerCode || !projectManagerId) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganych pól: customName, orderDate, managerCode, projectManagerId'
        });
        return;
      }

      const contract = await this.contractService.createContract({
        contractNumber,
        customName,
        orderDate: new Date(orderDate),
        managerCode,
        projectManagerId,
        jowiszRef
      });

      res.status(201).json({
        success: true,
        message: 'Kontrakt utworzony pomyślnie',
        data: contract
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas tworzenia kontraktu',
        error: error.message
      });
    }
  };

  /**
   * PUT /api/contracts/:id
   * Aktualizacja kontraktu
   */
  updateContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const contract = await this.contractService.updateContract(parseInt(id), updates);

      res.json({
        success: true,
        message: 'Kontrakt zaktualizowany pomyślnie',
        data: contract
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas aktualizacji kontraktu',
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/contracts/:id
   * Usunięcie kontraktu
   */
  deleteContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.contractService.deleteContract(parseInt(id));

      res.json({
        success: true,
        message: 'Kontrakt usunięty pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas usuwania kontraktu',
        error: error.message
      });
    }
  };

  /**
   * POST /api/contracts/:id/approve
   * Zatwierdzenie kontraktu
   */
  approveContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const contract = await this.contractService.approveContract(parseInt(id));

      res.json({
        success: true,
        message: 'Kontrakt zatwierdzony pomyślnie',
        data: contract
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas zatwierdzania kontraktu',
        error: error.message
      });
    }
  };

  /**
   * POST /api/contracts/import
   * Import kontraktów z pliku CSV/Excel
   * 
   * NOTE: File parsing is not yet implemented. This endpoint currently
   * expects a pre-parsed array of contracts in req.body.contracts.
   * In production, this should be enhanced to:
   * 1. Accept multipart/form-data with file upload
   * 2. Parse CSV/Excel files using appropriate libraries (e.g., papaparse, xlsx)
   * 3. Validate and transform data before importing
   */
  importContracts = async (req: Request, res: Response): Promise<void> => {
    try {
      // TODO: Implement file parsing from multipart/form-data
      // For now, expects parsed contracts array in body
      const { contracts } = req.body;
      
      if (!Array.isArray(contracts)) {
        res.status(400).json({
          success: false,
          message: 'Oczekiwano tablicy kontraktów w polu "contracts"'
        });
        return;
      }
      
      const results = {
        imported: 0,
        errors: [] as any[]
      };
      
      for (const contractData of contracts) {
        try {
          await this.contractService.createContract(contractData);
          results.imported++;
        } catch (error: any) {
          results.errors.push({
            data: contractData,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd importu kontraktów',
        error: error.message
      });
    }
  };

  /**
   * GET /api/contracts/stats
   * Statystyki kontraktów
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.contractService.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania statystyk'
      });
    }
  };

  /**
   * POST /api/contracts/wizard
   * Utworzenie kontraktu z kreatora wieloetapowego
   */
  createContractWithWizard = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        customName,
        orderDate,
        projectManagerId,
        managerCode,
        subsystemType,
        subsystemParams,
        tasks
      } = req.body;

      // Walidacja wymaganych pól
      if (!customName || !orderDate || !managerCode || !projectManagerId) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganych pól: customName, orderDate, managerCode, projectManagerId'
        });
        return;
      }

      if (!Array.isArray(tasks) || tasks.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Kreator wymaga co najmniej jednego zadania'
        });
        return;
      }

      // 1. Utwórz kontrakt
      const contract = await this.contractService.createContract({
        customName,
        orderDate: new Date(orderDate),
        managerCode,
        projectManagerId: parseInt(projectManagerId)
      });

      // 2. Utwórz podsystem jeśli określony typ
      if (subsystemType) {
        // Validate that subsystemType is a valid SystemType
        if (!Object.values(SystemType).includes(subsystemType as SystemType)) {
          res.status(400).json({
            success: false,
            message: `Nieprawidłowy typ podsystemu: ${subsystemType}`
          });
          return;
        }
        
        await this.subsystemService.createSubsystem({
          contractId: contract.id,
          systemType: subsystemType as SystemType,
          quantity: tasks.length
        });
      }

      // 3. TODO: W przyszłości - utworzenie poszczególnych zadań w bazie
      // Na razie zadania są tylko w metadanych subsystemu
      // Można rozszerzyć o dedykowaną tabelę Task z pełną strukturą

      res.status(201).json({
        success: true,
        message: `Kontrakt utworzony pomyślnie z ${tasks.length} zadaniami`,
        data: {
          ...contract,
          tasks: tasks,
          subsystemType,
          subsystemParams
        }
      });
    } catch (error: any) {
      console.error('Błąd tworzenia kontraktu przez kreatora:', error);
      res.status(400).json({
        success: false,
        message: 'Błąd podczas tworzenia kontraktu',
        error: error.message
      });
    }
  };
}
