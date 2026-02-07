// src/controllers/SubsystemController.ts
// Kontroler dla endpointów podsystemów

import { Request, Response } from 'express';
import { SubsystemService } from '../services/SubsystemService';
import { SubsystemDocumentService } from '../services/SubsystemDocumentService';
import { SystemType, SubsystemStatus } from '../entities/Subsystem';
import { SubsystemTaskService } from '../services/SubsystemTaskService';
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TaskType } from '../entities/TaskType';
import * as fs from 'fs';

// Interfejs dla żądań uwierzytelnionych
interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
  params: any;
  file?: any;
}

export class SubsystemController {
  private subsystemService: SubsystemService;
  private documentService: SubsystemDocumentService;
  private taskService: SubsystemTaskService;

  constructor() {
    this.subsystemService = new SubsystemService();
    this.documentService = new SubsystemDocumentService();
    this.taskService = new SubsystemTaskService();
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
            `${pm.firstName || ''} ${pm.lastName || ''}`.toLowerCase().includes(pmSearch)
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
          aVal = pmA ? `${pmA.lastName ?? ''} ${pmA.firstName ?? ''}` : '';
          bVal = pmB ? `${pmB.lastName ?? ''} ${pmB.firstName ?? ''}` : '';
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
   * Utworzenie nowego podsystemu lub wielu podsystemów
   * Body może być pojedynczy obiekt lub tablica subsystems
   */
  createSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.params;
      const { subsystems } = req.body;
      
      // Check if bulk creation (array of subsystems)
      if (Array.isArray(subsystems) && subsystems.length > 0) {
        // Get existing subsystems for this contract to check IP pool conflicts
        const existingSubsystems = await this.subsystemService.getSubsystemsByContract(
          parseInt(contractId)
        );
        
        const existingPools = existingSubsystems
          .map(s => s.ipPool?.trim())
          .filter(ip => ip);

        const newPools = subsystems
          .map((s: any) => s.ipPool?.trim())
          .filter((ip: string) => ip);

        // Sprawdź konflikt z istniejącymi
        for (const newPool of newPools) {
          if (existingPools.includes(newPool)) {
            res.status(400).json({
              success: false,
              message: `Pula IP ${newPool} jest już używana przez inny podsystem w tym kontrakcie`,
              code: 'IP_POOL_ALREADY_USED'
            });
            return;
          }
        }

        // Sprawdź duplikaty w nowych
        const uniqueNewPools = new Set(newPools);
        if (newPools.length > 0 && newPools.length !== uniqueNewPools.size) {
          res.status(400).json({
            success: false,
            message: 'Nowe podsystemy mają zduplikowane pule IP',
            code: 'DUPLICATE_IP_POOLS_IN_NEW'
          });
          return;
        }
        
        const createdSubsystems = [];
        
        for (const subsystemData of subsystems) {
          const { type, params, tasks: subsystemTasks, ipPool } = subsystemData;
          
          if (!type) {
            res.status(400).json({
              success: false,
              message: 'Brakuje wymaganego pola: type dla jednego z podsystemów'
            });
            return;
          }
          
          // Create subsystem
          const subsystem = await this.subsystemService.createSubsystem({
            contractId: parseInt(contractId),
            systemType: type as SystemType,
            quantity: subsystemTasks?.length || 0,
            ipPool: ipPool?.trim() || null
          });
          
          // Create tasks if provided
          const createdTasks = [];
          if (subsystemTasks && Array.isArray(subsystemTasks)) {
            for (const taskData of subsystemTasks) {
              try {
                const subsystemTask = await this.taskService.createTask({
                  subsystemId: subsystem.id,
                  taskName: taskData.name || 'Zadanie',
                  taskType: taskData.type || 'GENERIC',
                  metadata: taskData.metadata || params || {}
                });
                createdTasks.push(subsystemTask);
              } catch (error) {
                console.error(`Failed to create task for subsystem ${subsystem.subsystemNumber}:`, error);
              }
            }
          }
          
          createdSubsystems.push({
            ...subsystem,
            params,
            tasks: createdTasks
          });
        }
        
        res.status(201).json({
          success: true,
          message: `Utworzono ${createdSubsystems.length} podsystemów pomyślnie`,
          data: createdSubsystems
        });
        return;
      }
      
      // Single subsystem creation (legacy support)
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
  uploadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const file = req.file;
      const userId = req.userId;

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
  deleteDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { docId } = req.params;
      const userId = req.userId;

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

  /**
   * GET /api/subsystems/:id/tasks
   * Lista zadań dla podsystemu
   */
  getTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tasks = await this.taskService.getTasksBySubsystem(parseInt(id));

      res.json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania zadań',
        error: error.message
      });
    }
  };

  /**
   * POST /api/subsystems/:id/tasks
   * Dodanie zadań do istniejącego podsystemu
   */
  createTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { tasks } = req.body;

      if (!Array.isArray(tasks) || tasks.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganego pola: tasks (tablica zadań)'
        });
        return;
      }

      // Pobierz podsystem wraz z kontraktem
      const subsystem = await this.subsystemService.getSubsystemById(parseInt(id));
      
      if (!subsystem) {
        res.status(404).json({
          success: false,
          message: 'Podsystem nie został znaleziony'
        });
        return;
      }

      if (!subsystem.contract) {
        res.status(400).json({
          success: false,
          message: 'Podsystem nie jest powiązany z kontraktem'
        });
        return;
      }

      // Get repositories needed for Task creation
      const taskRepository = AppDataSource.getRepository(Task);
      const taskTypeRepository = AppDataSource.getRepository(TaskType);
      const DEFAULT_TASK_TYPE_ID = 1;

      const createdTasks = [];
      const createdMainTasks = [];
      const failedMainTasks = [];
      
      for (const taskData of tasks) {
        try {
          // 1. Create SubsystemTask
          const subsystemTask = await this.taskService.createTask({
            subsystemId: parseInt(id),
            taskName: taskData.name || 'Zadanie',
            taskType: taskData.type || 'GENERIC',
            metadata: taskData.metadata || {}
          });
          createdTasks.push(subsystemTask);

          // 2. Create main Task entity - UŻYJ TEGO SAMEGO NUMERU
          try {
            // Find task type - match by code or use default
            let taskTypeId = DEFAULT_TASK_TYPE_ID;
            if (taskData.type) {
              const taskType = await taskTypeRepository.findOne({
                where: { code: taskData.type }
              });
              if (taskType) {
                taskTypeId = taskType.id;
              }
            }

            // Create task with same number as SubsystemTask
            const mainTask = taskRepository.create({
              taskNumber: subsystemTask.taskNumber,
              title: taskData.name || `Zadanie ${taskData.type || 'nowe'}`,
              description: taskData.description || '',
              taskTypeId,
              status: 'created',
              contractId: subsystem.contract.id,
              contractNumber: subsystem.contract.contractNumber,
              subsystemId: subsystem.id,
              location: subsystem.contract.customName,
              priority: 0,
              metadata: {
                createdFromContractEdit: true,
                wizardData: taskData,
                subsystemType: subsystem.systemType,
                taskVariant: taskData.type || null,
                configParams: taskData.metadata || {}
              }
            });

            const savedMainTask = await taskRepository.save(mainTask);
            createdMainTasks.push(savedMainTask);

          } catch (taskError) {
            console.error(`Failed to create main task for ${taskData.name}:`, taskError);
            failedMainTasks.push(taskData.name || 'Unknown task');
            // Continue with next task - don't break entire process
          }
        } catch (error) {
          console.error(`Failed to create task for subsystem ${id}:`, error);
        }
      }

      res.status(201).json({
        success: true,
        message: `Utworzono ${createdTasks.length} zadań pomyślnie`,
        data: createdTasks,
        count: createdTasks.length,
        mainTasksCreated: createdMainTasks.length,
        ...(failedMainTasks.length > 0 && { 
          warning: `Nie udało się utworzyć głównych zadań dla: ${failedMainTasks.join(', ')}`,
          failedMainTasks 
        })
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas tworzenia zadań',
        error: error.message
      });
    }
  };
}
