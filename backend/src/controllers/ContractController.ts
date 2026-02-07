// src/controllers/ContractController.ts
// Kontroler dla endpointów kontraktów

import { Request, Response } from 'express';
import { ContractService } from '../services/ContractService';
import { ContractStatus } from '../entities/Contract';
import { SubsystemService } from '../services/SubsystemService';
import { SystemType } from '../entities/Subsystem';
import { SubsystemTaskService } from '../services/SubsystemTaskService';
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TaskType } from '../entities/TaskType';
import { TaskNumberGenerator } from '../services/TaskNumberGenerator';

export class ContractController {
  private contractService: ContractService;
  private subsystemService: SubsystemService;
  private taskService: SubsystemTaskService;

  constructor() {
    this.contractService = new ContractService();
    this.subsystemService = new SubsystemService();
    this.taskService = new SubsystemTaskService();
  }

  /**
   * Walidacja kodu kierownika
   * @param managerCode Kod kierownika do walidacji
   * @returns Error message jeśli walidacja nie przeszła, null jeśli OK
   */
  private validateManagerCode(managerCode: string): string | null {
    if (!managerCode || !managerCode.trim()) {
      return 'Kod kierownika nie może być pusty';
    }
    
    if (managerCode.length > 5) {
      return 'Kod kierownika może mieć maksymalnie 5 znaków';
    }
    
    return null;
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
        jowiszRef,
        liniaKolejowa
      } = req.body;

      // Walidacja wymaganych pól
      if (!customName || !orderDate || !managerCode || !projectManagerId) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganych pól: customName, orderDate, managerCode, projectManagerId'
        });
        return;
      }

      // Walidacja kodu kierownika
      const managerCodeError = this.validateManagerCode(managerCode);
      if (managerCodeError) {
        res.status(400).json({
          success: false,
          message: managerCodeError
        });
        return;
      }

      const contract = await this.contractService.createContract({
        contractNumber,
        customName,
        orderDate: new Date(orderDate),
        managerCode,
        projectManagerId,
        jowiszRef,
        liniaKolejowa
      }, (req as any).userId);

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
      const contract = await this.contractService.approveContract(parseInt(id), (req as any).userId);

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
   * Obsługuje wiele podsystemów na kontrakt
   */
  createContractWithWizard = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        customName,
        orderDate,
        projectManagerId,
        managerCode,
        subsystems, // New: array of subsystems
        // Legacy support:
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

      // Walidacja kodu kierownika
      const managerCodeError = this.validateManagerCode(managerCode);
      if (managerCodeError) {
        res.status(400).json({
          success: false,
          message: managerCodeError
        });
        return;
      }

      // 1. Utwórz kontrakt
      const contract = await this.contractService.createContract({
        customName,
        orderDate: new Date(orderDate),
        managerCode,
        projectManagerId: parseInt(projectManagerId),
        liniaKolejowa: req.body.liniaKolejowa
      });

      // 2. Utwórz podsystemy
      const createdSubsystems = [];
      
      // New format: multiple subsystems
      if (Array.isArray(subsystems) && subsystems.length > 0) {
        // Walidacja unikalności pul IP
        const ipPools = subsystems
          .map((s: any) => s.ipPool?.trim())
          .filter((ip: string) => ip); // Tylko niepuste
        
        const uniquePools = new Set(ipPools);
        
        if (ipPools.length > 0 && ipPools.length !== uniquePools.size) {
          // Znajdź duplikaty dla lepszego komunikatu
          const duplicates = ipPools.filter((ip: string, index: number) => 
            ipPools.indexOf(ip) !== index
          );
          
          res.status(400).json({
            success: false,
            message: `Podsystemy muszą mieć różne pule adresowe IP. Zduplikowane pule: ${[...new Set(duplicates)].join(', ')}`,
            code: 'DUPLICATE_IP_POOLS'
          });
          return;
        }
        
        // Get repositories needed for Task creation
        const taskRepository = AppDataSource.getRepository(Task);
        const taskTypeRepository = AppDataSource.getRepository(TaskType);
        
        for (const subsystemData of subsystems) {
          const { type, params, smwData, tasks: subsystemTasks, ipPool } = subsystemData;
          
          // For SMW subsystems, prefer smwData over params
          const subsystemParams = type === 'SMW' && smwData ? smwData : (params || {});
          
          // Log for debugging SMW wizard (only if DEBUG env var is set)
          if (type === 'SMW' && process.env.DEBUG) {
            console.log('SMW subsystem data received:', JSON.stringify({
              type,
              hasSmwData: !!smwData,
              hasParams: !!params,
              hasTasks: !!subsystemTasks,
              taskCount: subsystemTasks?.length || 0,
              ipPool
            }, null, 2));
          }
          
          // Validate subsystem type
          if (!Object.values(SystemType).includes(type as SystemType)) {
            res.status(400).json({
              success: false,
              message: `Nieprawidłowy typ podsystemu: ${type}`
            });
            return;
          }
          
          const subsystem = await this.subsystemService.createSubsystem({
            contractId: contract.id,
            systemType: type as SystemType,
            quantity: subsystemTasks?.length || 0,
            ipPool: ipPool?.trim() || null
          });
          
          // Zapisz zadania do bazy (SubsystemTask i Task)
          const createdTasks = [];
          const createdMainTasks = [];
          
          // Find task type for this subsystem type - once per subsystem
          const DEFAULT_TASK_TYPE_ID = 1;
          let taskTypeId = DEFAULT_TASK_TYPE_ID;
          const taskType = await taskTypeRepository.findOne({
            where: { code: type }  // type = subsystem type (SMOKIP_A, SMW, etc.)
          });
          if (taskType) {
            taskTypeId = taskType.id;
          }
          
          if (subsystemTasks && Array.isArray(subsystemTasks)) {
            for (const taskData of subsystemTasks) {
              try {
                // 1. Create SubsystemTask - teraz używa formatu ZXXXXMMRR
                const subsystemTask = await this.taskService.createTask({
                  subsystemId: subsystem.id,
                  taskName: taskData.name || 'Zadanie',
                  taskType: taskData.type || 'GENERIC',
                  metadata: subsystemParams
                });
                createdTasks.push(subsystemTask);
                
                // 2. Create main Task entity - UŻYJ TEGO SAMEGO NUMERU
                try {
                  
                  // Create task with same number as SubsystemTask
                  const mainTask = taskRepository.create({
                    taskNumber: subsystemTask.taskNumber,  // ← ZMIANA: ten sam numer!
                    title: taskData.name || `Zadanie ${taskData.type || 'nowe'}`,
                    description: taskData.description || '',
                    taskTypeId,
                    status: 'created',
                    contractId: contract.id,
                    contractNumber: contract.contractNumber,  // ← DODANE: numer kontraktu!
                    subsystemId: subsystem.id,
                    location: contract.customName,
                    priority: 0,
                    metadata: {
                      createdFromWizard: true,
                      wizardData: taskData,
                      subsystemType: type,
                      taskVariant: taskData.type || null,
                      configParams: subsystemParams || {}
                    }
                  });
                  
                  const savedMainTask = await taskRepository.save(mainTask);
                  createdMainTasks.push(savedMainTask);
                  
                } catch (taskError) {
                  console.error(`Failed to create main task for ${taskData.name}:`, taskError);
                  // Continue with next task - don't break entire process
                }
              } catch (error) {
                console.error(`Failed to create task for subsystem ${subsystem.subsystemNumber}:`, error);
                // Continue with next task
              }
            }
          }
          
          createdSubsystems.push({
            ...subsystem,
            params: subsystemParams,
            tasks: createdTasks,
            mainTasks: createdMainTasks
          });
        }
        
        const totalSubsystemTasks = createdSubsystems.reduce((sum, s) => sum + (s.tasks?.length || 0), 0);
        const totalMainTasks = createdSubsystems.reduce((sum, s) => sum + (s.mainTasks?.length || 0), 0);
        
        res.status(201).json({
          success: true,
          message: `Kontrakt utworzony pomyślnie z ${createdSubsystems.length} podsystemami i ${totalMainTasks} zadaniami`,
          data: {
            contract,
            subsystems: createdSubsystems,
            tasksCreated: totalMainTasks,
            subsystemTasksCreated: totalSubsystemTasks
          }
        });
        return;
      }
      // Legacy format: single subsystem
      else if (subsystemType || (Array.isArray(tasks) && tasks.length > 0)) {
        if (!Array.isArray(tasks) || tasks.length === 0) {
          res.status(400).json({
            success: false,
            message: 'Kreator wymaga co najmniej jednego zadania'
          });
          return;
        }
        
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
      }
      // No subsystems specified
      else {
        res.status(400).json({
          success: false,
          message: 'Kontrakt musi mieć co najmniej jeden podsystem'
        });
        return;
      }

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
